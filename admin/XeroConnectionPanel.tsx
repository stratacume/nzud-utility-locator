import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle, Plug, ExternalLink, RefreshCw } from 'lucide-react';

interface XeroTokenRow {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  token_expiry: string | null;
  connected_at: string | null;
  updated_at: string | null;
}

/**
 * Admin-only panel showing Xero connection status with a Connect / Reconnect
 * button. Tokens are stored server-side in the xero_tokens table; this
 * component only reads metadata (tenant name, expiry) — never the access
 * token itself.
 */
const XeroConnectionPanel: React.FC = () => {
  const { toast } = useToast();
  const [row, setRow] = useState<XeroTokenRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('xero_tokens')
        .select('id, tenant_id, tenant_name, token_expiry, connected_at, updated_at')
        .eq('id', 'default')
        .maybeSingle();
      if (error) throw error;
      setRow(data || null);
    } catch (err: any) {
      console.warn('[XeroConnectionPanel] status fetch failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Show a toast if the OAuth callback redirected back with a result
    const params = new URLSearchParams(window.location.search);
    const xero = params.get('xero');
    if (xero === 'connected') {
      const tenant = params.get('tenant') || '';
      toast({ title: 'Xero connected', description: tenant ? `Linked to ${tenant}` : 'Connection saved.' });
      // strip query params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (xero === 'error') {
      const message = params.get('message') || 'Unknown error';
      toast({ title: 'Xero connection failed', description: message, variant: 'destructive' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('xero-auth-start', { body: {} });
      if (error) throw error;
      if (!data?.url) throw new Error('No authorize URL returned');
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: 'Could not start Xero connection', description: err.message, variant: 'destructive' });
      setIsConnecting(false);
    }
  };

  const isConnected = !!row?.tenant_id;
  const expiryDate = row?.token_expiry ? new Date(row.token_expiry) : null;
  const isExpired = expiryDate ? expiryDate.getTime() < Date.now() : false;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy">Xero Integration</h3>
            <p className="text-sm text-gray-500">
              Automatically create draft invoices in Xero when a booking is made.
            </p>
            {isLoading ? (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking status…
              </p>
            ) : isConnected ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
                {row?.tenant_name && <span className="text-gray-600">{row.tenant_name}</span>}
                {expiryDate && (
                  <span className={`text-gray-400 ${isExpired ? 'text-orange-600' : ''}`}>
                    Token {isExpired ? 'expired' : 'valid until'}{' '}
                    {expiryDate.toLocaleString('en-NZ', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">
                <AlertCircle className="w-3 h-3" /> Not connected
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>{isConnected ? 'Reconnect Xero' : 'Connect Xero'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default XeroConnectionPanel;
