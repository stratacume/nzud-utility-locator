import React from 'react';
import { Calendar, User, Mail, Phone, MapPin, Tag, Clock } from 'lucide-react';

export interface UploadedDocument {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  // category — distinguishes customer-uploaded files from NZUD-uploaded
  // completed-locate documents. Optional for backwards compatibility:
  // legacy rows without this field are treated as 'customer'.
  category?: 'customer' | 'completed';
  uploaded_at?: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  service: string;
  booking_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_address: string;
  status: string;
  created_at: string;
  job_details?: string;
  documents?: UploadedDocument[];
  completed_documents?: UploadedDocument[];
  reminder_sent?: boolean;

  // Xero integration fields — populated by the create-xero-invoice edge function.
  xero_contact_id?: string | null;
  xero_invoice_id?: string | null;
  xero_invoice_number?: string | null;
  xero_status?: string | null;
  xero_created_at?: string | null;
}



interface BookingDetailsProps {
  booking: Booking;
  onCancel: () => void;
  onReschedule: () => void;
  onBack: () => void;
  isCancelling: boolean;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ booking, onCancel, onReschedule, onBack, isCancelling }) => {
  const bookingDate = new Date(booking.booking_date);
  const isFuture = bookingDate > new Date();
  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    rescheduled: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-brand-navy">Booking Details</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
          {booking.status}
        </span>
      </div>

      <div className="bg-brand-orange/10 rounded-lg p-4 mb-6 text-center">
        <p className="text-sm text-gray-600">Booking Reference</p>
        <p className="text-2xl font-bold text-brand-orange">{booking.booking_reference}</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <Tag className="w-5 h-5 text-brand-teal mt-0.5" />
          <div><p className="text-sm text-gray-500">Service</p><p className="font-semibold text-brand-navy">{booking.service}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-brand-teal mt-0.5" />
          <div><p className="text-sm text-gray-500">Date</p><p className="font-semibold text-brand-navy">{bookingDate.toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-brand-teal mt-0.5" />
          <div><p className="text-sm text-gray-500">Name</p><p className="font-semibold text-brand-navy">{booking.customer_name}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-brand-teal mt-0.5" />
          <div><p className="text-sm text-gray-500">Email</p><p className="font-semibold text-brand-navy">{booking.customer_email}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="w-5 h-5 text-brand-teal mt-0.5" />
          <div><p className="text-sm text-gray-500">Phone</p><p className="font-semibold text-brand-navy">{booking.customer_phone}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-brand-teal mt-0.5" />
          <div><p className="text-sm text-gray-500">Address</p><p className="font-semibold text-brand-navy">{booking.service_address}</p></div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isFuture && booking.status === 'confirmed' && (
          <>
            <button onClick={onReschedule} className="w-full py-3 rounded-lg font-semibold bg-brand-navy hover:bg-brand-teal text-white transition-colors">Reschedule</button>
            <button onClick={onCancel} disabled={isCancelling} className="w-full py-3 rounded-lg font-semibold border-2 border-red-500 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
              {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          </>
        )}
        <button onClick={onBack} className="w-full py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Back to Search</button>
      </div>
    </div>
  );
};

export default BookingDetails;
