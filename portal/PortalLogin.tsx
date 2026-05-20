import React, { useEffect, useRef, useState } from 'react';
import {
  Mail,
  KeyRound,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Hash,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomerPortal } from '@/contexts/CustomerPortalContext';
import {
  readPendingBookingRef,
  readPendingBookingRefFromURL,
  savePendingBookingRef,
  clearPendingBookingRef,
  stripHandoffParamsFromURL,
  normaliseBookingRef,
} from '@/lib/pendingBookingRef';

type Step = 'login' | 'set-password';

/**
 * Customer Portal sign-in / first-time-setup form.
 *
 * Onboarding handoff
 * ──────────────────
 * After a customer completes a booking they're redirected here from the
 * booking confirmation screen with a `?ref=UL-XXXX&email=…&from=booking`
 * URL. We:
 *
 *   1. Read the ref+email from the URL (authoritative on a fresh redirect).
 *   2. Fall back to sessionStorage if the URL has been refreshed away.
 *   3. Pre-fill BOTH the email and booking-reference fields and jump
 *      straight to the "Create your password" step — the customer only
 *      has to type a password and confirm it.
 *   4. Strip the URL params so a refresh re-reads from sessionStorage
 *      (the customer might have edited the form by then) and so the
 *      values don't linger in the address bar.
 *   5. Provide a manual override link ("Use a different reference") for
 *      the rare case the auto-fill is wrong.
 *
 * Server-side validation (customer-portal-auth edge function) is unchanged
 * — passing the ref via URL does NOT bypass any auth check; the function
 * still verifies that the email + ref pair matches a real booking and
 * that no password has been set yet.
 */
