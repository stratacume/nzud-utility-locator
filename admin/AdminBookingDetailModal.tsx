import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Booking, UploadedDocument } from '@/components/booking/BookingDetails';
import FileUpload from '@/components/pricing/FileUpload';
import XeroInvoiceButton from './XeroInvoiceButton';
import {
  insertBookingDocuments,
  fetchDocumentsForBooking,
  deleteBookingDocument,
  rowToDoc,
} from '@/lib/bookingDocuments';
import { openOrDownloadFile, downloadFile } from '@/lib/fileViewer';
import { sendBookingConfirmationEmail } from '@/lib/emailService';
import {
  X, Calendar, MapPin, Tag, User, Mail, Phone, FileText, Download, Loader2,
  Plus, Mail as MailIcon, FileSpreadsheet, ExternalLink, ClipboardList, Send,
  CheckCircle2, AlertTriangle, RefreshCw, XCircle,
} from 'lucide-react';






interface UploadedFile {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  category?: 'customer' | 'completed';
  uploaded_at?: string;
}

interface EmailLogRow {
  id: string;
  created_at: string;
  email_type: string | null;
  recipient_role: string | null;
  recipient_email: string | null;
  status: string | null;
  delivery_state: string | null;
  provider: string | null;
  error: string | null;
  resend_id: string | null;
  attachment_count: number | null;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onUpdated: (updates: Partial<Booking>) => void;
}

const fmtSize = (bytes: number) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('en-NZ', { dateStyle: 'short', timeStyle: 'short' });

/**
 * NZ-locale formatter used for the Terms Acceptance row. Always renders in
 * Pacific/Auckland regardless of the operator's browser timezone so the
 * timestamp stored on the booking is shown consistently for legal-audit use.
 */
const fmtNZDateTime = (s: string) => {
  try {
    return new Date(s).toLocaleString('en-NZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Pacific/Auckland',
    }) + ' NZT';
  } catch {
    return s;
  }
};

/**
 * Parse the `[Acknowledgement <ISO>] ...` line written into job_details by
 * the Step 4 booking submit. Returns the ISO timestamp (so we can render it
 * in NZ time) and the remaining job_details with that line stripped, so
 * operators see clean customer notes in the "Job notes" panel.
 *
 * Robust to:
 *   • leading/trailing whitespace
 *   • the line appearing anywhere in job_details (start, middle, end)
 *   • multiple blank lines left after stripping
 */
const parseAcknowledgement = (
  jobDetails: string | null | undefined
): { acceptedAtIso: string | null; cleanedNotes: string } => {
  if (!jobDetails) return { acceptedAtIso: null, cleanedNotes: '' };
  const re = /^[ \t]*\[Acknowledgement\s+([^\]]+)\][^\n]*\n?/m;
  const m = jobDetails.match(re);
  if (!m) {
    return { acceptedAtIso: null, cleanedNotes: jobDetails.trim() };
  }
  const cleaned = jobDetails.replace(re, '').replace(/\n{3,}/g, '\n\n').trim();
  return { acceptedAtIso: m[1].trim(), cleanedNotes: cleaned };
};


/**
 * Admin-side booking "epicentre" — mirrors the customer portal detail view
 * but with admin-only actions:
 *   • Customer-uploaded documents (read + download)
 *   • Completed-locate documents (admin uploads, customer can also view)
 *   • Email log for this booking
 *   • Xero "Create / Open" invoice action
 */
