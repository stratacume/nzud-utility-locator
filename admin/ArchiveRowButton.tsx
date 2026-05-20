import React, { useState } from 'react';
import { Archive, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/components/booking/BookingDetails';
import { useToast } from '@/hooks/use-toast';

/**
 * Per-row Archive button.
 * ------------------------------------------------------------------
 * Sits in each booking row of the Admin Dashboard. Clicking it opens
 * a confirmation modal scoped to a SINGLE booking. On confirm:
 *
 *   1. Invoke `archive-jobs-email` with that single booking ID.
 *   2. Wait for Resend to accept the email (HTTP 2xx + message id).
 *   3. PATCH `bookings.archived_at = now()` on that row only.
 *   4. Tell the parent so the row drops out of the active view.
 *
 * If Resend (or anything else) fails, the exact error message returned
 * by the edge function is surfaced inline AND in a toast — no silent
 * "non-2xx" failures.
 *
 * No data is ever deleted. The booking stays in the database; only its
 * `archived_at` timestamp changes.
 */
interface ArchiveRowButtonProps {
  booking: Booking;
  onArchived: (id: string, archivedAtIso: string) => void;
  /** Optional compact mode — table row uses the icon-only variant. */
  variant?: 'icon' | 'button';
}

const ARCHIVE_RECIPIENT = 'julian@nzutilitydetection.com';

const ArchiveRowButton: React.FC<ArchiveRowButtonProps> = ({
  booking, onArchived, variant = 'icon',
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<{ messageId?: string | null } | null>(null);

  const handleOpen = () => {
    setLastError(null);
    setLastSuccess(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isSending) return;
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    setIsSending(true);
    setLastError(null);
    setLastSuccess(null);

    try {
      // STEP 1 — email + build archive for this single booking.
      const { data, error } = await supabase.functions.invoke('archive-jobs-email', {
        body: { bookingIds: [booking.id] },
      });

      // supabase-js wraps non-2xx in `error`. Our v2 edge function
      // returns recoverable failures as 200+success:false specifically
      // so we can read the real message — but we still defend against
      // network-level failures here.
      if (error && !data) {
        throw new Error(error.message || 'Failed to invoke archive function.');
      }
      if (!data?.success) {
        const providerInfo =
          data?.providerStatus || data?.providerError
            ? ` (provider HTTP ${data?.providerStatus ?? 'n/a'}: ${data?.providerError ?? 'unknown'})`
            : '';
        throw new Error(`${data?.error || 'Archive email failed.'}${providerInfo}`);
      }

      const archivedIds: string[] = Array.isArray(data.archivedIds) ? data.archivedIds : [];
      if (!archivedIds.includes(booking.id)) {
        throw new Error('Archive email reported success but did not return this booking ID.');
      }

      // STEP 2 — flag this single row as archived.
      const archivedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ archived_at: archivedAt })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error(
          `Email sent OK, but flagging the job as archived failed: ${updateError.message}. ` +
            `Re-archiving the same job is safe.`,
        );
      }

      toast({
        title: `Archived Jobs email sent to ${ARCHIVE_RECIPIENT}`,
        description: `Jobs archived successfully — ${booking.booking_reference} is now archived.`,
      });

      setLastSuccess({ messageId: data.providerMessageId });
      onArchived(booking.id, archivedAt);

      window.setTimeout(() => setIsOpen(false), 1500);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error.';
      setLastError(msg);
      toast({
        title: 'Archive failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const trigger =
    variant === 'icon' ? (
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 text-xs font-medium transition-colors"
        title={`Archive ${booking.booking_reference} — emails archive to ${ARCHIVE_RECIPIENT} and marks this job archived`}
      >
        <Archive className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Archive</span>
      </button>
    ) : (
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
      >
        <Archive className="w-4 h-4" /> Archive
      </button>
    );

  return (
    <>
      {trigger}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-row-modal-title"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                <h2 id="archive-row-modal-title" className="text-lg font-bold text-brand-navy">
                  Archive this job?
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isSending}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-mono font-semibold text-brand-orange">
                  {booking.booking_reference}
                </p>
                <p className="text-gray-900 mt-1">{booking.customer_name || 'Unknown'}</p>
                <p className="text-gray-600 text-xs">{booking.service}</p>
                <p className="text-gray-600 text-xs">{booking.booking_date}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                <p className="font-medium mb-1">This will:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                  <li>Build a CSV + JSON archive of <strong>this one job only</strong>.</li>
                  <li>
                    Email it to <strong>{ARCHIVE_RECIPIENT}</strong> with subject{' '}
                    <strong>“Archived Jobs”</strong>.
                  </li>
                  <li>
                    After Resend confirms delivery, flag this job as <strong>archived</strong> —
                    it will drop out of the default dashboard view.
                  </li>
                </ol>
                <p className="mt-2 text-xs text-amber-800">
                  No data is deleted. Use “Show Archived” in the filter bar to view archived
                  jobs again.
                </p>
              </div>

              {lastError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">Archive failed</p>
                    <p className="text-xs mt-0.5 break-words">{lastError}</p>
                  </div>
                </div>
              )}

              {lastSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      Archived Jobs email sent to {ARCHIVE_RECIPIENT}
                    </p>
                    <p className="text-xs mt-0.5">
                      Jobs archived successfully.
                      {lastSuccess.messageId ? ` Provider id: ${lastSuccess.messageId}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t bg-gray-50">
              <button
                onClick={handleClose}
                disabled={isSending}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSending || !!lastSuccess}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending archive…
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Email archive &amp; mark archived
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArchiveRowButton;
