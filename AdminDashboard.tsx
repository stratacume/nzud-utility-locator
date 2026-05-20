import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/components/booking/BookingDetails';
import AdminFilters from '@/components/admin/AdminFilters';
import AdminBookingsTable from '@/components/admin/AdminBookingsTable';
import ExportButton from '@/components/admin/ExportButton';
import XeroConnectionPanel from '@/components/admin/XeroConnectionPanel';
import EmailOutboxPanel from '@/components/admin/EmailOutboxPanel';
import { LayoutDashboard, RefreshCw, ArrowLeft, LogOut, Mail, Image as ImageIcon, Archive, CheckCircle2, X } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';


// Extension of the Booking type with the new optional `archived_at`
// column. We don't modify the canonical Booking interface (consumed by
// the customer portal, lookup flow, etc.) — instead we widen it here
// only where the admin dashboard needs to read the archive timestamp.
type AdminBooking = Booking & { archived_at?: string | null };

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();

  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('booking_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // viewArchived === false (default): hide rows with archived_at set
  // viewArchived === true: show ONLY rows with archived_at set
  const [viewArchived, setViewArchived] = useState(false);
  // Dismissable launch-cleared banner. Shown automatically when the
  // active view is empty *and* the bookings table contains archived
  // rows — i.e. the operator has just cleared the dashboard for launch
  // (or any time the dashboard finds itself in that state). Dismissal
  // is in-memory only; refreshing the page brings it back if the
  // empty-active-with-archived condition still holds.
  const [launchBannerDismissed, setLaunchBannerDismissed] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBookings((data || []) as AdminBooking[]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Visible base list — depends on whether the operator is in the
  // archived view or the default active view. All downstream stats,
  // filter dropdowns, and the table operate on this list.
  const visibleBase = useMemo(() => {
    if (viewArchived) return bookings.filter((b) => !!b.archived_at);
    return bookings.filter((b) => !b.archived_at);
  }, [bookings, viewArchived]);

  const services = useMemo(
    () => [...new Set(visibleBase.map((b) => b.service))],
    [visibleBase],
  );

  const filteredBookings = useMemo(() => {
    let result = [...visibleBase];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.customer_name.toLowerCase().includes(q) || b.customer_email.toLowerCase().includes(q) || b.booking_reference.toLowerCase().includes(q) || b.service_address.toLowerCase().includes(q));
    }
    if (serviceFilter) result = result.filter(b => b.service === serviceFilter);
    if (statusFilter) result = result.filter(b => b.status === statusFilter);
    if (dateFrom) result = result.filter(b => b.booking_date >= dateFrom);
    if (dateTo) result = result.filter(b => b.booking_date <= dateTo);
    result.sort((a, b) => {
      const aVal = a[sortField as keyof Booking] || '';
      const bVal = b[sortField as keyof Booking] || '';
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return result;
  }, [visibleBase, searchQuery, serviceFilter, statusFilter, dateFrom, dateTo, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      toast({ title: 'Status Updated', description: `Booking status changed to ${newStatus}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const clearFilters = () => { setSearchQuery(''); setServiceFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Per-row archive callback — fired by ArchiveRowButton inside the
  // table after the archive email has been delivered AND the row has
  // already been flagged as archived in the database. We just mirror
  // the change into local state so the row drops out of the active
  // view instantly without needing a refetch.
  const handleRowArchived = (id: string, archivedAtIso: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, archived_at: archivedAtIso } : b)),
    );
  };


  const exportOptions = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: statusFilter || undefined,
    service: serviceFilter || undefined
  };

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <div
        className="bg-brand-navy text-white py-4 px-4 sm:px-6 shadow-lg"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >

        <div className="container mx-auto flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>
            <LayoutDashboard className="w-6 h-6 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold truncate">Admin Dashboard</h1>
            {viewArchived && (
              <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-100 text-xs font-medium border border-amber-400/40">
                Archived view
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButton
              bookings={filteredBookings}
              allBookings={bookings}
              filterOptions={exportOptions}
            />
            {/*
              Bulk archive deliberately disabled per operator request —
              archiving now happens one job at a time from the "Archive"
              action on each table row. We keep this button visible (but
              disabled) so the previous workflow is discoverable and so
              operators see exactly where the new per-row action took
              its place.
            */}
            <button
              type="button"
              disabled
              title="Bulk archive disabled — use the Archive action on each row to archive one job at a time."
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/40 text-white/80 rounded-lg cursor-not-allowed opacity-60"
            >
              <Archive className="w-4 h-4" />
              <span className="hidden md:inline">Archive selected jobs only</span>
              <span className="md:hidden">Archive</span>
            </button>

            <button
              onClick={() => navigate('/admin/showcase')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white border border-white/20"
              title="Manage showcase jobs shown on the public Featured Jobs page"
            >
              <ImageIcon className="w-4 h-4" /> Showcase
            </button>
            <button
              onClick={() => navigate('/admin/email-test')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white border border-white/20"
              title="Diagnostic tool to test booking email deliverability with attachments"
            >
              <Mail className="w-4 h-4" /> Email Test
            </button>
            <button onClick={fetchBookings} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

        </div>
      </div>



      <div className="container mx-auto px-4 py-6">
        {/*
          Launch-cleared success banner — appears when the active view
          is empty *and* there are archived bookings to show under
          "Show Archived". Wording is locked to the exact message the
          operator specified. Dismissable in-session only; never
          modifies any data.
        */}
        {!viewArchived &&
          !isLoading &&
          !launchBannerDismissed &&
          bookings.length > 0 &&
          visibleBase.length === 0 &&
          bookings.some((b) => !!b.archived_at) && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-green-900 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Admin job stack cleared.</p>
                <p className="text-sm text-green-800">
                  Archived jobs remain available under{' '}
                  <button
                    type="button"
                    onClick={() => setViewArchived(true)}
                    className="underline font-medium hover:text-green-700"
                  >
                    Show Archived
                  </button>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLaunchBannerDismissed(true)}
                aria-label="Dismiss"
                className="flex-shrink-0 p-1 rounded hover:bg-green-100 transition-colors"
              >
                <X className="w-4 h-4 text-green-700" />
              </button>
            </div>
          )}


        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-sm text-gray-500">{viewArchived ? 'Archived' : 'Active'}</p><p className="text-2xl font-bold text-brand-navy">{visibleBase.length}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-sm text-gray-500">Confirmed</p><p className="text-2xl font-bold text-green-600">{visibleBase.filter(b => b.status === 'confirmed').length}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-blue-600">{visibleBase.filter(b => b.status === 'completed').length}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-sm text-gray-500">Cancelled</p><p className="text-2xl font-bold text-red-600">{visibleBase.filter(b => b.status === 'cancelled').length}</p></div>
        </div>
        <XeroConnectionPanel />
        <EmailOutboxPanel />
        <AdminFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearFilters={clearFilters}
          services={services}
          viewArchived={viewArchived}
          onToggleArchived={setViewArchived}
        />
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-orange" />
            <p className="mt-2 text-gray-500">Loading bookings...</p>
          </div>
        ) : (
          <AdminBookingsTable
            bookings={filteredBookings}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
            onBookingUpdated={(id, updates) =>
              setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
            }
            onRowArchived={handleRowArchived}
            hideArchiveAction={viewArchived}
          />
        )}

        <p className="text-center text-gray-500 text-sm mt-4">
          Showing {filteredBookings.length} of {visibleBase.length} {viewArchived ? 'archived ' : ''}bookings
          {!viewArchived && bookings.some((b) => !!b.archived_at) && (
            <> · {bookings.filter((b) => !!b.archived_at).length} archived hidden</>
          )}
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
