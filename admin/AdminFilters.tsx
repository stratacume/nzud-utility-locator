import React from 'react';
import { Search, X, Archive, ArchiveRestore } from 'lucide-react';

interface AdminFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
  services: string[];
  /**
   * Archive view toggle. When false (default), the dashboard hides
   * bookings with archived_at set. When true, the dashboard shows
   * ONLY archived bookings so operators can review historic jobs.
   * Optional so any other caller of <AdminFilters /> keeps working.
   */
  viewArchived?: boolean;
  onToggleArchived?: (next: boolean) => void;
}

const AdminFilters: React.FC<AdminFiltersProps> = ({
  searchQuery, onSearchChange, serviceFilter, onServiceFilterChange,
  statusFilter, onStatusFilterChange, dateFrom, dateTo,
  onDateFromChange, onDateToChange, onClearFilters, services,
  viewArchived = false, onToggleArchived,
}) => {
  const hasFilters = searchQuery || serviceFilter || statusFilter || dateFrom || dateTo;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, reference..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
            />
          </div>
        </div>
        <select value={serviceFilter} onChange={(e) => onServiceFilterChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange">
          <option value="">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange">
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange" placeholder="From" />
        <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange" placeholder="To" />
        {onToggleArchived && (
          <button
            type="button"
            onClick={() => onToggleArchived(!viewArchived)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
              viewArchived
                ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title={viewArchived ? 'Showing archived jobs — click to return to the active list' : 'Show archived jobs only'}
          >
            {viewArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            {viewArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
        )}
        {hasFilters && (
          <button onClick={onClearFilters} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminFilters;
