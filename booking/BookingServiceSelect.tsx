import React from 'react';
import { useBooking } from '../../contexts/BookingContext';

const services = [
  { id: 'emf-locating', name: 'EMF Utility Locating', price: 'From $250' },
  { id: 'pre-excavation', name: 'Pre-Excavation Check', price: 'From $350' },
  { id: 'as-built', name: 'As-Built Mapping', price: 'From $300' },
];


const BookingServiceSelect: React.FC = () => {
  const { state, dispatch } = useBooking();

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-brand-navy mb-4 text-center">Select Service</h3>
      <div className="grid grid-cols-2 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => dispatch({ type: 'SET_SERVICE', payload: service.id })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              state.selectedService === service.id
                ? 'border-brand-orange bg-brand-orange/10'
                : 'border-gray-200 hover:border-brand-teal'
            }`}
          >
            <div className="flex flex-col">
              <span className="font-medium text-brand-navy">{service.name}</span>
              <span className="text-brand-orange font-semibold text-sm mt-1">{service.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BookingServiceSelect;
