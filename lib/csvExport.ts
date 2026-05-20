import { Booking } from '@/components/booking/BookingDetails';

export interface ExportOptions {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  service?: string;
}

export const formatBookingForCSV = (booking: Booking): Record<string, string> => {
  return {
    'Reference': booking.booking_reference,
    'Service': booking.service,
    'Date': new Date(booking.booking_date).toLocaleDateString('en-NZ'),
    'Customer Name': booking.customer_name,
    'Email': booking.customer_email,
    'Phone': booking.customer_phone,
    'Address': booking.service_address,
    'Status': booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
    'Created': new Date(booking.created_at).toLocaleDateString('en-NZ')
  };
};

export const generateCSV = (bookings: Booking[]): string => {
  if (bookings.length === 0) return '';
  
  const formattedBookings = bookings.map(formatBookingForCSV);
  const headers = Object.keys(formattedBookings[0]);
  
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = formattedBookings.map(row => 
    headers.map(header => escapeCSV(row[header] || '')).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
};

export const downloadCSV = (bookings: Booking[], filename?: string): void => {
  const csv = generateCSV(bookings);
  
  if (!csv) {
    alert('No data to export');
    return;
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const date = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = filename || `bookings-export-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateExportFilename = (options: ExportOptions): string => {
  const parts = ['bookings'];
  
  if (options.status) parts.push(options.status);
  if (options.service) parts.push(options.service.toLowerCase().replace(/\s+/g, '-'));
  if (options.dateFrom) parts.push(`from-${options.dateFrom}`);
  if (options.dateTo) parts.push(`to-${options.dateTo}`);
  
  parts.push(new Date().toISOString().split('T')[0]);
  
  return `${parts.join('-')}.csv`;
};
