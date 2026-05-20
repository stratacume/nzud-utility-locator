import React, { useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Booking } from '@/components/booking/BookingDetails';
import { downloadCSV, generateExportFilename, ExportOptions } from '@/lib/csvExport';

interface ExportButtonProps {
  bookings: Booking[];
  allBookings: Booking[];
  filterOptions: ExportOptions;
}

const ExportButton: React.FC<ExportButtonProps> = ({ bookings, allBookings, filterOptions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'filtered' | 'all') => {
    setIsExporting(true);
    try {
      const dataToExport = type === 'filtered' ? bookings : allBookings;
      const filename = type === 'filtered' 
        ? generateExportFilename(filterOptions)
        : `all-bookings-${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(dataToExport, filename);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
        Export CSV
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
              <p className="text-sm font-medium text-gray-700">Export Options</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => handleExport('filtered')}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-800">Export Filtered</p>
                  <p className="text-xs text-gray-500">{bookings.length} bookings</p>
                </div>
              </button>
              <button
                onClick={() => handleExport('all')}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-800">Export All</p>
                  <p className="text-xs text-gray-500">{allBookings.length} bookings</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
