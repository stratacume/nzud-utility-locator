import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface AdminStatusBadgeProps {
  status: string;
  onStatusChange: (newStatus: string) => void;
  isUpdating: boolean;
}

const statusOptions = ['confirmed', 'completed', 'cancelled'];

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  rescheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pending: 'bg-gray-100 text-gray-700 border-gray-200'
};

const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({ status, onStatusChange, isUpdating }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (newStatus: string) => {
    if (newStatus !== status) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize border ${statusColors[status] || statusColors.pending} hover:opacity-80 transition-opacity disabled:opacity-50`}
      >
        {isUpdating ? 'Updating...' : status}
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between capitalize"
              >
                {option}
                {option === status && <Check className="w-4 h-4 text-green-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatusBadge;
