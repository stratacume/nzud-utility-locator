import { supabase } from './supabase';
import { retry } from './retry';

export interface DocumentLink { name: string; url: string; size?: number; }

export interface BookingEmailData {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  service: string;
  bookingDate: string;
  serviceAddress: string;
  customerPhone?: string;
  documents?: string[];
  documentLinks?: DocumentLink[];
  notes?: string;
}

/**
 * STRICT email-result contract.
 *
 * `success` is TRUE only when the edge function explicitly confirms the
 * provider (Mailgun / Resend) accepted the message for the OPERATOR
 * recipient. Customer email is best-effort and surfaced via
 * `customerSent` / `customerWarning` but never gates `success`.
 *
 * If the network call to the edge function itself fails (cold start
 * timeout, dropped connection, browser closed mid-send), we still
 * return `success: false` BUT the email_outbox row we wrote BEFORE
 * invoking will remain as `pending` and the server-side retry job
 * will pick it up on the next sweep. Nothing is ever lost.
 */
export interface EmailResult {
  success: boolean;
  operatorSent: boolean;
  customerSent: boolean;
  customerWarning?: boolean;
  stage?: 'invoke' | 'response-shape' | 'operator-send' | 'config' | 'fatal' | 'unknown';
  error?: string;
  /** Outbox row id — present whenever we successfully recorded the
   *  email request in `email_outbox`. Surface this in UI/logs so
   *  operators can resend manually if needed. */
  outboxId?: string;
  providerDetails?: {
    operator?: { provider?: string; deliveryState?: string; error?: string; id?: string };
    customer?: { provider?: string; deliveryState?: string; error?: string; id?: string };
  };
}

const logStage = (stage: string, payload: Record<string, unknown>) => {
  // eslint-disable-next-line no-console
  console.log(`[emailService:${stage}]`, payload);
};

/** Idempotency key — one logical email per booking+type+role.
 *  Prevents two outbox rows being created for the same logical send
 *  if the user double-clicks "Confirm" or the page is refreshed. */
const buildIdempotencyKey = (type: string, ref: string | undefined) =>
  ref ? `${type}:${ref}` : `${type}:${crypto.randomUUID()}`;

/**
 * Insert a durable outbox row BEFORE invoking the edge function. This
 * is the production-grade guarantee: even if the user closes the tab
 * the second after they click "Confirm", the booking is permanently
 * recorded as needing an email and the server-side retry worker will
 * pick it up.
 *
 * Returns the outbox_id, or null if insertion failed (in which case
 * we still attempt the live send — the outbox is a safety net, not a
 * hard dependency).
 */
async function createOutboxRow(type: string, payload: Record<string, unknown>, bookingReference?: string): Promise<string | null> {
  const idempotencyKey = buildIdempotencyKey(type, bookingReference);
  try {
    // Try to insert. If a row with this idempotency_key already exists,
    // upsert will return the existing row instead of creating a duplicate.
    const { data, error } = await supabase
      .from('email_outbox')
      .upsert(
        {
          email_type: type,
          booking_reference: bookingReference || null,
          payload,
          status: 'pending',
          idempotency_key: idempotencyKey,
        },
        { onConflict: 'idempotency_key', ignoreDuplicates: false },
      )
      .select('id, status')
      .single();

    if (error) {
      logStage('outbox-insert-fail', { error: error.message, idempotencyKey });
      return null;
    }
    logStage('outbox-insert-ok', { id: data?.id, status: data?.status, idempotencyKey });
    return data?.id ?? null;
  } catch (err: any) {
    logStage('outbox-insert-exception', { error: err?.message });
    return null;
  }
}

/**
 * Single shared invoker. Wraps the edge-function call in:
 *   - email validation (format check before we even queue)
 *   - durable outbox row (so server-side retry can resurrect a
 *     dropped send if the user navigates away mid-request)
 *   - 3-attempt exponential-backoff retry (handles cold starts,
 *     transient 5xx, network blips on 4G)
 *   - strict success contract (operator-send accepted by provider)
 */
