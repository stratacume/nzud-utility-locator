/**
 * EmailOutboxPanel — admin visibility into the transactional email
 * delivery system. Renders the count of pending/failed/dead emails,
 * the most recent N rows with provider/error details, and a "Retry
 * now" button that invokes the `retry-failed-emails` edge function.
 *
 * This is the single pane of glass operators use to confirm that
 * EVERY booking confirmation email actually went out, and to
 * remediate the small percentage that didn't (DNS hiccups,
 * bounced customer addresses, etc.).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface OutboxRow {
  id: string;
  created_at: string;
  updated_at: string;
  email_type: string;
  booking_reference: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'dead';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  last_provider: string | null;
  last_http_status: number | null;
  sent_at: string | null;
}

/** Decode the last_error string into a human-friendly suppression
 *  reason. Mirrors the classifier in send-booking-email v42 so the
 *  admin sees the same vocabulary the edge function uses. */
const suppressionReason = (err: string | null): string | null => {
  if (!err) return null;
  const s = err.toLowerCase();
  if (s.includes('suppress')) return 'Suppression list';
  if (s.includes('hard bounce') || s.includes('bounced')) return 'Hard bounce';
  if (s.includes('complained')) return 'Spam complaint';
  if (s.includes('unsubscribed')) return 'Unsubscribed';
  if (s.includes('invalid_to') || s.includes('invalid recipient') || s.includes('invalid to')) return 'Invalid recipient';
  if (s.includes('placeholder')) return 'Placeholder address';
  if (s.includes('blocked')) return 'Blocked';
  if (s.includes('mailbox does not exist') || s.includes('no such user')) return 'Mailbox not found';
  return null;
};

const StatusPill: React.FC<{ status: OutboxRow['status']; lastError?: string | null }> = ({ status, lastError }) => {
  const reason = suppressionReason(lastError ?? null);
  const config: Record<OutboxRow['status'], { bg: string; fg: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
    sent:       { bg: 'bg-green-100',  fg: 'text-green-800',  label: 'Sent',       Icon: CheckCircle2 },
    pending:    { bg: 'bg-amber-100',  fg: 'text-amber-800',  label: 'Pending',    Icon: Clock },
    processing: { bg: 'bg-blue-100',   fg: 'text-blue-800',   label: 'Processing', Icon: RefreshCw },
    failed:     { bg: 'bg-orange-100', fg: 'text-orange-800', label: 'Failed',     Icon: AlertTriangle },
    dead:       { bg: 'bg-red-100',    fg: 'text-red-800',    label: reason || 'Dead', Icon: XCircle },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.fg}`} title={lastError || c.label}>
      <c.Icon className="w-3 h-3" /> {c.label}
    </span>
  );
};


const EmailOutboxPanel: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_outbox')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      setRows((data || []) as OutboxRow[]);
    } catch (err: any) {
      toast({ title: 'Could not load email queue', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { sent: 0, pending: 0, processing: 0, failed: 0, dead: 0 };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const handleRetryAll = async () => {
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-failed-emails', { body: {} });
      if (error) throw error;
      toast({
        title: 'Retry sweep complete',
        description: `Retried ${data?.retryable ?? 0} • sent ${data?.sent ?? 0} • failed ${data?.failed ?? 0}${data?.exhausted ? ` • marked ${data.exhausted} dead` : ''}`,
      });
      await load();
    } catch (err: any) {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryOne = async (row: OutboxRow) => {
    setRetrying(true);
    try {
      // Reset the row to pending + due-now so the retry function picks it up.
      const { error: resetErr } = await supabase
        .from('email_outbox')
        .update({ status: 'pending', next_attempt_at: new Date().toISOString() })
        .eq('id', row.id);
      if (resetErr) throw resetErr;
      const { data, error } = await supabase.functions.invoke('retry-failed-emails', { body: {} });
      if (error) throw error;
      toast({ title: 'Retry triggered', description: `Sent ${data?.sent ?? 0}, failed ${data?.failed ?? 0}` });
      await load();
    } catch (err: any) {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-5 h-5 text-brand-navy flex-shrink-0" />
          <h2 className="font-bold text-brand-navy text-base sm:text-lg truncate">Email Delivery</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleRetryAll}
            disabled={retrying || (counts.failed === 0 && counts.pending === 0)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} /> Retry queue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-4 sm:px-6 py-3 bg-gray-50/50 border-b">
        {(['sent', 'pending', 'processing', 'failed', 'dead'] as const).map((k) => (
          <div key={k} className="text-center bg-white rounded-md py-2 border">
            <p className="text-xs text-gray-500 capitalize">{k}</p>
            <p className={`text-lg font-bold ${k === 'dead' ? 'text-red-600' : k === 'failed' ? 'text-orange-600' : k === 'sent' ? 'text-green-600' : 'text-gray-700'}`}>
              {counts[k]}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading email queue…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center py-8 text-gray-500 text-sm">No email activity recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Booking</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Provider</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Attempts</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Updated</th>
                <th className="text-left px-4 py-2 font-medium">Error</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50/50">
                  <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{r.booking_reference || '—'}</td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap">{r.email_type}</td>
                  <td className="px-4 py-2 whitespace-nowrap"><StatusPill status={r.status} lastError={r.last_error} /></td>

                  <td className="px-4 py-2 text-xs hidden sm:table-cell whitespace-nowrap">{r.last_provider || '—'}{r.last_http_status ? ` (${r.last_http_status})` : ''}</td>
                  <td className="px-4 py-2 text-xs hidden md:table-cell whitespace-nowrap">{r.attempts}/{r.max_attempts}</td>
                  <td className="px-4 py-2 text-xs hidden md:table-cell whitespace-nowrap text-gray-500">{new Date(r.updated_at).toLocaleString('en-NZ', { hour12: false })}</td>
                  <td className="px-4 py-2 text-xs text-red-700 max-w-[280px] truncate" title={r.last_error || ''}>{r.last_error || '—'}</td>
                  <td className="px-4 py-2">
                    {(r.status === 'failed' || r.status === 'dead' || r.status === 'pending') && (
                      <button
                        onClick={() => handleRetryOne(r)}
                        disabled={retrying}
                        className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded disabled:opacity-50"
                      >Retry</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmailOutboxPanel;
