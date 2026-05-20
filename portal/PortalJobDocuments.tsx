import React, { useMemo, useState } from 'react';
import {
  Search, FolderOpen, FileText, Image as ImageIcon, ClipboardCheck, Plus, Loader2, Inbox, AlertTriangle,
} from 'lucide-react';
import { Booking, UploadedDocument } from '@/components/booking/BookingDetails';
import FileUpload from '@/components/pricing/FileUpload';
import PortalDocumentItem, { isImageDoc, isPdfDoc } from './PortalDocumentItem';
import { useToast } from '@/hooks/use-toast';
import {
  insertBookingDocuments,
  NewBookingDocument,
} from '@/lib/bookingDocuments';
import { downloadFile } from '@/lib/fileViewer';


interface PortalJobDocumentsProps {
  booking: Booking;
  /** All documents for this booking — already loaded from the
   *  `booking_documents` table by the parent. SOURCE OF TRUTH. */
  documents: UploadedDocument[];
  /** Tell the parent to re-query booking_documents (after upload/delete). */
  onDocumentsChanged: () => Promise<void> | void;
  /** Identity of the user uploading — used as `uploaded_by` audit field. */
  uploaderEmail?: string;
}

type SortKey = 'newest' | 'name' | 'size';

/**
 * Job Centre documents panel.
 *
 * File-action UX (simplified — no third-party preview service)
 * ────────────────────────────────────────────────────────────
 * Each row exposes:
 *   1. A primary "Download / Open file" button (inside PortalDocumentItem)
 *      that opens the raw Supabase signed URL in a new tab. iPhone Safari
 *      handles PDFs and images natively; DOCX/CSV/etc. fall through to
 *      iOS's "Open in…" share sheet → Files app.
 *   2. A small Download icon that forces `Content-Disposition: attachment;
 *      filename="…"` so the file always has a guaranteed save path,
 *      including on legacy iOS.
 *
 * The previous Eye-icon "preview" button and the in-app image lightbox
 * have been removed: the lightbox required a custom in-page viewer that
 * was unreliable on iPhone Safari, and the eye button duplicated the
 * primary action while implying a hosted preview service was needed
 * (it never was — we only ever used raw Supabase signed URLs).
 */