const AdminBookingDetailModal: React.FC<Props> = ({ booking, onClose, onUpdated }) => {
  const { toast } = useToast();
  const [emailLog, setEmailLog] = useState<EmailLogRow[]>([]);

  const [emailsLoading, setEmailsLoading] = useState(true);
  const [showCompletedUpload, setShowCompletedUpload] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);
  // True while the "Email customer download links" action is in flight.
  // The button is disabled to prevent double-sends.
  const [sendingLink, setSendingLink] = useState(false);
  // True while "Resend confirmation to customer" is in flight. Separate
  // from sendingLink so both buttons can be disabled independently.
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  // Per-row open-error messages — surfaced inline when the unified
  // "Download / Open file" action's inline-tab open fails for any
  // reason (signing error, popup blocked, etc.). Keyed by storage path.
  const [docOpenErrors, setDocOpenErrors] = useState<Record<string, string>>({});

  // Live document lists pulled from `booking_documents` (the SOURCE OF TRUTH
  // the customer portal also reads from). We also seed from booking.* so
  // legacy rows still render until the first refresh.
  const [customerDocs, setCustomerDocs] = useState<UploadedFile[]>(
    (booking.documents as UploadedFile[]) || []
  );
  const [completedDocs, setCompletedDocs] = useState<UploadedFile[]>(
    (booking.completed_documents as UploadedFile[]) || []
  );

  // Split the persisted job_details into (a) the timestamped acknowledgement
  // line written at booking submit time and (b) the actual customer-authored
  // notes. Operators see the acceptance proof in its own labelled row and a
  // clean notes block underneath — no leaked "[Acknowledgement …]" string.
  const { acceptedAtIso, cleanedNotes } = parseAcknowledgement(booking.job_details);


  const reloadDocs = async () => {
    try {
      const rows = await fetchDocumentsForBooking(booking.id);
      const mapped = rows.map(rowToDoc) as UploadedFile[];
      setCustomerDocs(mapped.filter((d) => d.category !== 'completed'));
      setCompletedDocs(mapped.filter((d) => d.category === 'completed'));
    } catch (err: any) {
      console.warn('[AdminBookingDetailModal] reloadDocs failed', err?.message);
    }
  };

  /**
   * Pull this booking's email_log rows. Extracted so we can call it
   * again after admin actions (e.g. "Email customer download links")
   * to immediately show the just-sent row in the timeline.
   */
  const reloadEmailLog = async () => {
    setEmailsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_log')
        .select('*')
        .eq('booking_reference', booking.booking_reference)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEmailLog(data || []);
    } catch (err: any) {
      console.warn('[AdminBookingDetailModal] email log fetch failed', err.message);
    } finally {
      setEmailsLoading(false);
    }
  };

  useEffect(() => {
    reloadDocs();
    reloadEmailLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.booking_reference, booking.id]);


  /**
   * Unified "Download / Open file" action.
   *
   * Hands the browser the raw Supabase signed URL with
   * `Content-Disposition: inline` — NO third-party preview service.
   * iPhone Safari opens PDFs / images in its native viewer; DOCX / CSV
   * / other formats fall through to iOS's "Open in…" share sheet so
   * they route into Files / Pages / Numbers. On desktop the browser
   * renders or saves based on Content-Type.
   *
   * On failure (signing error, popup blocked, etc.) we record a
   * per-row error so the UI can surface "File preview unavailable.
   * Please use Download." with a fallback Download CTA — never silent.
   */
  const handleOpenDoc = async (doc: { path: string; name: string }) => {
    setDocOpenErrors((prev) => {
      const next = { ...prev };
      delete next[doc.path];
      return next;
    });
    const result = await openOrDownloadFile(doc.path, doc.name);
    if (!result.ok) {
      setDocOpenErrors((prev) => ({
        ...prev,
        [doc.path]: result.reason || 'File preview unavailable. Please use Download.',
      }));
    }
  };

  /**
   * Forced download — Content-Disposition: attachment; filename="…".
   * Set via Supabase's signed-URL `download` option so iOS Safari saves
   * the file to the Files app instead of previewing it. Always available
   * per req #2 as a guaranteed save path on any device.
   */
  const downloadDoc = async (doc: { path: string; name: string }) => {
    const url = await downloadFile(doc.path, doc.name);
    if (!url) {
      toast({ title: 'Error', description: 'Failed to download document', variant: 'destructive' });
    }
  };


  /**
   * Admin "completed locate documents" upload handler.
   *
   * The OLD path wrote the entire array to `bookings.completed_documents`
   * (jsonb) on every change — and that was the source of the
   * "invalid input syntax for type json" toast. Object identity from the
   * camera/file input occasionally produced fields PostgREST refused.
   *
   * The NEW path matches the customer-portal "source of truth" model:
   * insert ONE row into `booking_documents` per newly-uploaded file. The
   * portal already loads from this table, so completed docs now appear in
   * the customer's Job Centre immediately — and the JSONB column is no
   * longer in the failure path.
   */
  const handleCompletedDocsChange = async (files: UploadedFile[]) => {
    setSavingDocs(true);
    try {
      const knownPaths = new Set(completedDocs.map((d) => d.path));
      const fresh = files.filter((f) => f.path && !knownPaths.has(f.path));
      console.log('[admin:completed-upload]', {
        bookingId: booking.id,
        ref: booking.booking_reference,
        existingCount: completedDocs.length,
        incomingCount: files.length,
        freshCount: fresh.length,
      });
      if (fresh.length > 0) {
        await insertBookingDocuments(
          fresh.map((f) => ({
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            customer_email: booking.customer_email,
            original_filename: f.name,
            storage_path: f.path,
            file_size: f.size,
            mime_type: f.mimeType || null,
            document_type: 'completed',
            uploaded_by: 'admin',
          }))
        );
      }
      // Pull fresh rows from DB so the UI reflects what's persisted.
      await reloadDocs();
      // Notify parent (table) so its row's doc-count pill updates.
      onUpdated({});
      toast({
        title: 'Completed documents updated',
        description: 'The customer can now download these from their portal.',
      });
    } catch (err: any) {
      console.error('[admin:completed-upload:error]', err);
      toast({
        title: 'Error saving completed documents',
        description: err?.message || 'Database insert failed.',
        variant: 'destructive',
      });
    } finally {
      setSavingDocs(false);
    }
  };



  /**
   * "Email customer download links" — invokes the send-completed-docs-link
   * edge function which:
   *   • Pulls all booking_documents rows where document_type='completed'
   *   • Generates a 7-day signed URL for each via the storage admin API
   *   • Sends one email to the customer with all links inline
   *   • Logs the send to email_log with email_type='completed_docs_link'
   *
   * Uses the same Mailgun→Resend fallback as send-booking-email so the
   * provider tags in the email-log timeline are consistent.
   */
  const handleSendCompletedLink = async () => {
    if (sendingLink) return;
    if (completedDocs.length === 0) {
      toast({
        title: 'No completed documents',
        description: 'Upload at least one completed document before emailing the customer a link.',
        variant: 'destructive',
      });
      return;
    }
    const ok = window.confirm(
      `Email ${booking.customer_email} a download link for ${completedDocs.length} completed document${
        completedDocs.length === 1 ? '' : 's'
      }?\n\nLinks are valid for 7 days.`
    );
    if (!ok) return;

    setSendingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-completed-docs-link', {
        body: {
          bookingId: booking.id,
          bookingReference: booking.booking_reference,
        },
      });
      if (error) throw error;
      const resp = (data || {}) as {
        success?: boolean;
        recipient?: string;
        fileCount?: number;
        signedUrlTtlDays?: number;
        error?: string;
        provider?: string;
        unsignedFiles?: string[];
      };
      if (!resp.success) {
        throw new Error(resp.error || 'Email send failed');
      }
      toast({
        title: 'Download link emailed',
        description: `Sent ${resp.fileCount ?? completedDocs.length} link${
          (resp.fileCount ?? completedDocs.length) === 1 ? '' : 's'
        } to ${resp.recipient || booking.customer_email} (valid ${resp.signedUrlTtlDays ?? 7} days).`,
      });
      // Pull the new email_log row so the admin sees it in the timeline
      // immediately — confirms the send actually went through.
      reloadEmailLog();
    } catch (err: any) {
      console.error('[admin:send-completed-docs-link]', err);
      toast({
        title: 'Failed to send download link',
        description: err?.message || 'Edge function returned an error. Check email_log for details.',
        variant: 'destructive',
      });
    } finally {
      setSendingLink(false);
    }
  };

  /**
   * CUSTOMER-EMAIL DIAGNOSTIC
   * ─────────────────────────
   * Scan email_log for the most recent CUSTOMER-recipient confirmation row
   * for this booking. This is the single source of truth for "did the
   * customer actually get their booking email?". The send-booking-email
   * edge function writes one row per recipient, so:
   *   • status='accepted' + delivery_state='sent'   → provider accepted ✓
   *   • status='failed' or delivery_state='rejected' → provider rejected ✗
   *   • no row at all                                → edge function never
   *                                                    attempted the customer
   *                                                    send (config issue or
   *                                                    invalid email).
   * Surfaced as a banner at the top of the modal so the operator sees the
   * problem before scrolling to the email log. Pairs with the "Resend to
   * customer" button which retriggers send-booking-email for this booking.
   */
  const customerEmailStatus = useMemo(() => {
    // Most recent customer-recipient row, regardless of email_type.
    const customerRows = emailLog.filter(
      (r) => (r.recipient_role || '').toLowerCase() === 'customer'
    );
    const latestConfirmation = customerRows.find(
      (r) => (r.email_type || '').toLowerCase().includes('confirmation')
    );
    const latest = latestConfirmation || customerRows[0];
    if (!latest) {
      return {
        kind: 'missing' as const,
        label: 'No customer email recorded',
        detail:
          'The edge function never logged a customer-recipient row for this booking. Most common causes: invalid customer email format, edge-function deploy out of date, or FROM_EMAIL/MAILGUN_DOMAIN secret not set in Supabase.',
      };
    }
    const okState =
      latest.status === 'accepted' || latest.delivery_state === 'sent';
    if (okState) {
      return {
        kind: 'sent' as const,
        label: `Customer email accepted by ${latest.provider || 'provider'}`,
        detail: `Sent ${fmtDateTime(latest.created_at)} to ${latest.recipient_email}. If the customer says they didn't receive it, check their spam folder and your domain's SPF/DKIM records.`,
      };
    }
    return {
      kind: 'failed' as const,
      label: `Customer email REJECTED by ${latest.provider || 'provider'}`,
      detail:
        latest.error ||
        `Provider returned delivery_state='${latest.delivery_state || latest.status}'. Resend the email below — if it keeps failing, the customer's address is likely bouncing.`,
    };
  }, [emailLog]);

  /**
   * "Resend confirmation to customer" — re-invokes the same
   * send-booking-email edge function used at booking-creation time, with
   * the canonical confirmation payload. Idempotent on the outbox layer
   * (uses booking_reference as part of the idempotency key) so repeated
   * clicks won't fan out duplicate sends — the existing outbox row is
   * upserted and re-attempted.
   */
  const handleResendConfirmation = async () => {
    if (resendingConfirmation) return;
    setResendingConfirmation(true);
    try {
      const result = await sendBookingConfirmationEmail({
        customerEmail: booking.customer_email,
        customerName: booking.customer_name,
        bookingReference: booking.booking_reference,
        service: booking.service,
        bookingDate: booking.booking_date,
        serviceAddress: booking.service_address,
        customerPhone: booking.customer_phone,
        documents: (booking.documents as any) || [],
        notes: booking.job_details || '',
      });
      if (result.success && !result.customerWarning) {
        toast({
          title: 'Confirmation re-sent',
          description: `Email re-queued for ${booking.customer_email}. New row will appear in the timeline.`,
        });
      } else if (result.customerWarning) {
        toast({
          title: 'Operator copy sent — customer copy failed',
          description:
            result.providerDetails?.customer?.error ||
            'Provider rejected the customer recipient. Check the email_log row below for details.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Resend failed',
          description: result.error || 'Unknown error from edge function.',
          variant: 'destructive',
        });
      }
      reloadEmailLog();
    } catch (err: any) {
      console.error('[admin:resend-confirmation]', err);
      toast({
        title: 'Resend threw',
        description: err?.message || 'Unexpected error contacting email service.',
        variant: 'destructive',
      });
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (

    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-brand-navy text-white p-5 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide">Booking</p>
            <h2 className="text-xl font-bold">{booking.booking_reference}</h2>
            <p className="text-white/70 text-sm mt-1">
              {booking.service} • {new Date(booking.booking_date).toLocaleDateString('en-NZ', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Customer + service details */}
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-brand-teal mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-medium">{booking.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-brand-teal mt-1" />
                <a href={`mailto:${booking.customer_email}`} className="text-blue-600 hover:underline text-sm break-all">
                  {booking.customer_email}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-brand-teal mt-1" />
                <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline text-sm">
                  {booking.customer_phone}
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-brand-teal mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="font-medium">{booking.service}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-brand-teal mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Booking date</p>
                  <p className="font-medium">{new Date(booking.booking_date).toLocaleDateString('en-NZ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-teal mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium">{booking.service_address}</p>
                </div>
              </div>
            </div>
          </section>

          {/*
            CUSTOMER EMAIL DELIVERY STATUS — top-of-modal diagnostic.
            Surfaces the most recent customer-recipient row from email_log.
            Operators see at a glance whether the customer actually got
            their booking confirmation and can re-send with one click.
          */}
          <section
            className={`rounded-lg p-4 border ${
              customerEmailStatus.kind === 'sent'
                ? 'bg-green-50 border-green-200'
                : customerEmailStatus.kind === 'failed'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {customerEmailStatus.kind === 'sent' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : customerEmailStatus.kind === 'failed' ? (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold text-sm ${
                    customerEmailStatus.kind === 'sent'
                      ? 'text-green-900'
                      : customerEmailStatus.kind === 'failed'
                      ? 'text-red-900'
                      : 'text-amber-900'
                  }`}
                >
                  Customer email: {customerEmailStatus.label}
                </p>
                <p className="text-xs text-gray-700 mt-1">{customerEmailStatus.detail}</p>
                <button
                  onClick={handleResendConfirmation}
                  disabled={resendingConfirmation}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-navy text-white hover:bg-brand-navy/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingConfirmation ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Re-sending…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" /> Resend confirmation to customer
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>


          {/*
            Terms Acceptance row — surfaces the timestamped consent that the
            booking flow appends to job_details as `[Acknowledgement <ISO>] …`.
            Rendered above Job notes so operators can see at a glance whether
            the customer accepted the Customer Notes / Terms / Privacy Policy
            and exactly when (in NZ time) they did so. Legacy bookings written
            before this field existed show an amber "Not recorded" badge.
          */}
          <section className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2">Terms Acceptance</p>
            {acceptedAtIso ? (
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800">
                    Customer Notes, Terms of Service &amp; Privacy Policy accepted
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {fmtNZDateTime(acceptedAtIso)}
                  </p>
                </div>
              </div>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                title="This booking pre-dates the consent capture field, or the acknowledgement line is missing from job_details."
              >
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Not recorded
              </span>
            )}
          </section>

          {cleanedNotes && (
            <section className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Job notes
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{cleanedNotes}</p>
            </section>
          )}


          {/* Xero */}
          <section className="border border-blue-100 rounded-lg p-4 bg-blue-50/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-brand-navy flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Xero Invoice
              </h3>
            </div>
            {booking.xero_invoice_id ? (
              <p className="text-xs text-gray-600 mb-2">
                Invoice already created
                {booking.xero_created_at ? ` on ${fmtDateTime(booking.xero_created_at)}` : ''}.
                Re-running will not create a duplicate.
              </p>
            ) : (
              <p className="text-xs text-gray-600 mb-2">
                Creates a draft invoice in Xero for this booking. The customer is not auto-emailed.
              </p>
            )}
            <XeroInvoiceButton booking={booking} onUpdated={onUpdated} />
          </section>

          {/* Customer-uploaded documents */}
          <section>
            <h3 className="font-semibold text-brand-navy flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" /> Customer files ({customerDocs.length})
            </h3>
            {customerDocs.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No customer files attached.</p>
            ) : (
              <div className="space-y-2">
                {customerDocs.map((doc) => (
                  <div key={doc.path} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">{fmtSize(doc.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/*
                          Primary  : "Download / Open file" — opens raw
                                     Supabase signed URL in a new tab.
                                     iPhone Safari handles PDFs / images
                                     natively, share-sheets the rest.
                                     NO third-party preview service.
                          Fallback : Download icon — forced attachment save.
                                     Always present per req #2.
                        */}
                        <button
                          onClick={() => handleOpenDoc(doc)}
                          aria-label={`Download or open ${doc.name}`}
                          title="Opens in a new tab. PDFs / images preview; other files download."
                          className="flex items-center gap-1 px-3 py-1.5 bg-brand-teal text-white rounded-lg hover:bg-brand-navy text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">Download / Open file</span>
                          <span className="sm:hidden">Open</span>
                        </button>
                        <button
                          onClick={() => downloadDoc(doc)}
                          aria-label={`Download ${doc.name} as a file`}
                          title="Force download (save to device)"
                          className="p-1.5 text-gray-500 hover:text-brand-orange hover:bg-orange-50 rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {docOpenErrors[doc.path] && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">
                          File preview unavailable. Please use{' '}
                          <button
                            onClick={() => downloadDoc(doc)}
                            className="underline font-medium hover:text-amber-900"
                          >
                            Download
                          </button>
                          .
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </section>


          {/* Completed locate documents (admin upload) */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-brand-navy flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-orange" /> Completed locate documents ({completedDocs.length})
                {savingDocs && <Loader2 className="w-3 h-3 animate-spin" />}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/*
                  "Email customer download links"
                  ─────────────────────────────────
                  Generates 7-day signed URLs for every completed-doc on
                  this booking and emails them to the customer in one go,
                  via the same Mailgun→Resend pipeline as send-booking-email.
                  Logged to email_log with email_type='completed_docs_link'
                  so each send is auditable in the timeline below.
                */}
                {completedDocs.length > 0 && (
                  <button
                    onClick={handleSendCompletedLink}
                    disabled={sendingLink}
                    title={`Email ${booking.customer_email} a 7-day download link`}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-brand-teal text-white hover:bg-brand-navy disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingLink ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" /> Email download link
                      </>
                    )}
                  </button>
                )}
                {!showCompletedUpload && (
                  <button
                    onClick={() => setShowCompletedUpload(true)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-brand-orange text-white hover:bg-orange-600"
                  >
                    <Plus className="w-3 h-3" /> Add files
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              These appear in the customer's portal under "Completed locate documents".
              Use <span className="font-medium">Email download link</span> to send the customer 7-day signed download URLs by email.
            </p>


            {completedDocs.length === 0 && !showCompletedUpload && (
              <p className="text-sm text-gray-500 italic">No completed documents uploaded yet.</p>
            )}

            {completedDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {completedDocs.map((doc) => (
                  <div key={doc.path} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {fmtSize(doc.size)}
                        {doc.uploaded_at ? ` • ${fmtDateTime(doc.uploaded_at)}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadDoc(doc)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-orange text-white rounded-lg hover:bg-orange-600 text-xs"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showCompletedUpload && (
              <div className="border-2 border-dashed border-brand-orange/40 rounded-lg p-3 bg-orange-50/40">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-brand-navy">Upload completed documents</p>
                  <button onClick={() => setShowCompletedUpload(false)} className="text-xs text-gray-500 hover:text-gray-700">
                    Done
                  </button>
                </div>
                {/*
                  Admin completed-docs upload — these files are STORED for the
                  customer to download from their portal. They are NOT sent
                  via email, so the 15 MB email-attachment cap doesn't apply
                  here. We:
                    • raise the total cap to 200 MB
                    • compress EVERY image (compressAllImages) so even small
                      PNG screenshots are normalised to ~150 KB JPEGs and a
                      whole job's worth of photos easily fits.
                    • hide the "15 MB email limit" copy that's wrong here.
                */}
                <FileUpload
                  files={completedDocs}
                  onFilesChange={handleCompletedDocsChange}
                  bookingRef={`completed-${booking.booking_reference}`}
                  totalLimitBytes={200 * 1024 * 1024}
                  compressAllImages
                  hideEmailLimitNote
                />
              </div>
            )}

          </section>

          {/* Email history */}
          <section>
            <h3 className="font-semibold text-brand-navy flex items-center gap-2 mb-2">
              <MailIcon className="w-4 h-4" /> Emails sent ({emailLog.length})
            </h3>
            {emailsLoading ? (
              <p className="text-sm text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</p>
            ) : emailLog.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No emails logged for this booking yet.</p>
            ) : (
              <div className="space-y-1.5">
                {emailLog.map((row) => {
                  const okState = row.status === 'accepted' || row.delivery_state === 'sent';
                  return (
                    <div
                      key={row.id}
                      className={`text-xs rounded border px-3 py-2 flex items-start justify-between gap-2 ${
                        okState ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {row.email_type || 'email'} → {row.recipient_role || 'recipient'}
                        </p>
                        <p className="text-gray-600 truncate">
                          {row.recipient_email} • {row.provider || '—'} •{' '}
                          {row.delivery_state || row.status}
                        </p>
                        {row.error && (
                          <p className="text-red-600 mt-0.5 truncate">{row.error}</p>
                        )}
                      </div>
                      <span className="text-gray-400 whitespace-nowrap">
                        {fmtDateTime(row.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingDetailModal;
