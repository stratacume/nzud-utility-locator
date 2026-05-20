import React, { useEffect, useState } from 'react';
import { Download, Image as ImageIcon, FileType2, File as FileIcon, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UploadedDocument } from '@/components/booking/BookingDetails';
import { openOrDownloadFile } from '@/lib/fileViewer';

export const isImageDoc = (doc: UploadedDocument): boolean => {
  const mime = (doc.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = (doc.name || '').toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext);
};

export const isPdfDoc = (doc: UploadedDocument): boolean => {
  const mime = (doc.mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return true;
  const ext = (doc.name || '').toLowerCase().split('.').pop() || '';
  return ext === 'pdf';
};

export const formatSize = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

interface PortalDocumentItemProps {
  doc: UploadedDocument;
  /**
   * Optional callback for the explicit attachment-download icon (forced
   * `Content-Disposition: attachment`). Kept as a fallback so the row
   * always offers a guaranteed way to retrieve the file even if the
   * primary "Download / Open file" action can't open a new tab.
   */
  onDownload: (doc: UploadedDocument) => void;
  source?: 'customer' | 'completed';
}

/**
 * Renders a single document row with:
 *   • A thumbnail (real signed URL for images, icon for PDFs / others)
 *   • A primary "Download / Open file" button that opens the Supabase
 *     signed URL directly in a new tab. iPhone Safari renders PDFs and
 *     images in its native viewer; DOCX / CSV / other types get iOS's
 *     "Open in…" share sheet so they route to Files / Pages / Numbers.
 *     NO third-party preview service is involved — this is the raw
 *     storage URL.
 *   • A small Download icon button as an always-on fallback that forces
 *     `Content-Disposition: attachment` so the file saves rather than
 *     previews. Per requirement: "Keep the download button for every
 *     file."
 *   • A graceful failure hint ("File preview unavailable. Please use
 *     Download.") when the inline open can't be signed or the browser
 *     blocks the navigation.
 *
 * The legacy Eye-icon "preview" button has been removed — it added no
 * functionality over the new tab open and confused users into thinking
 * the app required a paid hosted-preview service.
 */
const PortalDocumentItem: React.FC<PortalDocumentItemProps> = ({ doc, onDownload, source }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbErr, setThumbErr] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const isImage = isImageDoc(doc);
  const isPdf = isPdfDoc(doc);

  useEffect(() => {
    if (!isImage || !doc.path) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from('booking-documents')
          .createSignedUrl(doc.path, 60 * 30); // 30 min thumbnail link
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setThumbErr(true);
          return;
        }
        setThumbUrl(data.signedUrl);
      } catch {
        if (!cancelled) setThumbErr(true);
      }
    })();
    return () => { cancelled = true; };
  }, [doc.path, isImage]);

  /**
   * Primary action — "Download / Open file".
   * Hands the browser the raw inline-disposition signed URL. The
   * `openOrDownloadFile` helper returns `ok:false` if the URL couldn't
   * be signed or if the anchor click was blocked; in that case it
   * already attempted an attachment-download fallback, and we surface
   * the "File preview unavailable. Please use Download." hint below
   * the row per requirement #10.
   */
  const handleOpen = async () => {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const result = await openOrDownloadFile(doc.path, doc.name);
      if (!result.ok) {
        setOpenError(result.reason || 'File preview unavailable. Please use Download.');
      }
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 hover:border-brand-orange/40 hover:shadow-sm transition-all">
      <div className="group flex items-center gap-3">
        {/* Thumbnail / icon */}
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
          {isImage && thumbUrl && !thumbErr ? (
            <img
              src={thumbUrl}
              alt={doc.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setThumbErr(true)}
            />
          ) : isImage ? (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          ) : isPdf ? (
            <FileType2 className="w-6 h-6 text-red-500" />
          ) : (
            <FileIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{doc.name}</p>
            {source === 'completed' && (
              <span className="text-[10px] uppercase tracking-wide bg-brand-teal/10 text-brand-teal px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                NZUD report
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {doc.size ? <span>{formatSize(doc.size)}</span> : null}
            {isPdf && <span>· PDF</span>}
            {isImage && <span>· Image</span>}
          </div>
        </div>

        {/* Actions
            ─────────
            Primary  : "Download / Open file" — opens the raw Supabase
                       signed URL in a new tab. iOS Safari decides what
                       to do based on Content-Type (PDF/image inline,
                       everything else via the share sheet).
            Fallback : Download icon — forced attachment-disposition
                       save. Always present per req #2 so users always
                       have a guaranteed way to retrieve the file. */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleOpen}
            disabled={opening}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal text-white rounded-lg hover:bg-brand-navy transition-colors text-xs font-medium disabled:opacity-60"
            aria-label={`Download or open ${doc.name}`}
            title="Opens the file in a new tab. PDFs and images preview natively; other files download to your device."
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download / Open file</span>
            <span className="sm:hidden">Open</span>
          </button>
          <button
            onClick={() => onDownload(doc)}
            className="p-2 text-gray-500 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors"
            aria-label={`Download ${doc.name} as a file`}
            title="Force download (save to device)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/*
        Graceful fallback hint — surfaces ONLY when the inline open path
        failed (signing error, popup blocked, etc.). Per requirement #10
        we never fail silently; the user sees a plain-language explanation
        and an obvious Download CTA to retry the attachment path.
      */}
      {openError && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="flex-1">
            File preview unavailable. Please use{' '}
            <button
              onClick={() => onDownload(doc)}
              className="underline font-medium hover:text-amber-900"
            >
              Download
            </button>
            .
          </span>
        </div>
      )}
    </div>
  );
};

export default PortalDocumentItem;
