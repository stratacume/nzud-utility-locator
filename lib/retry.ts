/**
 * Lightweight retry helpers for edge-function and storage calls.
 *
 * Why: NZUD's customers regularly upload from sites with patchy 4G —
 * a single transient network error shouldn't kill an upload, fail a
 * portal login, or drop a booking confirmation. These helpers add
 * exponential backoff with jitter and clear logging.
 *
 * Used by: customer portal auth (frontend), file upload retries,
 *          and any other edge-function call where a quick retry is
 *          the right behaviour (idempotent reads, signed-URL fetches).
 *
 * Do NOT wrap non-idempotent writes (e.g. "create booking",
 * "send-contact-email") with `retry()` unless the underlying handler
 * is idempotent — otherwise you risk creating duplicates on a slow
 * 200 that the client thought timed out.
 */

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Initial backoff in ms. Default 400. */
  baseDelayMs?: number;
  /** Max backoff in ms. Default 4000. */
  maxDelayMs?: number;
  /** Optional label for log lines. */
  label?: string;
  /** Predicate: if it returns false, give up immediately (e.g. 401/403). */
  shouldRetry?: (err: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const defaultShouldRetry = (err: unknown): boolean => {
  // Don't retry on auth / validation errors — they're not transient.
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? '';
  if (msg.includes('unauthor')) return false;
  if (msg.includes('forbidden')) return false;
  if (msg.includes('invalid')) return false;
  if (msg.includes('not found')) return false;
  return true;
};

/**
 * Run `fn` with exponential-backoff retries. Resolves with the first
 * successful value, or rejects with the LAST error after `attempts`.
 */
export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 400;
  const maxDelayMs = opts.maxDelayMs ?? 4000;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;
  const label = opts.label ?? 'retry';

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = i === attempts - 1;
      if (isLast || !shouldRetry(err)) {
        if (!isLast) console.warn(`[${label}] giving up early (non-retryable)`, err);
        throw err;
      }
      const jitter = Math.random() * 200;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, i)) + jitter;
      console.warn(`[${label}] attempt ${i + 1}/${attempts} failed, retrying in ${Math.round(delay)}ms`, err);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Race a promise against a timeout. Edge functions occasionally hang
 * when database is slow; surfacing a timeout to the user is much
 * better than a spinner that runs forever.
 */
export async function withTimeout<T>(p: Promise<T>, ms: number, label = 'request'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Returns true when the browser thinks it's online. Lets the UI show
 * a friendlier "you're offline" message instead of a generic network
 * error on the underground.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}
