import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileSpreadsheet, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Booking } from '@/components/booking/BookingDetails';

interface Props {
  booking: Booking;
  onUpdated: (updates: Partial<Booking>) => void;
  /** Default unit amount to send to Xero. Operator can edit before submit. */
  defaultUnitAmount?: number;
}

/**
 * Per-booking Xero action button.
 *
 * - If booking already has xero_invoice_id → renders an "Open in Xero" link
 *   plus a status badge ("Invoice already created.")
 * - Otherwise → renders a "Create Xero Invoice" button. When clicked it
 *   prompts for the unit amount (defaulting to defaultUnitAmount), invokes
 *   the create-xero-invoice edge function, and on success calls onUpdated
 *   so the parent table can update its row state.
 */
const XeroInvoiceButton: React.FC<Props> = ({ booking, onUpdated, defaultUnitAmount = 0 }) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const hasInvoice = !!booking.xero_invoice_id;
  const deepLink = booking.xero_invoice_id
    ? `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${booking.xero_invoice_id}`
    : '';

  const handleCreate = async () => {
    const promptVal = window.prompt(
      `Create a draft invoice in Xero for booking ${booking.booking_reference}.\n` +
        `Enter the unit amount (NZD, GST exclusive):`,
      String(defaultUnitAmount || 0),
    );
    if (promptVal === null) return; // cancelled
    const unitAmount = Number(promptVal);
    if (!isFinite(unitAmount) || unitAmount < 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a positive number.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-xero-invoice', {
        body: { booking_id: booking.id, unit_amount: unitAmount },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Unknown error');

      if (data.alreadyCreated) {
        toast({ title: 'Invoice already created', description: 'This booking already has a Xero invoice.' });
      } else {
        toast({
          title: 'Draft invoice created',
          description: `${data.invoiceNumber || data.invoiceId} — ${data.status} in Xero`,
        });
      }

      onUpdated({
        xero_contact_id: data.contactId,
        xero_invoice_id: data.invoiceId,
        xero_invoice_number: data.invoiceNumber,
        xero_status: data.status,
        xero_created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      toast({ title: 'Could not create Xero invoice', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  if (hasInvoice) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
          <CheckCircle2 className="w-3 h-3" />
          {booking.xero_invoice_number || 'Draft'}
        </span>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs hover:bg-blue-50 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Open in Xero
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors disabled:opacity-60"
    >
      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
      <span>{isCreating ? 'Creating…' : 'Create Xero Invoice'}</span>
    </button>
  );
};

export default XeroInvoiceButton;
