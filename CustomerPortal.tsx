import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCustomerPortal, CustomerPortalProvider } from '@/contexts/CustomerPortalContext';
import { Booking, UploadedDocument } from '@/components/booking/BookingDetails';
import PortalLogin from '@/components/portal/PortalLogin';
import PortalBookingCard from '@/components/portal/PortalBookingCard';
import PortalBookingDetail from '@/components/portal/PortalBookingDetail';
import PortalDashboard from '@/components/portal/PortalDashboard';
import RescheduleCalendar from '@/components/booking/RescheduleCalendar';
import NotificationPreferences from '@/components/portal/NotificationPreferences';
import LegalFooter from '@/components/LegalFooter';
import {
  ArrowLeft, LogOut, Calendar, History, RefreshCw, Bell, List,
  LayoutDashboard, User as UserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchDocumentsForCustomer,
  groupByBooking,
  rowToDoc,
  BookingDocumentRow,
} from '@/lib/bookingDocuments';

type Tab = 'dashboard' | 'bookings' | 'notifications' | 'profile';

const PortalContent: React.FC = () => {
  const { isAuthenticated, customerEmail, logout } = useCustomerPortal();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [docRows, setDocRows] = useState<BookingDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Group rows → bookingId → UploadedDocument[]. Used everywhere in the portal
  // so the count and the list always agree (DB is the source of truth).
  const docsByBooking = useMemo(() => {
    const grouped = groupByBooking(docRows);
    const out: Record<string, UploadedDocument[]> = {};
    for (const [bid, rows] of Object.entries(grouped)) {
      out[bid] = rows.map(rowToDoc);
    }
    return out;
  }, [docRows]);

  // Inject the doc lists into the booking objects so existing components
  // (PortalDashboard) that read `b.documents` / `b.completed_documents` keep
  // working without further changes — the values now come from the
  // booking_documents table, not from the legacy text[]/jsonb columns.
  const bookingsWithDocs = useMemo<Booking[]>(() => {
    return bookings.map((b) => {
      const all = docsByBooking[b.id] || [];
      return {
        ...b,
        documents: all.filter((d) => (d.category || 'customer') !== 'completed') as any,
        completed_documents: all.filter((d) => d.category === 'completed') as any,
      };
    });
  }, [bookings, docsByBooking]);

  const fetchAll = async () => {
    if (!customerEmail) return;
    setIsLoading(true);
    try {
      const [bookingsRes, docs] = await Promise.all([
        supabase.from('bookings').select('*').eq('customer_email', customerEmail.toLowerCase()).order('booking_date', { ascending: false }),
        fetchDocumentsForCustomer(customerEmail),
      ]);
      if (bookingsRes.error) throw bookingsRes.error;
      setBookings(bookingsRes.data || []);
      setDocRows(docs);
      console.log('[portal:load]', {
        email: customerEmail,
        bookings: bookingsRes.data?.length || 0,
        documents: docs.length,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Re-query just booking_documents (used after upload/delete inside a job).
  const refreshDocuments = async () => {
    if (!customerEmail) return;
    try {
      const docs = await fetchDocumentsForCustomer(customerEmail);
      setDocRows(docs);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => { if (isAuthenticated) fetchAll(); }, [isAuthenticated, customerEmail]);

  // Keep selectedBooking in sync with the latest bookingsWithDocs so freshly
  // uploaded files show up immediately when the docs query refreshes.
  const liveSelected = useMemo(
    () => (selectedBooking ? bookingsWithDocs.find((b) => b.id === selectedBooking.id) || selectedBooking : null),
    [selectedBooking, bookingsWithDocs]
  );

  const filteredBookings = bookingsWithDocs.filter((b) => {
    const isPast = new Date(b.booking_date) < new Date();
    return filter === 'upcoming' ? !isPast : isPast;
  });

  const handleSelectBooking = (b: Booking) => {
    setSelectedBooking(b);
    setActiveTab('bookings');
  };

  const handleCancel = async () => {
    if (!liveSelected) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', liveSelected.id);
      if (error) throw error;
      await supabase.functions.invoke('send-booking-email', {
        body: {
          type: 'cancellation',
          to: customerEmail,
          customerName: liveSelected.customer_name,
          bookingReference: liveSelected.booking_reference,
          service: liveSelected.service,
          bookingDate: liveSelected.booking_date,
        },
      });
      toast({ title: 'Booking cancelled', description: 'Your booking has been cancelled.' });
      setSelectedBooking(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReschedule = async (newDate: Date) => {
    if (!liveSelected) return;
    setIsUpdating(true);
    try {
      const newDateStr = newDate.toISOString().split('T')[0];
      const { error } = await supabase
        .from('bookings')
        .update({ booking_date: newDateStr, status: 'rescheduled' })
        .eq('id', liveSelected.id);
      if (error) throw error;
      await supabase.functions.invoke('send-booking-email', {
        body: {
          type: 'reschedule',
          to: customerEmail,
          customerName: liveSelected.customer_name,
          bookingReference: liveSelected.booking_reference,
          service: liveSelected.service,
          originalDate: liveSelected.booking_date,
          newDate: newDateStr,
          serviceAddress: liveSelected.service_address,
        },
      });
      toast({ title: 'Booking rescheduled', description: `Moved to ${newDate.toLocaleDateString('en-NZ')}.` });
      setIsRescheduling(false);
      setSelectedBooking(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy to-brand-teal flex flex-col">
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 relative"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
        >
          <button
            onClick={() => navigate('/')}
            className="absolute left-4 text-white/80 hover:text-white flex items-center gap-2"
            style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
          >
            <ArrowLeft className="w-5 h-5" /> Back to Home
          </button>
          <PortalLogin />
        </div>
        <LegalFooter variant="dark" />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header
        className="bg-white border-b border-gray-200 sticky top-0 z-30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >

        <div className="container mx-auto px-3 sm:px-4 py-3 max-w-5xl flex items-center gap-2 sm:gap-3">
          {/* Left: back + title — flexes and truncates */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 flex-shrink-0"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-brand-navy leading-tight text-sm sm:text-base truncate">
                NZUD Job Centre
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">{customerEmail}</p>
            </div>
          </div>
          {/* Right: actions — never shrink, icon-only logout on mobile */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={fetchAll}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm border border-gray-200 hover:bg-gray-100 rounded-lg text-gray-700 font-medium"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <nav
          className="container mx-auto px-2 max-w-5xl flex gap-0 overflow-x-auto border-t border-gray-100"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {([
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'bookings', label: 'My Bookings', icon: List },
            { key: 'notifications', label: 'Notifications', icon: Bell },
            { key: 'profile', label: 'Profile', icon: UserIcon },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                if (key !== 'bookings') {
                  setSelectedBooking(null);
                  setIsRescheduling(false);
                }
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                activeTab === key ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-brand-navy'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </header>


      <main className="container mx-auto px-3 sm:px-4 py-5 max-w-5xl">

        {activeTab === 'dashboard' && (
          isLoading ? <DashboardSkeleton /> : (
            <PortalDashboard
              bookings={bookingsWithDocs}
              customerEmail={customerEmail || ''}
              onSelectBooking={handleSelectBooking}
              onGoToBookings={() => setActiveTab('bookings')}
            />
          )
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-2xl">
            <NotificationPreferences customerEmail={customerEmail!} />
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileSection email={customerEmail || ''} bookings={bookingsWithDocs} />
        )}

        {activeTab === 'bookings' && (
          <>
            {liveSelected && !isRescheduling && (
              <PortalBookingDetail
                booking={liveSelected}
                documents={docsByBooking[liveSelected.id] || []}
                onDocumentsChanged={refreshDocuments}
                uploaderEmail={customerEmail || undefined}
                onBack={() => setSelectedBooking(null)}
                onReschedule={() => setIsRescheduling(true)}
                onCancel={handleCancel}
                isCancelling={isCancelling}
              />
            )}

            {isRescheduling && liveSelected && (
              <RescheduleCalendar
                currentDate={liveSelected.booking_date}
                onConfirm={handleReschedule}
                onBack={() => setIsRescheduling(false)}
                isUpdating={isUpdating}
              />
            )}

            {!liveSelected && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-brand-navy">My Bookings</h2>
                  <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5 max-w-full">
                    <button
                      onClick={() => setFilter('upcoming')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                        filter === 'upcoming' ? 'bg-brand-orange text-white' : 'text-gray-600 hover:text-brand-navy'
                      }`}
                    >
                      <Calendar className="w-4 h-4" /> Upcoming
                    </button>
                    <button
                      onClick={() => setFilter('past')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                        filter === 'past' ? 'bg-brand-orange text-white' : 'text-gray-600 hover:text-brand-navy'
                      }`}
                    >
                      <History className="w-4 h-4" /> Past
                    </button>
                  </div>
                </div>


                {isLoading ? (
                  <BookingsSkeleton />
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">{filter === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {filter === 'upcoming' ? 'Book a new job from the home page.' : 'Past jobs will appear here once completed.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredBookings.map((b) => {
                      const docs = docsByBooking[b.id] || [];
                      const customerCount = docs.filter((d) => (d.category || 'customer') !== 'completed').length;
                      const reportCount = docs.filter((d) => d.category === 'completed').length;
                      return (
                        <PortalBookingCard
                          key={b.id}
                          booking={b}
                          onSelect={handleSelectBooking}
                          documentCount={customerCount}
                          reportCount={reportCount}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      <LegalFooter variant="light" className="mt-8" />
    </div>
  );
};

const DashboardSkeleton: React.FC = () => (

  <div className="space-y-4">
    <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
    </div>
    <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
  </div>
);

const BookingsSkeleton: React.FC = () => (
  <div className="grid sm:grid-cols-2 gap-3">
    {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
  </div>
);

const ProfileSection: React.FC<{ email: string; bookings: Booking[] }> = ({ email, bookings }) => {
  const totalDocs = bookings.reduce((acc, b) => {
    return acc + ((b.documents as UploadedDocument[]) || []).length + ((b.completed_documents as UploadedDocument[]) || []).length;
  }, 0);
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold text-lg">
            {(email[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-brand-navy truncate">{email}</p>
            <p className="text-xs text-gray-500">Customer account</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-brand-navy">{bookings.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Bookings</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-brand-navy">{totalDocs}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Documents</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-brand-navy">
              {bookings.filter((b) => b.status === 'completed').length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Completed</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
        <p className="font-semibold text-brand-navy mb-1">Need help?</p>
        <p>
          Contact us at{' '}
          <a href="mailto:julian@nzutilitydetection.com" className="text-brand-orange font-medium hover:underline">
            julian@nzutilitydetection.com
          </a>
          {' '}for account or booking changes.
        </p>
      </div>
    </div>
  );
};

const CustomerPortal: React.FC = () => (
  <CustomerPortalProvider>
    <PortalContent />
  </CustomerPortalProvider>
);

export default CustomerPortal;