const PortalLogin: React.FC = () => {
  const { login: loginUser } = useCustomerPortal();
  const [step, setStep] = useState<Step>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Set-password (first-time setup or reset) state
  const [reference, setReference] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [setupReason, setSetupReason] = useState<'first-time' | 'forgot' | null>(null);

  /** True when the ref was pre-filled by the booking handoff (URL or
   *  sessionStorage). Drives the green "auto-filled" hint and the
   *  "Use a different reference" override link. */
  const [refPrefilled, setRefPrefilled] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Run the onboarding-handoff pickup exactly once on mount. We use a ref
  // guard (not just an empty deps array) so React 18 StrictMode's double-
  // invocation in dev doesn't double-process and accidentally clear the
  // sessionStorage entry before the second render reads it.
  const handoffConsumed = useRef(false);
  useEffect(() => {
    if (handoffConsumed.current) return;
    handoffConsumed.current = true;
    if (typeof window === 'undefined') return;

    // 1. URL params take priority (fresh redirect from booking screen).
    const fromUrl = readPendingBookingRefFromURL(window.location.search);
    // 2. sessionStorage fallback (handles refresh / back-forward / mobile
    //    Safari address-bar edits that strip the query string).
    const fromStorage = fromUrl ? null : readPendingBookingRef();
    const handoff = fromUrl || fromStorage;

    if (!handoff) return;

    // Mirror URL → sessionStorage so a later refresh keeps working even
    // after we strip the params from the address bar.
    if (fromUrl) {
      savePendingBookingRef(handoff.reference, handoff.email);
    }

    setReference(handoff.reference);
    if (handoff.email) setEmail(handoff.email);
    setRefPrefilled(true);
    setStep('set-password');
    setSetupReason('first-time');
    setInfo(
      "Welcome — we've pre-filled your booking reference. Just choose a password to access your portal."
    );

    // Clean the URL so a refresh doesn't fight the user's manual edits
    // and so the ref/email don't linger in the address bar.
    stripHandoffParamsFromURL();
  }, []);

  const switchToSetup = (reason: 'first-time' | 'forgot') => {
    setStep('set-password');
    setSetupReason(reason);
    setError('');
    setInfo(
      reason === 'first-time'
        ? "It looks like you haven't set a password yet. Verify with a booking reference and create one — your browser can save it for next time."
        : 'To reset your password, verify with a booking reference and choose a new one.'
    );
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    // Preserve any prefilled reference rather than blowing it away — the
    // customer just clicked through from a successful booking and should
    // not have to re-type it. If there was no handoff, this is a no-op
    // because `reference` was already empty.
    if (!refPrefilled) {
      setReference('');
    }
  };

  /** Manual override for the rare case the auto-filled ref is wrong (e.g.
   *  someone else's old session ref still in storage). Clears both the
   *  prefilled state AND the persisted handoff so we don't immediately
   *  re-apply it on the next render. */
  const useDifferentReference = () => {
    clearPendingBookingRef();
    setRefPrefilled(false);
    setReference('');
    setInfo('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('customer-portal-auth', {
        body: { action: 'login', email: email.trim().toLowerCase(), password },
      });
      if (fnError) {
        const payload = (data ?? {}) as { error?: string; noAccount?: boolean };
        if (payload.noAccount) {
          switchToSetup('first-time');
          return;
        }
        setError(payload.error || fnError.message || 'Login failed.');
        return;
      }
      if (!data?.success) {
        if (data?.noAccount) {
          switchToSetup('first-time');
          return;
        }
        setError(data?.error || 'Login failed.');
        return;
      }
      loginUser(data.email, data.sessionToken);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !reference.trim() || !newPassword) return;

    // Defensive client-side format check. The edge function does the real
    // validation against the database, but rejecting obviously-malformed
    // refs here saves a round-trip and gives the user a clearer message.
    const normalisedRef = normaliseBookingRef(reference);
    if (!normalisedRef) {
      setError('That booking reference doesn\'t look right. It should be in the form UL-XXXX.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('customer-portal-auth', {
        body: {
          action: 'set-password',
          email: email.trim().toLowerCase(),
          bookingReference: normalisedRef,
          password: newPassword,
        },
      });
      if (fnError) {
        const payload = (data ?? {}) as { error?: string };
        setError(payload.error || fnError.message || 'Could not save password.');
        return;
      }
      if (!data?.success) {
        setError(data?.error || 'Could not save password.');
        return;
      }
      // Success — wipe the handoff so it can't be re-applied to a
      // different account on the same device, then sign in so the
      // browser's save-password prompt fires against the same form.
      clearPendingBookingRef();
      loginUser(data.email, data.sessionToken);
    } catch (err: any) {
      setError(err.message || 'Could not save password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-brand-orange" />
        </div>
        <h2 className="text-2xl font-bold text-brand-navy">Customer Portal</h2>
        <p className="text-gray-600 mt-2">
          {step === 'login' && 'Sign in to view and manage your bookings'}
          {step === 'set-password' &&
            (setupReason === 'forgot' ? 'Reset your password' : 'Create your password')}
        </p>
      </div>

      {/* ─────────────── LOGIN ─────────────── */}
      {step === 'login' && (
        <form onSubmit={handleLogin} autoComplete="on">
          <div className="mb-4">
            <label htmlFor="portal-email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="portal-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="portal-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="portal-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || password.length < 1}
            className="w-full py-3 bg-brand-orange hover:bg-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => switchToSetup('first-time')}
              className="text-sm text-brand-orange hover:underline font-medium"
            >
              First time here? Create a password
            </button>
            <button
              type="button"
              onClick={() => switchToSetup('forgot')}
              className="text-xs text-gray-500 hover:text-brand-navy"
            >
              Forgot password?
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Your browser can save these credentials for next time.
            </p>
          </div>
        </form>
      )}

      {/* ─────────────── SET PASSWORD ─────────────── */}
      {step === 'set-password' && (
        <form onSubmit={handleSetPassword} autoComplete="on">
          {/* Friendly green confirmation banner replaces the amber "info"
              banner when the booking-handoff prefill ran. Reassures the
              customer that their reference is locked in and they only
              need to enter a password. */}
          {refPrefilled && info && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-green-800">{info}</span>
            </div>
          )}
          {!refPrefilled && info && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-amber-700">{info}</span>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="portal-setup-email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="portal-setup-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="portal-reference"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Booking Reference
              {refPrefilled && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Auto-filled from your booking
                </span>
              )}
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="portal-reference"
                name="booking-reference"
                type="text"
                autoComplete="off"
                value={reference}
                onChange={(e) => {
                  // Editing the auto-filled value implicitly drops the
                  // "prefilled" badge so the green confirmation doesn't
                  // contradict what the customer is now typing.
                  if (refPrefilled) setRefPrefilled(false);
                  setReference(e.target.value.toUpperCase());
                }}
                placeholder="e.g. UL-7K42"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent uppercase ${
                  refPrefilled
                    ? 'border-green-300 bg-green-50/40 text-green-900 font-semibold tracking-wider'
                    : 'border-gray-300'
                }`}
                required
                inputMode="text"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            {refPrefilled ? (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  From your recent booking. You can edit this if needed.
                </p>
                <button
                  type="button"
                  onClick={useDifferentReference}
                  className="text-xs text-brand-orange hover:underline font-medium"
                >
                  Use a different reference
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                Found in any of your booking confirmation emails. Used once to verify
                this email belongs to you.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="portal-new-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {setupReason === 'forgot' ? 'New password' : 'Choose a password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="portal-new-password"
                name="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((s) => !s)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="portal-confirm-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="portal-confirm-password"
                name="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              !email.trim() ||
              !reference.trim() ||
              newPassword.length < 8 ||
              newPassword !== confirmPassword
            }
            className="w-full py-3 bg-brand-orange hover:bg-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {setupReason === 'forgot' ? 'Reset password' : 'Create password'}{' '}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('login');
              setError('');
              setInfo('');
              setSetupReason(null);
            }}
            className="w-full mt-3 py-2 text-gray-600 hover:text-brand-navy text-sm"
          >
            Back to sign in
          </button>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Don't have your booking reference? Contact us:
            </p>

            <a
              href="mailto:julian@nzutilitydetection.com"
              className="text-sm text-brand-orange font-semibold hover:underline block"
            >
              julian@nzutilitydetection.com
            </a>
          </div>

        </form>
      )}
    </div>
  );
};

export default PortalLogin;
