import React from 'react';
import { BookingProvider, useBooking } from '../contexts/BookingContext';
import BookingSteps from './booking/BookingSteps';
import BookingServiceSelect from './booking/BookingServiceSelect';
import BookingDatePicker from './booking/BookingDatePicker';
import BookingDetails from './booking/BookingDetails';
import BookingConfirmation from './booking/BookingConfirmation';

const BookingContent: React.FC = () => {
  const { step, bookingData } = useBooking();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {!bookingData.confirmationId && <BookingSteps />}
      {step === 1 && <BookingServiceSelect />}
      {step === 2 && <BookingDatePicker />}
      {step === 3 && <BookingDetails />}
      {(step === 4 || step === 5) && <BookingConfirmation />}
    </div>
  );
};

const BookingSection: React.FC = () => {
  return (
    <section id="booking" className="py-16 bg-brand-teal">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Book Your Service</h2>
          <p className="text-white/90">Schedule online in minutes</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <BookingProvider>
            <BookingContent />
          </BookingProvider>
        </div>

        <p className="mt-8 text-center text-white/80 text-sm">
          Need help? <a href="tel:0272670217" className="text-brand-orange font-semibold">027 267 0217</a>
        </p>
      </div>
    </section>
  );
};

export default BookingSection;
