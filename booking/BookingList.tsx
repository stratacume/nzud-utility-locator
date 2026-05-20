import React from 'react';
import { Booking } from './BookingDetails';
import { Calendar, Tag, ChevronRight } from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
  onSelect: (booking: Booking) => void;
  onBack: () => void;
}

const BookingList: React.FC<BookingListProps> = ({ bookings, onSelect, onBack }) => {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    rescheduled: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-brand-navy text-center mb-2">Your Bookings</h3>
      <p className="text-gray-600 text-center text-sm mb-6">Found {bookings.length} booking{bookings.length > 1 ? 's' : ''}</p>

      <div className="space-y-3 mb-6">
        {bookings.map((booking) => {
          const bookingDate = new Date(booking.booking_date);
          return (
            <button
              key={booking.id}
              onClick={() => onSelect(booking)}
              className="w-full p-4 border-2 border-gray-200 rounded-lg text-left hover:border-brand-orange hover:bg-orange-50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-brand-orange">{booking.booking_reference}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                  {booking.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Tag className="w-4 h-4 text-brand-teal" />
                <span>{booking.service}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-brand-teal" />
                  <span>{bookingDate.toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-orange transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="w-full py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Back to Search
      </button>
    </div>
  );
};

export default BookingList;
