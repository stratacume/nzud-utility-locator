import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardCheck, FileText, Briefcase, ArrowRight, Inbox, Bell, Plus } from 'lucide-react';

import { Booking, UploadedDocument } from '@/components/booking/BookingDetails';

interface PortalDashboardProps {
  bookings: Booking[];
  customerEmail: string;
  onSelectBooking: (b: Booking) => void;
  onGoToBookings: () => void;
}

const PortalDashboard: React.FC<PortalDashboardProps> = ({
  bookings, customerEmail, onSelectBooking, onGoToBookings,
}) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = new Date();
    let upcoming = 0;
    let completed = 0;
    let docs = 0;
    let reports = 0;
    for (const b of bookings) {
      const d = new Date(b.booking_date);
      if (b.status === 'completed') completed++;
      else if (d >= now && b.status !== 'cancelled') upcoming++;
      docs += ((b.documents as UploadedDocument[]) || []).length;
      reports += ((b.completed_documents as UploadedDocument[]) || []).length;
    }
    return { upcoming, completed, docs, reports, total: bookings.length };
  }, [bookings]);

  const nextJob = useMemo(() => {
    const future = bookings
      .filter((b) => new Date(b.booking_date) >= new Date() && b.status !== 'cancelled')
      .sort((a, b) => +new Date(a.booking_date) - +new Date(b.booking_date));
    return future[0] || null;
  }, [bookings]);

  const recentReports = useMemo(() => {
    return bookings
      .filter((b) => ((b.completed_documents as UploadedDocument[]) || []).length > 0)
      .sort((a, b) => +new Date(b.booking_date) - +new Date(a.booking_date))
      .slice(0, 3);
  }, [bookings]);

  // Pick the most recent booking (any status) as the source of customer
  // contact details for prefill — falls back to the next upcoming job, then
  // to email-only if the customer somehow has no bookings yet.
  const prefillSource = useMemo(() => {
    if (!bookings.length) return null;
    return [...bookings].sort(
      (a, b) => +new Date(b.booking_date) - +new Date(a.booking_date),
    )[0];
  }, [bookings]);

  const handleRequestNewLocate = () => {
    try {
      const src: any = prefillSource || {};
      const prefill = {
        name: src.customer_name || '',
        email: customerEmail || src.customer_email || '',
        phone: src.customer_phone || '',
        address: src.service_address || '',
        suburb: src.service_suburb || '',
        city: src.service_city || '',
      };
      window.sessionStorage.setItem('nzud_prefill', JSON.stringify(prefill));
    } catch {
      // Storage can be blocked (private mode / in-app browsers) — still navigate
      // so the customer at least lands on the booking form.
    }
    navigate('/#booking');
    // After SPA navigation the hash listener may not fire if we're already on
    // '/'; force-scroll to the booking section on the next tick.
    setTimeout(() => {
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const greetingName = (customerEmail || '').split('@')[0].replace(/\./g, ' ');

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-navy via-brand-navy to-brand-teal text-white rounded-2xl p-5 sm:p-6 shadow-sm">
        <p className="text-white/70 text-xs uppercase tracking-wide font-semibold">Welcome back</p>
        <h2 className="text-xl sm:text-2xl font-bold capitalize mt-1">{greetingName || 'there'}</h2>
        <p className="text-white/80 text-sm mt-1">
          Your job centre — site documents, photos and completed reports all live here.
        </p>
        {nextJob ? (
          <button
            onClick={() => onSelectBooking(nextJob)}
            className="mt-4 inline-flex max-w-full items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors text-left"
          >
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              Next job: {new Date(nextJob.booking_date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })} — {nextJob.service}
            </span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        ) : (
          <p className="mt-3 text-sm text-white/70">No upcoming jobs scheduled.</p>
        )}

      </div>

      {/* Request new locate — sits directly under the welcome hero. Pre-fills
          the booking form with the customer's saved contact + last-used
          service address so they only need to pick a date and confirm. */}
      <button
        type="button"
        onClick={handleRequestNewLocate}
        className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-colors"
      >
        <Plus className="w-5 h-5" />
        Request new locate
      </button>


      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Upcoming" value={stats.upcoming} tone="orange" />
        <StatCard icon={<ClipboardCheck className="w-5 h-5" />} label="Completed" value={stats.completed} tone="teal" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="My documents" value={stats.docs} tone="navy" />
        <StatCard icon={<Briefcase className="w-5 h-5" />} label="NZUD reports" value={stats.reports} tone="green" />
      </div>

      {/* Recent reports */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-brand-navy text-sm uppercase tracking-wide flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand-teal" /> Recent locate reports
          </h3>
          <button onClick={onGoToBookings} className="text-xs text-brand-orange hover:underline font-medium">
            View all jobs
          </button>
        </div>
        {recentReports.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-1" />
            Completed locate reports will appear here once your job is finished.
          </div>
        ) : (
          <div className="space-y-2">
            {recentReports.map((b) => {
              const reportCount = ((b.completed_documents as UploadedDocument[]) || []).length;
              return (
                <button
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-navy truncate">{b.service}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {b.booking_reference} · {new Date(b.booking_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-[11px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {reportCount} file{reportCount > 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 flex gap-3">
        <Bell className="w-5 h-5 text-brand-orange flex-shrink-0 mt-0.5" />
        <div className="text-sm text-brand-navy">
          <p className="font-semibold">Tip — every job has its own document hub</p>
          <p className="text-gray-600 mt-1">
            Open any booking to upload site plans or photos, and to download the completed locate report after we're done on site.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'orange' | 'teal' | 'navy' | 'green';
}> = ({ icon, label, value, tone }) => {
  const toneClass = {
    orange: 'bg-brand-orange/10 text-brand-orange',
    teal: 'bg-brand-teal/10 text-brand-teal',
    navy: 'bg-brand-navy/10 text-brand-navy',
    green: 'bg-green-100 text-green-700',
  }[tone];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneClass}`}>{icon}</div>
      <p className="text-xl font-bold text-brand-navy mt-2">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
    </div>
  );
};

export default PortalDashboard;
