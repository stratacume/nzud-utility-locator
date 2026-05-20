import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BookingData {
  service: string;
  date: Date | null;
  time: string;
  address: string;
  suburb: string;
  city: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  confirmationId: string;
}

interface BookingContextType {
  step: number;
  setStep: (step: number) => void;
  bookingData: BookingData;
  updateBooking: (data: Partial<BookingData>) => void;
  resetBooking: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

const initialBooking: BookingData = {
  service: '',
  date: null,
  time: '',
  address: '',
  suburb: '',
  city: '',
  name: '',
  email: '',
  phone: '',
  notes: '',
  confirmationId: '',
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>(() => {
    // Apply any one-shot prefill from the customer portal ("Request new locate").
    // Stored under 'nzud_prefill' as a JSON Partial<BookingData>. Consumed once,
    // then cleared so refreshes don't keep re-prefilling.
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem('nzud_prefill');
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<BookingData>;
          window.sessionStorage.removeItem('nzud_prefill');
          return { ...initialBooking, ...parsed, date: null, confirmationId: '' };
        }
      } catch {
        // Ignore malformed prefill payloads — fall back to a clean form.
      }
    }
    return initialBooking;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateBooking = (data: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const resetBooking = () => {
    setBookingData(initialBooking);
    setStep(1);
  };

  return (
    <BookingContext.Provider value={{ step, setStep, bookingData, updateBooking, resetBooking, isSubmitting, setIsSubmitting }}>
      {children}
    </BookingContext.Provider>
  );
};


export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within BookingProvider');
  return context;
};
