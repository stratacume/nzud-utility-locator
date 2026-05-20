import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Paperclip, Bell, BellOff, Eye, FileSpreadsheet } from 'lucide-react';
import AdminStatusBadge from './AdminStatusBadge';
import DocumentsModal from './DocumentsModal';
import AdminBookingDetailModal from './AdminBookingDetailModal';
import ArchiveRowButton from './ArchiveRowButton';
import { Booking } from '@/components/booking/BookingDetails';

interface AdminBookingsTableProps {
  bookings: Booking[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onStatusChange: (id: string, status: string) => void;
  updatingId: string | null;
  /** Called when the detail modal updates a booking — lets the parent
   *  refresh its in-memory list without a full refetch. */
  onBookingUpdated?: (id: string, updates: Partial<Booking>) => void;
  /** Called after a single-row archive succeeds so the parent can drop
   *  the row out of the active view. */
  onRowArchived?: (id: string, archivedAtIso: string) => void;
  /** When true the per-row Archive action is hidden (we're viewing
   *  already-archived rows, so re-archiving is a no-op). */
  hideArchiveAction?: boolean;
}

const AdminBookingsTable: React.FC<AdminBookingsTableProps> = ({
  bookings, sortField, sortDirection, onSort, onStatusChange, updatingId,
  onBookingUpdated, onRowArchived, hideArchiveAction,
}) => {
  const [docsBooking, setDocsBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-brand-orange" /> : <ArrowDown className="w-4 h-4 text-brand-orange" />;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
  const hasDocuments = (booking: Booking) => (booking.documents && booking.documents.length > 0) || (booking.completed_documents && booking.completed_documents.length > 0);
  const docCount = (booking: Booking) => (booking.documents?.length || 0) + (booking.completed_documents?.length || 0);
  const isUpcoming = (dateStr: string) => new Date(dateStr) > new Date();

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg">No bookings found matching your criteria</p>
      </div>
    );
  }

  const handleDetailUpdated = (updates: Partial<Booking>) => {
    if (!detailBooking) return;
    const merged = { ...detailBooking, ...updates };
    setDetailBooking(merged);
    onBookingUpdated?.(detailBooking.id, updates);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left"><button onClick={() => onSort('booking_reference')} className="flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-orange">Reference <SortIcon field="booking_reference" /></button></th>
                <th className="px-4 py-3 text-left"><button onClick={() => onSort('customer_name')} className="flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-orange">Customer <SortIcon field="customer_name" /></button></th>
                <th className="px-4 py-3 text-left"><button onClick={() => onSort('service')} className="flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-orange">Service <SortIcon field="service" /></button></th>
                <th className="px-4 py-3 text-left"><button onClick={() => onSort('booking_date')} className="flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-orange">Date <SortIcon field="booking_date" /></button></th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Docs</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700" title="Reminder Status">Reminder</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700" title="Xero Invoice">Xero</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-brand-orange font-semibold whitespace-nowrap">{booking.booking_reference}</td>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{booking.customer_name}</div><div className="text-sm text-gray-500 truncate max-w-[200px]">{booking.service_address}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{booking.service}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(booking.booking_date)}</td>
                  <td className="px-4 py-3"><div className="text-sm text-gray-700">{booking.customer_email}</div><div className="text-sm text-gray-500">{booking.customer_phone}</div></td>
                  <td className="px-4 py-3 text-center">
                    {hasDocuments(booking) ? (
                      <button onClick={() => setDocsBooking(booking)} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-teal/10 text-brand-teal rounded-lg hover:bg-brand-teal/20 transition-colors" title={`${docCount(booking)} document(s)`}>
                        <Paperclip className="w-4 h-4" /><span className="text-xs font-medium">{docCount(booking)}</span>
                      </button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isUpcoming(booking.booking_date) ? (
                      booking.reminder_sent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs" title="Reminder sent"><Bell className="w-3 h-3" /> Sent</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs" title="Reminder pending"><BellOff className="w-3 h-3" /> Pending</span>
                      )
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {booking.xero_invoice_id ? (
                      <a
                        href={`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${booking.xero_invoice_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs"
                        title={`Invoice ${booking.xero_invoice_number || ''} (${booking.xero_status || 'DRAFT'})`}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        {booking.xero_invoice_number || 'Draft'}
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><AdminStatusBadge status={booking.status} onStatusChange={(s) => onStatusChange(booking.id, s)} isUpdating={updatingId === booking.id} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setDetailBooking(booking)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-brand-navy text-white hover:bg-brand-teal text-xs"
                        title="Open booking details"
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      {!hideArchiveAction && onRowArchived && (
                        <ArchiveRowButton
                          booking={booking}
                          onArchived={onRowArchived}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {docsBooking && (
        <DocumentsModal
          isOpen={!!docsBooking}
          onClose={() => setDocsBooking(null)}
          documents={[
            ...(docsBooking.documents || []),
            ...(docsBooking.completed_documents || []),
          ]}
          bookingRef={docsBooking.booking_reference}
        />
      )}
      {detailBooking && (
        <AdminBookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onUpdated={handleDetailUpdated}
        />
      )}
    </>
  );
};

export default AdminBookingsTable;
