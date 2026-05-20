/**
 * Pending Booking Reference — onboarding handoff helper
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Why this module exists
 * ──────────────────────
 * After a customer completes a booking, the confirmation screen offers an
 * "Access Customer Portal" button that opens `/portal`. The portal's
 * "Create your password" form requires three things:
 *
 *   1. email
 *   2. booking reference  (the "UL-XXXX" code we just generated)
 *   3. password / confirm password
 *
 * Previously the booking reference was lost during the redirect, forcing
 * the customer to re-type it from memory or copy it out of the
 * confirmation email. This caused a meaningful drop-off in successful
 * portal account activations.
 *
 * Strategy
 * ────────
 * We hand the reference (and the customer's email) off via TWO complementary
 * channels, so the flow survives every realistic mobile scenario:
 *
 *   ┌──────────────────────┬──────────────────────────────────────────────┐
 *   │ Channel              │ Survives                                     │
 *   ├──────────────────────┼──────────────────────────────────────────────┤
 *   │ URL query params     │ Cross-tab opens, copy/paste links, deep links│
 *   │ sessionStorage       │ Refresh, back/forward, address-bar edits     │
 *   └──────────────────────┴──────────────────────────────────────────────┘
 *
 * On arrival at the portal we check URL params first (authoritative for a
 * fresh redirect), then fall back to sessionStorage. As soon as we've
 * captured the value into React state we strip the URL params via
 * `history.replaceState` so they don't linger in the address bar / browser
 * history (and so a subsequent refresh re-reads them from sessionStorage,
 * not the URL — preventing stale references being re-applied after the
 * customer has manually changed them).
 *
 * Security model
 * ──────────────
 * The booking reference is NOT a credential. It is a short, public-ish
 * lookup token (4 characters, unambiguous alphabet) that already appears
 * in:
 *   • the on-screen confirmation panel
 *   • the customer's confirmation email
 *   • the operator's booking notification email
 *
 * Knowing it does NOT grant access to anything. The portal's `set-password`
 * action on the `customer-portal-auth` edge function performs the real
 * authorisation:
 *
 *   • verifies the reference matches a booking
 *   • verifies that booking's `customer_email` matches the supplied email
 *   • verifies a password isn't already set for that customer
 *
 * So passing the ref through the URL is safe — we are not exposing
 * anything the customer doesn't already see in their own email.
 *
 * We DO use sessionStorage (not localStorage) because:
 *   • the handoff is single-use, single-tab, and short-lived
 *   • sessionStorage is wiped when the tab is closed → no long-lived
 *     residue on shared / library / family devices
 *
 * We also TTL the entry to 30 minutes. That's longer than a normal sign-up
 * flow takes (≤ 60 seconds) but short enough that a stale ref left over
 * from yesterday cannot accidentally be applied to a different booking
 * the next time someone hits the portal from the same device.
 */

export const PENDING_REF_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SS_KEY = 'nzud:pendingBookingRef:v1';

/** Normalised UL-XXXX format. The booking generator uses 4 chars from an
 *  unambiguous alphabet, but we accept 3–8 to stay forward-compatible if
 *  the ref length is ever changed. */
const REF_PATTERN = /^UL-[A-Z0-9]{3,8}$/;

export interface PendingBookingRef {
  reference: string;
  email?: string;
  /** When this handoff was created (ms epoch). Used for TTL eviction. */
  createdAt: number;
}

/** Tight UL-reference validator. Returns the normalised value or null. */
export function normaliseBookingRef(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;
  return REF_PATTERN.test(trimmed) ? trimmed : null;
}

/** Email is optional in the handoff but if present we sanity-check shape. */
function normaliseEmail(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return undefined;
  // Loose email shape — the form will revalidate before submission, this is
  // just to reject obvious garbage being smuggled through the URL.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  if (trimmed.length > 254) return undefined;
  return trimmed;
}

const safeSession = {
  get(key: string): string | null {
    try {
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    } catch {
      return null; // Safari Private Browsing throws
    }
  },
  set(key: string, value: string) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* noop */
    }
  },
  remove(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

/**
 * Persist the reference for the upcoming portal redirect.
 * Idempotent — calling repeatedly with the same ref is fine.
 */
export function savePendingBookingRef(reference: string, email?: string): PendingBookingRef | null {
  const ref = normaliseBookingRef(reference);
  if (!ref) return null;
  const payload: PendingBookingRef = {
    reference: ref,
    email: normaliseEmail(email),
    createdAt: Date.now(),
  };
  safeSession.set(SS_KEY, JSON.stringify(payload));
  return payload;
}

/**
 * Read the persisted handoff, if any.
 * Returns null if missing, malformed, or older than the TTL.
 * Stale entries are auto-evicted on read so we never hand out expired data.
 */
export function readPendingBookingRef(): PendingBookingRef | null {
  const raw = safeSession.get(SS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingBookingRef>;
    const ref = normaliseBookingRef(parsed.reference);
    if (!ref) {
      safeSession.remove(SS_KEY);
      return null;
    }
    const createdAt = typeof parsed.createdAt === 'number' ? parsed.createdAt : 0;
    if (!createdAt || Date.now() - createdAt > PENDING_REF_TTL_MS) {
      safeSession.remove(SS_KEY);
      return null;
    }
    return {
      reference: ref,
      email: normaliseEmail(parsed.email),
      createdAt,
    };
  } catch {
    safeSession.remove(SS_KEY);
    return null;
  }
}

/** Wipe the handoff. Call after a successful set-password OR when the user
 *  explicitly chooses "Use a different booking reference". */
export function clearPendingBookingRef(): void {
  safeSession.remove(SS_KEY);
}

/**
 * Pull a handoff from URL query params, if present and valid.
 * Used on portal entry — these are authoritative for a fresh redirect
 * and trump anything previously stored in sessionStorage.
 *
 * Accepts:  ?ref=UL-XXXX&email=foo%40bar.com&from=booking
 */
export function readPendingBookingRefFromURL(search: string): PendingBookingRef | null {
  if (!search) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } catch {
    return null;
  }
  const ref = normaliseBookingRef(params.get('ref'));
  if (!ref) return null;
  return {
    reference: ref,
    email: normaliseEmail(params.get('email')),
    createdAt: Date.now(),
  };
}

/**
 * Build the URL to redirect to from the booking confirmation screen.
 * Centralised here so the portal-side reader and the booking-side writer
 * never drift out of sync on param names.
 */
export function buildPortalHandoffUrl(reference: string, email?: string): string {
  const ref = normaliseBookingRef(reference);
  if (!ref) return '/portal';
  const params = new URLSearchParams({ ref, from: 'booking' });
  const cleanEmail = normaliseEmail(email);
  if (cleanEmail) params.set('email', cleanEmail);
  return `/portal?${params.toString()}`;
}

/**
 * Strip our handoff params from the address bar without triggering a
 * navigation. This stops a customer who refreshes the page from
 * accidentally re-applying a stale URL ref AFTER they've manually edited
 * the form (e.g. typed a different reference for a second booking).
 *
 * Other params (utm_*, anchors, etc.) are preserved.
 */
export function stripHandoffParamsFromURL(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    let touched = false;
    ['ref', 'email', 'from'].forEach((k) => {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        touched = true;
      }
    });
    if (touched) {
      const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash;
      window.history.replaceState(window.history.state, '', cleaned);
    }
  } catch {
    /* noop */
  }
}
