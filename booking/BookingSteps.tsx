import React from 'react';
import { useBooking } from '../../contexts/BookingContext';
import { Check } from 'lucide-react';

const steps = [
  { num: 1, label: 'Service' },
  { num: 2, label: 'Date & Time' },
  { num: 3, label: 'Details' },
  { num: 4, label: 'Confirm' },
];

const BookingSteps: React.FC = () => {
  const { step } = useBooking();

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((s, idx) => (
        <React.Fragment key={s.num}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step > s.num
                  ? 'bg-green-500 text-white'
                  : step === s.num
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-gray-400'
              }`}
            >
              {step > s.num ? <Check className="w-5 h-5" /> : s.num}
            </div>
            <span className={`text-xs mt-1 ${step >= s.num ? 'text-white' : 'text-gray-500'}`}>
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-12 md:w-20 h-1 mx-2 rounded ${
                step > s.num ? 'bg-green-500' : 'bg-slate-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default BookingSteps;
