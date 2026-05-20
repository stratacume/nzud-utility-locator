import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
} from 'lucide-react';


interface DiagFile {
  filename: string;
  size: number;
  sizePretty: string;
  attachable: boolean;
}

interface DiagResponse {
  success: boolean;
  version?: string;
  emailId?: string;
  emailError?: string;
  fromUsed?: string;
  recipient?: string;
  config?: {
    fileCount: number;
    totalSizeMB: number;
    perFileBytes: number;
    simulateOversize: boolean;
  };
  files?: DiagFile[];
  decision?: {
    willAttach: boolean;
    attachableFiles: number;
    totalAttachableBytes: number;
    totalAttachablePretty: string;
    totalBudget: number;
    totalBudgetPretty: string;
    perFileCap: number;
    perFileCapPretty: string;
    skippedReason?: string;
    retryNote?: string;
  };
  sentAt?: string;
  error?: string;
}

export default function AdminEmailTest() {
  const [to, setTo] = useState('julian@nzutilitydetection.com');
  const [fileCount, setFileCount] = useState(3);
  const [totalSizeMB, setTotalSizeMB] = useState(5);
  const [simulateOversize, setSimulateOversize] = useState(false);
  const [filename, setFilename] = useState('test-doc');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagResponse | null>(null);

  // ── SMS test state ───────────────────────────────────────────────
  const [smsMessage, setSmsMessage] = useState(
    'Test SMS from NZ Utility Detection admin diagnostics — Twilio is wired up correctly.'
  );
  const [smsTo, setSmsTo] = useState(''); // optional override; empty = use SMS_TO_NUMBER secret
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResult, setSmsResult] = useState<{
    ok: boolean;
    status?: number;
    data: unknown;
    error?: string;
    sentAt: string;
  } | null>(null);

  const sendTestSms = async () => {
    setSmsLoading(true);
    setSmsResult(null);
    try {
      const payload: Record<string, unknown> = { message: smsMessage };
      if (smsTo.trim()) payload.to = smsTo.trim();

      const { data, error } = await supabase.functions.invoke('send-sms-notification', {
        body: payload,
      });

      if (error) {
        setSmsResult({
          ok: false,
          error: error.message,
          data: data ?? null,
          sentAt: new Date().toISOString(),
        });
      } else {
        // send-sms-notification returns { ok: boolean, ... } — treat ok===true as success.
        // It also returns { ok: false, skipped: true } when Twilio isn't configured.
        const okFlag =
          data && typeof data === 'object' && 'ok' in (data as object)
            ? Boolean((data as { ok: unknown }).ok)
            : true;
        setSmsResult({
          ok: okFlag,
          data: data ?? null,
          sentAt: new Date().toISOString(),
        });
      }

    } catch (err) {
      setSmsResult({
        ok: false,
        error: (err as Error).message,
        data: null,
        sentAt: new Date().toISOString(),
      });
    } finally {
      setSmsLoading(false);
    }
  };

  const presets = [
    { label: 'Tiny (1 file × 0.5 MB)', count: 1, mb: 0.5 },
    { label: 'Small (3 × 1 MB)', count: 3, mb: 3 },
    { label: 'Typical (5 × 2 MB)', count: 5, mb: 10 },
    { label: 'Large (8 × 2.5 MB)', count: 8, mb: 20 },
    { label: 'At limit (10 × 2.5 MB)', count: 10, mb: 25 },
    { label: 'Over limit (5 × 6 MB)', count: 5, mb: 30 },
  ];

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('email-test-diagnostic', {
        body: {
          to,
          fileCount,
          totalSizeMB,
          simulateOversize,
          filename,
        },
      });
      if (error) {
        setResult({ success: false, error: error.message });
      } else {
        setResult(data as DiagResponse);
      }
    } catch (err) {
      setResult({ success: false, error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to admin
          </Link>
          <span className="text-xs text-gray-400 font-mono">/admin/email-test</span>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-3">
            <AlertTriangle className="w-3 h-3" /> Hidden diagnostic — not linked from anywhere
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-brand-orange" />
            Booking Email Deliverability Test
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Send a sample booking email to yourself with configurable file count and total
            size. Uses the same single-email render pipeline as real customer bookings, so
            you can verify Outlook rendering, Resend deliverability, and how attachments
            and download links appear together <strong>before</strong> trusting it for
            production traffic.
          </p>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Test configuration</h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="to">Send to</Label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="julian@nzutilitydetection.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use your real Outlook inbox to verify rendering.
              </p>
            </div>

            <div>
              <Label htmlFor="filename">Base filename</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="test-doc"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Files become <code>{filename}-1.pdf</code>, <code>{filename}-2.pdf</code>, …
              </p>
            </div>

            <div>
              <Label htmlFor="fileCount">Number of files: {fileCount}</Label>
              <input
                id="fileCount"
                type="range"
                min={0}
                max={15}
                value={fileCount}
                onChange={(e) => setFileCount(Number(e.target.value))}
                className="w-full mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">0–15 synthetic PDF attachments</p>
            </div>

            <div>
              <Label htmlFor="totalSize">Total size: {totalSizeMB.toFixed(1)} MB</Label>
              <input
                id="totalSize"
                type="range"
                min={0}
                max={40}
                step={0.5}
                value={totalSizeMB}
                onChange={(e) => setTotalSizeMB(Number(e.target.value))}
                className="w-full mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Split evenly across files. ~25 MB is the safe attachment ceiling.
              </p>
            </div>

            <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
              <div>
                <Label htmlFor="oversize" className="text-sm font-medium">
                  Simulate oversized file (link-only path)
                </Label>
                <p className="text-xs text-gray-500">
                  Forces file #1 above the per-file 18 MB cap so it falls back to a
                  download link.
                </p>
              </div>
              <Switch
                id="oversize"
                checked={simulateOversize}
                onCheckedChange={setSimulateOversize}
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Quick presets
            </p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setFileCount(p.count);
                    setTotalSizeMB(p.mb);
                    setSimulateOversize(false);
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={runTest}
              disabled={loading || !to}
              className="bg-brand-orange hover:bg-brand-orange/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending test…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" /> Send diagnostic email
                </>
              )}
            </Button>
            <span className="text-xs text-gray-500">
              Generates {fileCount} synthetic PDF{fileCount === 1 ? '' : 's'} totalling{' '}
              {totalSizeMB.toFixed(1)} MB and runs the real send pipeline.
            </span>
          </div>
        </Card>

        {result && (
          <Card
            className={`p-6 border-2 ${
              result.success
                ? 'border-green-300 bg-green-50/40'
                : 'border-red-300 bg-red-50/40'
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              {result.success ? (
                <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold">
                  {result.success ? 'Email sent successfully' : 'Send failed'}
                </h3>
                {result.success && result.recipient && (
                  <p className="text-sm text-gray-700">
                    Delivered to <strong>{result.recipient}</strong>
                    {result.fromUsed && (
                      <>
                        {' '}from <code className="text-xs">{result.fromUsed}</code>
                      </>
                    )}
                  </p>
                )}
                {result.emailId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Resend ID: <code>{result.emailId}</code>
                  </p>
                )}
                {result.emailError && (
                  <p className="text-sm text-red-700 mt-1">
                    Error: {result.emailError}
                  </p>
                )}
                {result.error && (
                  <p className="text-sm text-red-700 mt-1">{result.error}</p>
                )}
              </div>
            </div>

            {result.decision && (
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-white border">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Decision</p>
                  <p className="text-sm mt-1">
                    {result.decision.willAttach ? (
                      <span className="text-green-700 font-semibold">
                        ✓ Attached {result.decision.attachableFiles} file(s) inline
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">
                        Download links only (no attachments)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Total payload: {result.decision.totalAttachablePretty} of{' '}
                    {result.decision.totalBudgetPretty} budget
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Limits</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Per-file cap: {result.decision.perFileCapPretty}
                  </p>
                  <p className="text-xs text-gray-700">
                    Total cap: {result.decision.totalBudgetPretty}
                  </p>
                </div>
                {result.decision.skippedReason && (
                  <div className="md:col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                    {result.decision.skippedReason}
                  </div>
                )}
                {result.decision.retryNote && (
                  <div className="md:col-span-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
                    {result.decision.retryNote}
                  </div>
                )}
              </div>
            )}

            {result.files && result.files.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Files generated
                </p>
                <div className="space-y-1">
                  {result.files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded bg-white border text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{f.filename}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-gray-600">{f.sizePretty}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            f.attachable
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {f.attachable ? 'attachable' : 'link-only'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success && (
              <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
                <p className="font-semibold mb-1">Now check your inbox:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Open Outlook and find the <code>[DIAG]</code> subject line.</li>
                  <li>Verify only ONE email arrived (not split into multiple parts).</li>
                  <li>Confirm attachments + download links both appear in the same message.</li>
                  <li>Check that the email did not land in Junk / Clutter / Other.</li>
                </ol>
              </div>
            )}
          </Card>
        )}

        {result && (
          <details className="mt-6">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Raw response JSON
            </summary>
            <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}

        {/* ── SMS DIAGNOSTIC ──────────────────────────────────────── */}
        <Card className="p-6 mt-10 border-2 border-blue-200 bg-blue-50/30">
          <div className="flex items-start gap-3 mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Twilio SMS deliverability test
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Fires the <code className="text-xs">send-sms-notification</code> edge
                function directly with a custom message, so you can confirm Twilio
                credentials are configured without having to trigger a real booking.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Label htmlFor="smsMessage">Message</Label>
              <Textarea
                id="smsMessage"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your test SMS message…"
                rows={3}
                className="mt-1 font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Standard SMS segments are 160 chars (GSM-7) or 70 chars (Unicode).
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {smsMessage.length} chars
                </p>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="smsTo">
                Send to (optional override)
              </Label>
              <Input
                id="smsTo"
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                placeholder="+64272670217 — leave blank to use the configured admin number"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to send to the <code>SMS_TO_NUMBER</code> secret
                (defaults to <code>+64272670217</code>). Use full E.164 format if
                overriding.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              onClick={sendTestSms}
              disabled={smsLoading || !smsMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {smsLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending SMS…
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" /> Send me a test SMS
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() =>
                setSmsMessage(
                  'Test SMS from NZ Utility Detection admin diagnostics — Twilio is wired up correctly.'
                )
              }
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reset message
            </button>
            {smsResult && (
              <span className="text-xs text-gray-500 font-mono">
                Last attempt: {new Date(smsResult.sentAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {smsResult && (
            <div
              className={`mt-5 rounded-lg border-2 p-4 ${
                smsResult.ok
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2 mb-3">
                {smsResult.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {smsResult.ok
                      ? 'Edge function returned success — check your phone.'
                      : 'SMS send failed — see response below.'}
                  </p>
                  {smsResult.error && (
                    <p className="text-xs text-red-700 mt-1">
                      Invocation error: {smsResult.error}
                    </p>
                  )}
                  {!smsResult.ok && !smsResult.error && (() => {
                    const d = smsResult.data as
                      | { error?: string; hint?: string; missing?: string; skipped?: boolean; code?: number; status?: number }
                      | null;
                    if (!d || typeof d !== 'object') {
                      return (
                        <p className="text-xs text-red-700 mt-1">
                          The function returned <code>ok: false</code> with no diagnostic payload.
                        </p>
                      );
                    }
                    if (d.skipped && d.missing) {
                      return (
                        <p className="text-xs text-red-700 mt-1">
                          Twilio secrets missing: <code>{d.missing}</code>. Add them in
                          Supabase → Project Settings → Edge Functions, then retry.
                        </p>
                      );
                    }
                    return (
                      <div className="mt-1 space-y-2">
                        {d.error && (
                          <p className="text-xs text-red-800">
                            <span className="font-semibold">Error:</span> {d.error}
                          </p>
                        )}
                        {d.hint && (
                          <div className="text-xs text-red-900 bg-red-100 border border-red-200 rounded px-2 py-1.5">
                            <span className="font-semibold">How to fix:</span> {d.hint}
                          </div>
                        )}
                        {d.code !== undefined && (
                          <p className="text-[11px] text-red-700 font-mono">
                            Twilio code {d.code}
                            {d.status ? ` · HTTP ${d.status}` : ''}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                </div>
              </div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Raw JSON response
              </p>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto max-h-72">
                {JSON.stringify(smsResult.data, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
