import React from 'react';
import { Calendar, MapPin, FileText, ChevronRight, Bell, ClipboardCheck, Hash } from 'lucide-react';
import { Booking } from '@/components/booking/BookingDetails';

interface PortalBookingCardProps {
  booking: Booking;
  onSelect: (booking: Booking) => void;
  /** Document counts from the `booking_documents` table — reflects only
   *  permanently saved records, never temporary frontend state. */
  documentCount?: number;
  reportCount?: number;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  rescheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-brand-teal/10 text-brand-teal border-brand-teal/20',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const PortalBookingCard: React.FC<PortalBookingCardProps> = ({
  booking, onSelect, documentCount = 0, reportCount = 0,
}) => {
  const bookingDate = new Date(booking.booking_date);
  const isPast = bookingDate < new Date();
  const isToday = bookingDate.toDateString() === new Date().toDateString();

  const totalDocs = documentCount + reportCount;
  const hasReport = reportCount > 0;

  const statusKey = (booking.status || '').toLowerCase().replace(/\s+/g, '_');
  const statusClass = STATUS_STYLE[statusKey] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <button
      onClick={() => onSelect(booking)}
      className="w-full max-w-full text-left bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-md hover:border-brand-orange/40 transition-all group overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1 truncate">
            <Hash className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{booking.booking_reference}</span>
          </p>
          <h3 className="font-semibold text-brand-navy truncate mt-0.5">{booking.service}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border whitespace-nowrap ${statusClass} flex-shrink-0`}>
          {booking.status?.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-brand-teal flex-shrink-0" />
          <span className={`truncate ${isToday ? 'text-brand-orange font-semibold' : ''}`}>
            {isToday
              ? 'Today'
              : bookingDate.toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {isPast && !isToday && <span className="text-xs text-gray-400 flex-shrink-0">· Past</span>}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-brand-teal flex-shrink-0" />
          <span className="truncate">{booking.service_address}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {totalDocs > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              <FileText className="w-3 h-3" /> {totalDocs} doc{totalDocs > 1 ? 's' : ''}
            </span>
          )}
          {hasReport && (
            <span className="flex items-center gap-1 text-[11px] text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              <ClipboardCheck className="w-3 h-3" /> Report ready
            </span>
          )}
          {!isPast && booking.reminder_sent && (
            <span className="flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              <Bell className="w-3 h-3" /> Reminder sent
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-500 group-hover:text-brand-orange transition-colors font-medium whitespace-nowrap flex-shrink-0 ml-auto">
          View job <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
};

export default PortalBookingCard;
