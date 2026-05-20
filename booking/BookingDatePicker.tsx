import React, { useState } from 'react';
import { useBooking } from '../../contexts/BookingContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const timeSlots = ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM'];

const BookingDatePicker: React.FC = () => {
  const { bookingData, updateBooking, setStep } = useBooking();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return { firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate(), year, month };
  };

  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const isAvailable = (day: number) => {
    const date = new Date(year, month, day);
    return date >= today && date.getDay() !== 0 && date.getDay() !== 6;
  };

  const isSelected = (day: number) => bookingData.date?.getDate() === day && bookingData.date?.getMonth() === month;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div>
      <h3 className="text-xl font-bold text-brand-navy mb-4 text-center">Select Date & Time</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-sm">{months[month]} {year}</span>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              return (
                <button key={day} onClick={() => isAvailable(day) && updateBooking({ date: new Date(year, month, day), time: '' })} disabled={!isAvailable(day)}
                  className={`p-1.5 text-xs rounded ${isSelected(day) ? 'bg-brand-orange text-white' : isAvailable(day) ? 'hover:bg-gray-100' : 'text-gray-300'}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border rounded-lg p-3">
          <p className="font-semibold text-sm mb-2">Time</p>
          {bookingData.date ? (
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map(time => (
                <button key={time} onClick={() => updateBooking({ time })}
                  className={`py-2 text-sm rounded-lg ${bookingData.time === time ? 'bg-brand-orange text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {time}
                </button>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-4">Select a date</p>}
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={() => setStep(1)} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium">Back</button>
        <button onClick={() => setStep(3)} disabled={!bookingData.date || !bookingData.time}
          className="flex-1 py-2 bg-brand-orange hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium">Continue</button>
      </div>
    </div>
  );
};

export default BookingDatePicker;
