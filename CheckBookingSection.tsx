import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import BookingLookup from './booking/BookingLookup';
import BookingDetails, { Booking } from './booking/BookingDetails';
import BookingList from './booking/BookingList';
import RescheduleCalendar from './booking/RescheduleCalendar';
import { sendBookingCancellationEmail, sendBookingRescheduleEmail } from '@/lib/emailService';
import { User } from 'lucide-react';

type View = 'search' | 'list' | 'details' | 'reschedule';

const CheckBookingSection: React.FC = () => {
  const [view, setView] = useState<View>('search');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (query: string, type: 'reference' | 'email') => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const column = type === 'reference' ? 'booking_reference' : 'customer_email';
      const { data, error: err } = await supabase.from('bookings').select('*').ilike(column, type === 'reference' ? query : `%${query}%`).order('booking_date', { ascending: false });
      if (err) throw err;
      if (!data || data.length === 0) { setError('No bookings found.'); return; }
      if (data.length === 1) { setSelectedBooking(data[0]); setView('details'); }
      else { setBookings(data); setView('list'); }
    } catch (err: any) { setError(err.message || 'Failed to search.'); }
    finally { setIsLoading(false); }
  };

  const handleSelectBooking = (booking: Booking) => { setSelectedBooking(booking); setView('details'); };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    setIsCancelling(true);
    try {
      const { error: err } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', selectedBooking.id);
      if (err) throw err;
      setSelectedBooking({ ...selectedBooking, status: 'cancelled' });
      setSuccessMsg('Booking cancelled successfully.');
      sendBookingCancellationEmail({
        customerEmail: selectedBooking.customer_email,
        customerName: selectedBooking.customer_name,
        bookingReference: selectedBooking.booking_reference,
        service: selectedBooking.service,
        bookingDate: selectedBooking.booking_date,
        serviceAddress: selectedBooking.service_address,
        customerPhone: selectedBooking.customer_phone
      });
    } catch (err: any) { setError(err.message || 'Failed to cancel.'); }
    finally { setIsCancelling(false); }
  };

  const handleReschedule = async (newDate: Date) => {
    if (!selectedBooking) return;
    setIsUpdating(true);
    const newDateStr = newDate.toISOString().split('T')[0];
    try {
      const { error: err } = await supabase.from('bookings').update({ booking_date: newDateStr, status: 'confirmed' }).eq('id', selectedBooking.id);
      if (err) throw err;
      sendBookingRescheduleEmail({
        customerEmail: selectedBooking.customer_email,
        customerName: selectedBooking.customer_name,
        bookingReference: selectedBooking.booking_reference,
        service: selectedBooking.service,
        bookingDate: selectedBooking.booking_date,
        serviceAddress: selectedBooking.service_address,
        customerPhone: selectedBooking.customer_phone
      }, newDateStr);
      setSelectedBooking({ ...selectedBooking, booking_date: newDateStr });
      setSuccessMsg('Booking rescheduled successfully!');
      setView('details');
    } catch (err: any) { setError(err.message || 'Failed to reschedule.'); }
    finally { setIsUpdating(false); }
  };

  const handleBack = () => { setView('search'); setSelectedBooking(null); setBookings([]); setError(''); setSuccessMsg(''); };
  const handleBackToList = () => { if (bookings.length > 1) setView('list'); else handleBack(); };

  return (
    <section id="check-booking" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-brand-navy mb-2">Check My Booking</h2>
          <p className="text-gray-600">Look up, reschedule, or cancel your booking</p>
        </div>
        <div className="max-w-md mx-auto">
          {successMsg && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-center">{successMsg}</div>}
          {view === 'search' && (
            <>
              <BookingLookup onSearch={handleSearch} isLoading={isLoading} error={error} />
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm mb-3">Returning customer?</p>
                <button
                  onClick={() => navigate('/portal')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy hover:bg-brand-teal text-white font-semibold rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  Access Customer Portal
                </button>
                <p className="text-xs text-gray-400 mt-2">View all bookings, download documents & more</p>
              </div>
            </>
          )}
          {view === 'list' && <BookingList bookings={bookings} onSelect={handleSelectBooking} onBack={handleBack} />}
          {view === 'details' && selectedBooking && <BookingDetails booking={selectedBooking} onCancel={handleCancel} onReschedule={() => setView('reschedule')} onBack={handleBackToList} isCancelling={isCancelling} />}
          {view === 'reschedule' && selectedBooking && <RescheduleCalendar currentDate={selectedBooking.booking_date} onConfirm={handleReschedule} onBack={() => setView('details')} isUpdating={isUpdating} />}
        </div>
      </div>
    </section>
  );
};

export default CheckBookingSection;
