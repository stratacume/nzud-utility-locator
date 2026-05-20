import React from 'react';
import { useBooking } from '../../contexts/BookingContext';

const serviceNames: Record<string, string> = {
  'emf-locating': 'EMF Utility Locating',
  'pre-excavation': 'Pre-Excavation Check',
  'as-built': 'As-Built Mapping',
  'comprehensive': 'Comprehensive Survey',
};

const BookingConfirmation: React.FC = () => {
  const { state } = useBooking();

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-brand-navy mb-4">Booking Confirmation</h3>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-green-800">Booking Request Submitted</h4>
        </div>
        
        <div className="space-y-2 text-gray-700">
          <p><strong>Service:</strong> {serviceNames[state.selectedService || ''] || 'Not selected'}</p>
          <p><strong>Date:</strong> {state.selectedDate?.toLocaleDateString('en-NZ', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <p><strong>Name:</strong> {state.name}</p>
          <p><strong>Email:</strong> {state.email}</p>
          <p><strong>Phone:</strong> {state.phone}</p>
          {state.address && <p><strong>Address:</strong> {state.address}</p>}
        </div>
        
        <p className="mt-4 text-sm text-gray-600">
          We'll be in touch within 24 hours to confirm your booking.
        </p>
      </div>
    </div>
  );
};

export default BookingConfirmation;