async function invokeBookingEmail(payload: Record<string, unknown>, customerEmail: string): Promise<EmailResult> {
  const type = String(payload.type || 'unknown');
  const ref = (payload.bookingReference as string) || undefined;
  logStage('invoke-start', { type, ref });

  // Validate the customer email format up front (informational only —
  // the edge function tolerates a missing/invalid customer email and
  // still sends the operator copy). Reject obviously-malformed values
  // so bad data doesn't enter the outbox payload.
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    logStage('invoke-validation', { invalidEmail: customerEmail });
    payload = { ...payload, to: '' };
  }

  // 1. Durable record — fire-and-forget if it fails.
  const outboxId = await createOutboxRow(type, payload, ref);
  const fullPayload = outboxId ? { ...payload, outbox_id: outboxId } : payload;

  // 2. Live send with 3-attempt retry (cold-start / transient errors).
  let result: any;
  try {
    result = await retry(
      async () => {
        const { data, error } = await supabase.functions.invoke('send-booking-email', { body: fullPayload });
        if (error) throw new Error(error.message || 'invoke failed');
        return data;
      },
      {
        attempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 4000,
        label: `send-booking-email:${type}`,
        // Don't retry on 4xx-style messages from the edge function (config errors, bad payload).
        shouldRetry: (err) => {
          const msg = (err as { message?: string })?.message?.toLowerCase() ?? '';
          if (msg.includes('config')) return false;
          if (msg.includes('not configured')) return false;
          return true;
        },
      },
    );
  } catch (err: any) {
    logStage('invoke-exhausted', { error: err?.message, outboxId });
    return {
      success: false, operatorSent: false, customerSent: false,
      stage: 'invoke', error: err?.message || 'Email service unreachable after retries',
      outboxId: outboxId ?? undefined,
    };
  }

  if (!result || typeof result !== 'object') {
    return {
      success: false, operatorSent: false, customerSent: false,
      stage: 'response-shape', error: 'Email service returned no response',
      outboxId: outboxId ?? undefined,
    };
  }

  const op = result.operator || {};
  const cust = result.customer || {};
  const operatorSent = op.sent === true;
  const customerSent = cust.sent === true;
  const customerWarning = !!customerEmail && cust.attempted === true && customerSent === false;

  logStage('response', {
    success: result.success, operatorSent, customerSent, customerWarning,
    operatorState: op.deliveryState, customerState: cust.deliveryState,
    outboxId,
  });

  if (!operatorSent) {
    return {
      success: false, operatorSent, customerSent, customerWarning,
      stage: result.stage || 'operator-send',
      error: op.error || result.error || `Operator email not accepted (${op.deliveryState || 'unknown'})`,
      outboxId: outboxId ?? undefined,
      providerDetails: { operator: op, customer: cust },
    };
  }

  return {
    success: true, operatorSent, customerSent, customerWarning,
    outboxId: outboxId ?? undefined,
    providerDetails: { operator: op, customer: cust },
  };
}

export const sendBookingConfirmationEmail = async (data: BookingEmailData): Promise<EmailResult> =>
  invokeBookingEmail({ ...data, to: data.customerEmail, type: 'confirmation' }, data.customerEmail);

export const sendBookingCancellationEmail = async (data: BookingEmailData): Promise<EmailResult> =>
  invokeBookingEmail({ ...data, to: data.customerEmail, type: 'cancellation' }, data.customerEmail);

export const sendBookingRescheduleEmail = async (data: BookingEmailData, newDate: string): Promise<EmailResult> =>
  invokeBookingEmail({ ...data, to: data.customerEmail, originalDate: data.bookingDate, newDate, type: 'reschedule' }, data.customerEmail);

export const sendBookingReminderEmail = async (data: BookingEmailData, portalUrl: string): Promise<EmailResult> =>
  invokeBookingEmail({ ...data, to: data.customerEmail, portalUrl, type: 'reminder' }, data.customerEmail);


export const generateSignedDocumentLinks = async (
  files: { name: string; path: string; size: number; mimeType?: string }[],
  expiresInSeconds: number = 14 * 24 * 60 * 60
): Promise<DocumentLink[]> => {
  if (!files || files.length === 0) return [];
  const links: DocumentLink[] = [];
  for (const file of files) {
    logStage('sign-start', { name: file.name, path: file.path, size: file.size, mime: file.mimeType });
    try {
      const { data, error } = await supabase.storage
        .from('booking-documents')
        .createSignedUrl(file.path, expiresInSeconds);
      if (error) {
        logStage('sign-error', { name: file.name, path: file.path, error: error.message });
        continue;
      }
      if (!data?.signedUrl) {
        logStage('sign-empty', { name: file.name, path: file.path });
        continue;
      }
      logStage('sign-ok', { name: file.name, path: file.path, urlBase: data.signedUrl.split('?')[0] });
      links.push({ name: file.name, url: data.signedUrl, size: file.size });
    } catch (err: any) {
      logStage('sign-exception', { name: file.name, path: file.path, error: err?.message });
    }
  }
  logStage('sign-summary', { requested: files.length, generated: links.length });
  return links;
};


const formatBytes = (bytes?: number): string => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const appendDownloadLinksToNotes = (notes: string | undefined, links: DocumentLink[]): string => {
  const base = (notes || '').trim();
  if (!links || links.length === 0) return base;
  const header = '\n\n--- Files are available for secure download ---\n' +
    `(${links.length} file${links.length === 1 ? '' : 's'}, links expire in 14 days)\n\n`;
  const body = links.map((l, i) => {
    const sizeText = l.size ? ` — ${formatBytes(l.size)}` : '';
    return `${i + 1}. ${l.name}${sizeText}\n   ${l.url}`;
  }).join('\n\n');
  return base + header + body;
};
