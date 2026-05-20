import React, { useState } from 'react';
import { X, FileText, Loader2, Paperclip, ExternalLink, Download, AlertTriangle } from 'lucide-react';
import { UploadedDocument } from '@/components/booking/BookingDetails';
import { openOrDownloadFile, downloadFile } from '@/lib/fileViewer';

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: UploadedDocument[];
  bookingRef: string;
}

/**
 * Admin-side "documents for booking X" modal.
 *
 * File-action model (unified, no third-party preview service)
 * ───────────────────────────────────────────────────────────
 * Each row exposes ONE primary "Download / Open file" button that hands
 * the browser the raw Supabase signed URL with `Content-Disposition:
 * inline`. iPhone Safari previews PDFs / images natively, and offers an
 * "Open in…" share sheet for DOCX / CSV / other formats so they route
 * cleanly into iOS Files / Pages / Numbers. A small Download icon is
 * always present as a fallback that forces `Content-Disposition:
 * attachment; filename="…"` for guaranteed save-to-device behaviour.
 *
 * If the inline open path fails for any reason (signing error, popup
 * blocked, …) we surface a plain-language "File preview unavailable.
 * Please use Download." hint on the row — never silent.
 */
const DocumentsModal: React.FC<DocumentsModalProps> = ({ isOpen, onClose, documents, bookingRef }) => {
  const [busyPath, setBusyPath] = useState<string | null>(null);
  // Per-row error message — surfaced when openOrDownloadFile returns ok:false.
  const [openErrors, setOpenErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  /**
   * Primary "Download / Open file" action. Opens the inline-disposition
   * signed URL in a new tab so iOS Safari can render it natively. If the
   * URL can't be signed or the open is blocked, we degrade to the
   * attachment-download path AND surface a row-level hint.
   */
  const handleOpen = async (doc: UploadedDocument) => {
    setBusyPath(doc.path);
    setOpenErrors((prev) => {
      const next = { ...prev };
      delete next[doc.path];
      return next;
    });
    try {
      const result = await openOrDownloadFile(doc.path, doc.name);
      if (!result.ok) {
        setOpenErrors((prev) => ({
          ...prev,
          [doc.path]: result.reason || 'File preview unavailable. Please use Download.',
        }));
      }
    } catch (err) {
      console.error('Open error:', err);
      setOpenErrors((prev) => ({
        ...prev,
        [doc.path]: 'File preview unavailable. Please use Download.',
      }));
    } finally {
      setBusyPath(null);
    }
  };

  /**
   * Explicit download — Content-Disposition: attachment with filename.
   * Always available per req #2 so admins on any device have a
   * guaranteed save path.
   */
  const handleDownload = async (doc: UploadedDocument) => {
    setBusyPath(doc.path);
    try {
      await downloadFile(doc.path, doc.name);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setBusyPath(null);
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext || '')) {
      return <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center text-purple-600 text-xs font-bold">IMG</div>;
    }
    if (ext === 'pdf') {
      return <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600 text-xs font-bold">PDF</div>;
    }
    return <FileText className="w-8 h-8 text-brand-teal" />;
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            <h3 className="font-semibold">Documents for {bookingRef}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No documents attached</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.path} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">{formatSize(doc.size)}</p>
                    </div>
                    {/*
                      Primary  : "Download / Open file" — opens raw signed
                                 URL in a new tab. iOS Safari handles PDFs /
                                 images natively, share-sheets the rest.
                      Fallback : Download icon — forced attachment save.
                                 Always present per req #2.
                    */}
                    <button
                      onClick={() => handleOpen(doc)}
                      disabled={busyPath === doc.path}
                      aria-label={`Download or open ${doc.name}`}
                      title="Opens in a new tab. PDFs / images preview; other files download."
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-teal text-white rounded-lg hover:bg-brand-navy transition-colors text-sm disabled:opacity-50"
                    >
                      {busyPath === doc.path ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          <span className="hidden sm:inline">Download / Open file</span>
                          <span className="sm:hidden">Open</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={busyPath === doc.path}
                      aria-label={`Download ${doc.name} as a file`}
                      title="Force download (save to device)"
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  {openErrors[doc.path] && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1">
                        File preview unavailable. Please use{' '}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="underline font-medium hover:text-amber-900"
                        >
                          Download
                        </button>
                        .
                      </span>
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}
        </div>

        <div className="border-t px-6 py-4">
          <button onClick={onClose} className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal;
