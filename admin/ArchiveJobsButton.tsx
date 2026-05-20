import React, { useState } from 'react';
import { Archive, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/components/booking/BookingDetails';
import { useToast } from '@/hooks/use-toast';

/**
 * Archive / Backup Jobs
 * ------------------------------------------------------------------
 * Click → confirmation modal showing exactly which jobs will be
 * archived. On confirm we invoke the `archive-jobs-email` edge
 * function which builds a CSV + JSON archive of the selected bookings
 * and emails them as attachments to julian@nzutilitydetection.com
 * (subject: "Archived Jobs"). ONLY after the email is accepted by the
 * provider do we PATCH `archived_at = now()` on the affected rows.
 *
 * Nothing is ever permanently deleted — archived rows simply get a
 * timestamp on `bookings.archived_at`, are hidden from the default
 * Admin Dashboard view, and remain viewable via the "Show Archived"
 * toggle in the filter bar.
 *
 * The button operates on the bookings array passed in via props
 * (which the dashboard scopes to "currently visible non-archived
 * bookings"), so operators always see exactly what's about to be
 * archived before they confirm.
 */
interface ArchiveJobsButtonProps {
  /** Bookings currently eligible for archiving (already filtered to non-archived). */
  bookings: Booking[];
  /** Called after a successful archive so the dashboard can update local state. */
  onArchived: (archivedIds: string[], archivedAtIso: string) => void;
}

const ARCHIVE_RECIPIENT = 'julian@nzutilitydetection.com';

const ArchiveJobsButton: React.FC<ArchiveJobsButtonProps> = ({ bookings, onArchived }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<{
    count: number;
    messageId?: string | null;
  } | null>(null);

  const candidateCount = bookings.length;
  const disabled = candidateCount === 0;

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

    const bookingIds = bookings.map((b) => b.id).filter(Boolean);
    if (bookingIds.length === 0) {
      setLastError('No bookings to archive.');
      setIsSending(false);
      return;
    }

    try {
      // Step 1 — build + email the archive. The function does NOT
      // touch the database; it returns the IDs the frontend should
      // mark archived if (and only if) the email was accepted.
      const { data, error } = await supabase.functions.invoke('archive-jobs-email', {
        body: { bookingIds },
      });

      if (error) {
        throw new Error(error.message || 'Failed to invoke archive function.');
      }
      if (!data?.success) {
        const providerInfo =
          data?.providerStatus || data?.providerError
            ? ` (provider HTTP ${data?.providerStatus ?? 'n/a'}: ${data?.providerError ?? 'unknown error'})`
            : '';
        throw new Error(`${data?.error || 'Archive email failed.'}${providerInfo}`);
      }

      const archivedIds: string[] = Array.isArray(data.archivedIds) ? data.archivedIds : [];
      if (archivedIds.length === 0) {
        throw new Error('Archive email reported success but returned no booking IDs.');
      }

      // Step 2 — flag those rows as archived in the database. Use a
      // single bulk PATCH so the dashboard updates atomically.
      const archivedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ archived_at: archivedAt })
        .in('id', archivedIds);

      if (updateError) {
        throw new Error(
          `Email sent OK, but flagging jobs as archived failed: ${updateError.message}. ` +
            `Please retry — re-archiving the same jobs is safe.`,
        );
      }

      toast({
        title: `Archived Jobs email sent to ${ARCHIVE_RECIPIENT}`,
        description: `Jobs archived successfully — ${archivedIds.length} job${archivedIds.length === 1 ? '' : 's'} flagged as archived.`,
      });

      setLastSuccess({ count: archivedIds.length, messageId: data.providerMessageId });
      onArchived(archivedIds, archivedAt);

      // Auto-close shortly after success so the operator sees the
      // confirmation toast.
      window.setTimeout(() => {
        setIsOpen(false);
      }, 1800);
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

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          disabled
            ? 'No bookings in the current view to archive'
            : `Email a CSV+JSON archive of the ${candidateCount} visible booking${candidateCount === 1 ? '' : 's'} to ${ARCHIVE_RECIPIENT} and mark them archived`
        }
      >
        <Archive className="w-4 h-4" />
        Archive / Backup Jobs
        {candidateCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-white/20 text-xs font-semibold">
            {candidateCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                <h2 id="archive-modal-title" className="text-lg font-bold text-brand-navy">
                  Archive / Backup Jobs
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
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                <p className="font-medium mb-1">This will:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Generate a full archive (CSV + JSON attachments) of the{' '}
                    <strong>{candidateCount}</strong> booking
                    {candidateCount === 1 ? '' : 's'} currently visible.
                  </li>
                  <li>
                    Email it to <strong>{ARCHIVE_RECIPIENT}</strong> with subject{' '}
                    <strong>“Archived Jobs”</strong>.
                  </li>
                  <li>
                    After the email is successfully accepted by the provider, flag those
                    jobs as <strong>archived</strong> (hidden from the default dashboard
                    view, viewable via the “Show Archived” toggle).
                  </li>
                </ol>
                <p className="mt-2 text-xs text-amber-800">
                  No job data is ever deleted. Files, emails, Xero links and notes remain
                  on the booking record.
                </p>
              </div>

              <div className="text-xs text-gray-600 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="font-medium text-gray-700 mb-1">Jobs included:</p>
                {bookings.length === 0 ? (
                  <p className="italic">No jobs in the current view.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {bookings.slice(0, 50).map((b) => (
                      <li key={b.id} className="truncate">
                        <span className="font-mono">{b.booking_reference}</span>
                        {' — '}
                        <span>{b.customer_name || 'Unknown'}</span>
                        {' · '}
                        <span className="text-gray-500">{b.service}</span>
                      </li>
                    ))}
                    {bookings.length > 50 && (
                      <li className="italic text-gray-500">
                        … and {bookings.length - 50} more.
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {lastError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Archive failed</p>
                    <p className="text-xs mt-0.5 break-words">{lastError}</p>
                  </div>
                </div>
              )}

              {lastSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      Archived Jobs email sent to {ARCHIVE_RECIPIENT}
                    </p>
                    <p className="text-xs mt-0.5">
                      {lastSuccess.count} job{lastSuccess.count === 1 ? '' : 's'} archived
                      successfully.
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
                disabled={isSending || candidateCount === 0 || !!lastSuccess}
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
                    Send archive &amp; mark archived
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

export default ArchiveJobsButton;
