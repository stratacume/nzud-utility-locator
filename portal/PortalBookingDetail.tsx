import React, { useState } from 'react';
import {
  Calendar, MapPin, Tag, ArrowLeft, FileText, CalendarClock, XCircle,
  ClipboardList, Activity, Hash, User, Phone, Mail, CheckCircle2, Briefcase,
} from 'lucide-react';
import { Booking, UploadedDocument } from '@/components/booking/BookingDetails';
import PortalJobDocuments from './PortalJobDocuments';

interface PortalBookingDetailProps {
  booking: Booking;
  /** Documents for this booking, loaded from the `booking_documents` table
   *  by the parent (CustomerPortal). SOURCE OF TRUTH for the Job Centre. */
  documents: UploadedDocument[];
  /** Tell parent to refresh `booking_documents` (after upload/delete). */
  onDocumentsChanged: () => Promise<void> | void;
  uploaderEmail?: string;

  onBack: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  isCancelling: boolean;
}

type Tab = 'overview' | 'documents' | 'activity';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  rescheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-brand-teal/10 text-brand-teal border-brand-teal/20',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const PortalBookingDetail: React.FC<PortalBookingDetailProps> = ({
  booking, documents, onDocumentsChanged, uploaderEmail,
  onBack, onReschedule, onCancel, isCancelling,
}) => {
  const [tab, setTab] = useState<Tab>('overview');
  const bookingDate = new Date(booking.booking_date);
  const isFuture = bookingDate > new Date();
  const canModify = isFuture && booking.status === 'confirmed';

  const customerDocs = documents.filter((d) => (d.category || 'customer') !== 'completed');
  const completedDocs = documents.filter((d) => d.category === 'completed');
  const totalDocs = documents.length;
  const photoCount = documents.filter(
    (d) => (d.mimeType || '').startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(d.name || '')
  ).length;

  const statusKey = (booking.status || '').toLowerCase().replace(/\s+/g, '_');
  const statusClass = STATUS_STYLE[statusKey] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-teal text-white px-4 sm:px-5 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to bookings
        </button>
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide font-medium">
              <Hash className="w-3 h-3 flex-shrink-0" /> Job reference
            </div>
            <p className="text-xl sm:text-2xl font-bold break-all">{booking.booking_reference}</p>
            <p className="text-white/80 text-sm mt-0.5 break-words">{booking.service}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border whitespace-nowrap flex-shrink-0 ${statusClass} bg-white/95`}>
            {booking.status?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="border-b border-gray-200 px-2 sm:px-5 flex gap-1 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {[
          { key: 'overview', label: 'Overview', icon: ClipboardList },
          { key: 'documents', label: `Documents${totalDocs ? ` (${totalDocs})` : ''}`, icon: FileText },
          { key: 'activity', label: 'Activity', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
              tab === key
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-gray-500 hover:text-brand-navy'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>



      <div className="p-4 sm:p-5">

        {tab === 'overview' && (
          <div className="space-y-5">
            <SectionTitle icon={<Briefcase className="w-4 h-4" />} title="Job summary" />
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoRow icon={<Tag className="w-4 h-4" />} label="Service" value={booking.service} />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Scheduled date"
                value={bookingDate.toLocaleDateString('en-NZ', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Site address"
                value={booking.service_address}
                fullWidth
              />
            </div>

            <SectionTitle icon={<User className="w-4 h-4" />} title="Site contact" />
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={booking.customer_name} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={booking.customer_email} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={booking.customer_phone} />
            </div>

            {booking.job_details && (
              <>
                <SectionTitle icon={<ClipboardList className="w-4 h-4" />} title="Job notes" />
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {booking.job_details}
                </div>
              </>
            )}

            {/* Quick stats — sourced from the booking_documents table, so the
                count always matches what the Documents tab actually shows. */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Documents" value={customerDocs.length} />
              <Stat label="Photos" value={photoCount} />
              <Stat label="Reports" value={completedDocs.length} accent />
            </div>

            {canModify && (
              <div className="pt-4 grid sm:grid-cols-2 gap-2">
                <button
                  onClick={onReschedule}
                  className="py-2.5 px-4 rounded-lg bg-brand-navy hover:bg-brand-teal text-white font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <CalendarClock className="w-4 h-4" /> Reschedule
                </button>
                <button
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="py-2.5 px-4 rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-50 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> {isCancelling ? 'Cancelling…' : 'Cancel booking'}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <PortalJobDocuments
            booking={booking}
            documents={documents}
            onDocumentsChanged={onDocumentsChanged}
            uploaderEmail={uploaderEmail}
          />
        )}

        {tab === 'activity' && (
          <div className="space-y-3">
            <SectionTitle icon={<Activity className="w-4 h-4" />} title="Job timeline" />
            <ActivityRow
              icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
              title="Booking created"
              date={booking.created_at}
            />
            {booking.reminder_sent && (
              <ActivityRow
                icon={<Mail className="w-4 h-4 text-brand-teal" />}
                title="Reminder email sent"
                date={booking.created_at}
              />
            )}
            {booking.status === 'rescheduled' && (
              <ActivityRow
                icon={<CalendarClock className="w-4 h-4 text-amber-600" />}
                title="Booking rescheduled"
                date={booking.booking_date}
              />
            )}
            {booking.status === 'cancelled' && (
              <ActivityRow
                icon={<XCircle className="w-4 h-4 text-red-600" />}
                title="Booking cancelled"
                date={booking.booking_date}
              />
            )}
            {booking.status === 'completed' && (
              <ActivityRow
                icon={<CheckCircle2 className="w-4 h-4 text-brand-teal" />}
                title="Job completed"
                date={booking.booking_date}
              />
            )}
            <p className="text-xs text-gray-500 mt-3">
              Detailed email-by-email activity is also visible to NZUD admins from the office dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 text-brand-navy">
    <span className="text-brand-teal">{icon}</span>
    <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; fullWidth?: boolean }> = ({
  icon, label, value, fullWidth,
}) => (
  <div className={`flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-lg p-3 ${fullWidth ? 'sm:col-span-2' : ''}`}>
    <span className="text-brand-teal mt-0.5">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-medium text-brand-navy break-words">{value}</p>
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rounded-lg border p-3 text-center ${accent ? 'bg-brand-teal/10 border-brand-teal/20' : 'bg-gray-50 border-gray-200'}`}>
    <p className={`text-xl font-bold ${accent ? 'text-brand-teal' : 'text-brand-navy'}`}>{value}</p>
    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
  </div>
);

const ActivityRow: React.FC<{ icon: React.ReactNode; title: string; date?: string }> = ({ icon, title, date }) => (
  <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-brand-navy">{title}</p>
      {date && (
        <p className="text-xs text-gray-500">
          {new Date(date).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  </div>
);

export default PortalBookingDetail;
