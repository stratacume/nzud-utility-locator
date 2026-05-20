import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AlertCircle, CheckCircle2, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import {
  savePendingBookingRef,
  buildPortalHandoffUrl,
  normaliseBookingRef,
} from '@/lib/pendingBookingRef';

interface Props {
  bookingRef: string;
  emailStatus?: 'pending' | 'sent' | 'failed';
  emailStage?: string;
  emailError?: string;
  /** Operator got the email, but customer copy bounced/rejected. Soft warning. */
  customerWarning?: boolean;
  filesUploaded?: number;
  email?: string;
  onReset: () => void;
}

/**
 * Booking confirmation panel.
 *
 * Success criterion: the OPERATOR email was accepted by the email
 * provider. The customer's copy is best-effort — if it fails we show a
 * soft "we couldn't email your copy" warning, not a hard failure,
 * because the operator already has the booking and will phone back.
 *
 * ─── Auto-handoff to "Create your password" ────────────────────────────
 * Per the onboarding hotfix, once the booking is saved we immediately
 * redirect the customer to the portal's password-creation form with the
 * booking reference (and email) handed off via sessionStorage + URL
 * params. The customer never has to retype the UL-XXXX code.
 *
 * We DO NOT auto-redirect when emailStatus === 'failed' — in that path
 * the customer needs to read the "call NZUD on 027 267 0217" warning
 * before navigating away.
 *
 * If emailStatus is still 'pending' after a short safety window we go
 * ahead and redirect anyway — the email pipeline runs server-side and
 * is independent of whether the customer is staring at this screen.
 *
 * The legacy "Access Customer Portal" button is preserved as a manual
 * fallback for when auto-redirect is blocked (rare: e.g. some embedded
 * webviews) or when the customer arrives here via failed-email path.
 * ──────────────────────────────────────────────────────────────────────
 */
const REDIRECT_SAFETY_MS = 2500;

const BookingConfirmed: React.FC<Props> = ({
  bookingRef, emailStatus, emailStage, emailError, customerWarning, filesUploaded = 0, email, onReset,
}) => {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Single-shot auto-handoff. Effect re-runs when emailStatus settles.
  useEffect(() => {
    if (hasRedirected.current) return;
    const ref = normaliseBookingRef(bookingRef);
    if (!ref) return;                       // defensive: never redirect with a bad ref
    if (emailStatus === 'failed') return;   // keep customer here so they see the warning

    const go = () => {
      if (hasRedirected.current) return;
      hasRedirected.current = true;
      savePendingBookingRef(ref, email);
      // replace:true so the browser back button takes the customer to the
      // booking flow (or the marketing site) — NOT back here, which would
      // re-trigger this redirect and feel like a navigation loop.
      navigate(buildPortalHandoffUrl(ref, email), { replace: true });
    };

    if (emailStatus === 'sent') {
      go();
      return;
    }
    // emailStatus is 'pending' or undefined — wait briefly, then go anyway.
    const t = window.setTimeout(go, REDIRECT_SAFETY_MS);
    return () => window.clearTimeout(t);
  }, [bookingRef, email, emailStatus, navigate]);

  const stageLabel = (s?: string): string => {
    switch (s) {
      case 'invoke':         return 'Could not reach email service';
      case 'response-shape': return 'Email service returned invalid response';
      case 'operator-send':  return 'Email provider rejected the booking notification';
      case 'config':         return 'Email service is not configured';
      case 'fatal':          return 'Email service crashed';
      default:               return 'Email delivery failed';
    }
  };

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-brand-navy mb-2">Booking Saved</h3>
      <p className="text-gray-600 mb-2">Your booking reference is:</p>
      <p className="text-2xl font-bold text-brand-orange mb-4">{bookingRef}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left max-w-md mx-auto space-y-2">
        {filesUploaded > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-gray-800">
              <strong>{filesUploaded}</strong> file{filesUploaded === 1 ? '' : 's'} uploaded
            </span>
          </div>
        )}

        {emailStatus === 'pending' && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
            <span className="text-gray-800">Sending confirmation email…</span>
          </div>
        )}

        {emailStatus === 'sent' && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-gray-800">Booking notification sent to NZUD</span>
            </div>

          </>
        )}

        {emailStatus === 'failed' && (
          <div className="flex items-start gap-2 text-sm">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-red-800">
              <div className="font-semibold">Email NOT sent — {stageLabel(emailStage)}</div>
              {emailError && (
                <div className="text-xs mt-1 text-red-700 break-words">{emailError}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {emailStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left max-w-md mx-auto">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Your booking <strong>{bookingRef}</strong> is saved, but we couldn't
              email NZUD the notification. Please call <a href="tel:0272670217" className="underline font-semibold">027 267 0217</a> with
              your reference number — quote it and we'll have your details on file.
            </p>
          </div>
        </div>
      )}

      {emailStatus === 'sent' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-left max-w-md mx-auto">
          <p className="text-sm text-blue-800">
            Thanks for choosing NZUD — we'll be in contact shortly to discuss
            your requirements. {customerWarning
              ? <>If you don't hear from us, please call <a href="tel:0272670217" className="underline font-semibold">027 267 0217</a>.</>
              : <>If you don't see the email within a minute, please check your spam / junk folder.</>}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={onReset}
          className="w-full py-3 rounded-lg font-semibold bg-brand-orange hover:bg-orange-600 text-white transition-colors"
        >
          Book Another Service
        </button>
        <button
          onClick={() => {
            // ─── Onboarding handoff ───────────────────────────────────────
            // Persist (ref, email) into sessionStorage AND pass them as
            // URL params, so the portal can pre-fill the "Create your
            // password" form. The portal-side reader (PortalLogin) will
            // strip the URL params after consumption so the address bar
            // doesn't leak the values into copy/paste, screenshots, or
            // browser history beyond this single redirect.
            //
            // The booking ref is NOT a credential — it's a public lookup
            // token already printed in the customer's confirmation email
            // and on this very screen. The actual authorisation happens
            // server-side in the customer-portal-auth edge function,
            // which still requires email + ref + new password to match.
            savePendingBookingRef(bookingRef, email);
            navigate(buildPortalHandoffUrl(bookingRef, email));
          }}
          className="w-full py-3 rounded-lg font-semibold border-2 border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <User className="w-5 h-5" />
          Access Customer Portal
        </button>

        <p className="text-xs text-gray-400">View all your bookings, download documents & more</p>
      </div>
    </div>
  );
};

export default BookingConfirmed;