const PortalJobDocuments: React.FC<PortalJobDocumentsProps> = ({
  booking, documents, onDocumentsChanged, uploaderEmail,
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [showUpload, setShowUpload] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Split the (DB-backed) documents list by category. Anything without an
  // explicit category counts as customer-uploaded so legacy paths still show.
  const customerDocs = useMemo(
    () => documents.filter((d) => (d.category || 'customer') !== 'completed'),
    [documents]
  );
  const completedDocs = useMemo(
    () => documents.filter((d) => d.category === 'completed'),
    [documents]
  );

  const filteredCustomer = useMemo(() => filterAndSort(customerDocs, search, sort), [customerDocs, search, sort]);
  const filteredCompleted = useMemo(() => filterAndSort(completedDocs, search, sort), [completedDocs, search, sort]);

  /**
   * Explicit DOWNLOAD action — the user tapped the Download icon (or the
   * "Please use Download" fallback link surfaced by PortalDocumentItem
   * when the inline open path failed).
   *
   * Generates a signed URL with `Content-Disposition: attachment;
   * filename="…"` (via Supabase's `download` option) so iOS Safari
   * routes it through the Files app and desktop browsers save it to
   * Downloads. Never silently downloads — the user is the one who
   * tapped this action.
   */
  const handleDownload = async (doc: UploadedDocument) => {
    console.log('[portal:download:start]', {
      bookingId: booking.id,
      bookingRef: booking.booking_reference,
      file: doc.name,
      path: doc.path,
    });
    const url = await downloadFile(doc.path, doc.name);
    if (!url) {
      toast({
        title: 'Unable to generate download link',
        description: `We couldn't open ${doc.name}. Please try again or contact NZUD.`,
        variant: 'destructive',
      });
    }
  };

  /**
   * Called by FileUpload AFTER it has successfully written the bytes to
   * Supabase Storage and verified a signed URL works.
   *
   * `incoming` is the parent's existing list MERGED with the newly-uploaded
   * files, so we diff against `customerDocs` to find the new ones, then
   * persist a `booking_documents` row for each. We never write the merged
   * list back to `bookings.documents` (the legacy text[] column) — that
   * column drops object metadata and was the root cause of the original
   * "uploads vanish on refresh" bug.
   */
  const handleFilesChange = async (incoming: UploadedDocument[]) => {
    const knownPaths = new Set(customerDocs.map((d) => d.path));
    const newOnes = incoming.filter((f) => f && f.path && !knownPaths.has(f.path));
    if (newOnes.length === 0) {
      // Either nothing succeeded or this was a no-op refresh — leave UI alone.
      return;
    }

    setSavingDocs(true);
    setSaveError(null);
    const rows: NewBookingDocument[] = newOnes.map((f) => ({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      customer_email: booking.customer_email,
      original_filename: f.name,
      storage_path: f.path,
      file_size: typeof f.size === 'number' ? f.size : 0,
      mime_type: f.mimeType || null,
      document_type: 'customer',
      uploaded_by: uploaderEmail || booking.customer_email || null,
    }));

    console.log('[portal:upload:persist:start]', {
      bookingId: booking.id,
      bookingRef: booking.booking_reference,
      newCount: rows.length,
    });

    try {
      const inserted = await insertBookingDocuments(rows);
      console.log('[portal:upload:persist:ok]', {
        bookingId: booking.id,
        inserted: inserted.length,
      });
      await onDocumentsChanged();
      toast({
        title: 'Files saved',
        description: `${inserted.length} file${inserted.length === 1 ? '' : 's'} attached to job ${booking.booking_reference}.`,
      });
    } catch (err: any) {
      // Storage upload succeeded but DB insert failed — the user must know
      // the file isn't really attached to the job, so they can retry.
      console.error('[portal:upload:persist:error]', {
        bookingId: booking.id,
        error: err?.message,
      });
      setSaveError(err?.message || 'Could not save document records');
      toast({
        title: 'Could not save document record',
        description:
          err?.message ||
          'The file was uploaded but its record could not be saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingDocs(false);
    }
  };

  const totalDocs = documents.length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="name">Name (A–Z)</option>
          <option value="size">Largest first</option>
        </select>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center justify-center gap-1 text-sm px-4 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Upload
          </button>
        )}
      </div>

      {/* Upload zone */}
      {showUpload && (
        <div className="border-2 border-dashed border-brand-orange/40 rounded-xl p-4 bg-orange-50/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-brand-navy flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add files to this job
              {savingDocs && (
                <span className="inline-flex items-center gap-1 text-xs text-brand-orange font-normal">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving record…
                </span>
              )}
            </p>
            <button
              onClick={() => setShowUpload(false)}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium"
            >
              Done
            </button>
          </div>
          <FileUpload
            files={customerDocs}
            onFilesChange={handleFilesChange}
            bookingRef={booking.booking_reference}
          />
          {saveError && (
            <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Saved to storage but record failed:</strong> {saveError}. Please retry the upload — the file
                will only be attached to your job once both succeed.
              </span>
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">
            Files are saved permanently to this job — they'll still be here next time you log in.
          </p>
        </div>
      )}

      {/* Empty-state for the whole job */}
      {totalDocs === 0 && !showUpload && (
        <div className="border border-dashed border-gray-300 rounded-xl py-10 px-6 text-center bg-gray-50">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">No documents yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Upload site plans, photos or sketches. NZUD will add the completed locate report here once the job is done.
          </p>
        </div>
      )}

      {/* NZUD-uploaded completed-locate documents */}
      {completedDocs.length > 0 && (
        <DocGroup
          icon={<ClipboardCheck className="w-4 h-4" />}
          title="Completed locate documents"
          subtitle="Uploaded by NZUD after your job"
          docs={filteredCompleted}
          source="completed"
          onDownload={handleDownload}
        />
      )}

      {/* Customer-uploaded documents, split by type for clarity */}
      {customerDocs.length > 0 && (
        <CustomerDocs
          docs={filteredCustomer}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

const filterAndSort = (docs: UploadedDocument[], search: string, sort: SortKey) => {
  const q = search.trim().toLowerCase();
  let out = docs.filter((d) => d && d.path && d.name);
  if (q) out = out.filter((d) => d.name.toLowerCase().includes(q));
  if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'size') out = [...out].sort((a, b) => (b.size || 0) - (a.size || 0));
  else out = [...out].sort((a, b) => (b.uploaded_at || '').localeCompare(a.uploaded_at || ''));
  return out;
};

const DocGroup: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  docs: UploadedDocument[];
  source?: 'customer' | 'completed';
  onDownload: (d: UploadedDocument) => void;
}> = ({ icon, title, subtitle, docs, source, onDownload }) => {
  if (docs.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-brand-teal/10 text-brand-teal rounded">{icon}</div>
        <div>
          <h4 className="font-semibold text-brand-navy text-sm">{title}</h4>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{docs.length}</span>
      </div>
      <div className="space-y-2">
        {docs.map((d) => (
          <PortalDocumentItem
            key={d.path}
            doc={d}
            source={source}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
};

const CustomerDocs: React.FC<{
  docs: UploadedDocument[];
  onDownload: (d: UploadedDocument) => void;
}> = ({ docs, onDownload }) => {
  const images = docs.filter(isImageDoc);
  const pdfs = docs.filter(isPdfDoc);
  const others = docs.filter((d) => !isImageDoc(d) && !isPdfDoc(d));
  return (
    <>
      {images.length > 0 && (
        <DocGroup
          icon={<ImageIcon className="w-4 h-4" />}
          title="Photos & images"
          subtitle="Site photos, sketches and plans you uploaded"
          docs={images}
          source="customer"
          onDownload={onDownload}
        />
      )}
      {pdfs.length > 0 && (
        <DocGroup
          icon={<FileText className="w-4 h-4" />}
          title="PDFs & plans"
          docs={pdfs}
          source="customer"
          onDownload={onDownload}
        />
      )}
      {others.length > 0 && (
        <DocGroup
          icon={<FolderOpen className="w-4 h-4" />}
          title="Other files"
          docs={others}
          source="customer"
          onDownload={onDownload}
        />
      )}
    </>
  );
};

export default PortalJobDocuments;
