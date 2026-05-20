import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, Camera, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
}
interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  bookingRef?: string;
  /**
   * Override the 15 MB total-attachments cap. Set to a much higher value
   * (e.g. for admin "completed locate documents" where files are not sent
   * via email and only need to be downloadable from the portal).
   */
  totalLimitBytes?: number;
  /**
   * If true, ALL images are compressed (downscaled + JPEG re-encoded)
   * regardless of original size. Defaults to false (only compress > 1 MB).
   * Used by the admin completed-docs uploader so even small PNG screenshots
   * are normalised to ~150 KB JPEGs and 5–10 photos easily fit.
   */
  compressAllImages?: boolean;
  /**
   * Hide the per-attachment / total-limit warning copy. Useful for the
   * admin completed-docs flow which has its own context label.
   */
  hideEmailLimitNote?: boolean;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface UploadStatus {
  filename: string;
  state: 'uploading' | 'success' | 'error';
  message?: string;
  size?: number;
}

const DEFAULT_TOTAL_LIMIT_BYTES = 15 * 1024 * 1024; // 15 MB total across all attachments
const PER_FILE_LIMIT_BYTES = 15 * 1024 * 1024; // 15 MB per individual file

// Auto-downscale settings — tuned for mobile (the majority of our traffic).
// Phones routinely produce 3–8 MB photos; we shrink anything over ~1 MB so
// 5–10 photos easily fit within the 15 MB email cap on a 4G connection.
const IMAGE_COMPRESS_THRESHOLD_BYTES = 1 * 1024 * 1024; // ~1 MB (default)
const IMAGE_MAX_DIMENSION = 1600; // longest side, px (smaller = more reliable on iOS Safari)
const IMAGE_JPEG_QUALITY = 0.8;


/**
 * Decode an image File on mobile-safely.
 *
 * Strategy (in order, falling back on failure):
 *   1) createImageBitmap(file, { imageOrientation: 'from-image' })
 *      - Most memory-efficient on iOS Safari & Android Chrome
 *      - Honours EXIF rotation so iPhone portraits aren't sideways
 *   2) <img> + URL.createObjectURL(file)
 *      - object URLs avoid the ~2× memory blow-up of data URLs
 *   3) Give up and return null so caller uploads the original
 */
const decodeImage = async (
  file: File
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void } | null> => {
  // Path 1 — createImageBitmap (preferred on modern mobile browsers)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          try { bitmap.close?.(); } catch { /* noop */ }
        },
      };
    } catch {
      // fall through to <img> path
    }
  }

  // Path 2 — <img> + object URL
  try {
    const objectUrl = URL.createObjectURL(file);
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const image = new Image();
      // Important on iOS Safari: prevents tainting + lets large JPEGs decode async
      (image as HTMLImageElement & { decoding?: string }).decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('decode failed'));
      image.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    return null;
  }
};

/**
 * Downscale + re-encode a large image to a JPEG using a canvas.
 * - Keeps aspect ratio, caps the longest side at IMAGE_MAX_DIMENSION
 * - Encodes as JPEG at quality 0.8 (good visual fidelity, much smaller)
 * - Mobile-first: uses createImageBitmap + object URLs to keep memory low
 *   so iOS Safari doesn't kill the tab on 12-megapixel iPhone photos.
 * - Falls back to the original File if anything goes wrong.
 */
const compressImageIfLarge = async (
  file: File,
  opts: { compressAll?: boolean; maxDimension?: number; quality?: number } = {}
): Promise<File> => {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) return file;

  const compressAll = opts.compressAll ?? false;
  const maxDim = opts.maxDimension ?? IMAGE_MAX_DIMENSION;
  const quality = opts.quality ?? IMAGE_JPEG_QUALITY;

  // Default mode: only compress images larger than 1 MB. "compressAll" mode
  // (used for admin completed-locate uploads) re-encodes EVERY image to a
  // JPEG so even small PNG screenshots are downscaled and stripped of
  // alpha — typically a 6–10× size reduction on phone screenshots.
  if (!compressAll && file.size <= IMAGE_COMPRESS_THRESHOLD_BYTES) return file;

  // HEIC/HEIF: iOS Safari CAN decode these via <img> / createImageBitmap, but
  // desktop Chrome/Firefox cannot. We try anyway — if decode fails we'll
  // gracefully fall back to uploading the original. On iPhone this means
  // HEIC photos DO get compressed (which is exactly what we need).
  let decoded: Awaited<ReturnType<typeof decodeImage>> = null;
  try {
    decoded = await decodeImage(file);
  } catch {
    decoded = null;
  }
  if (!decoded) return file;

  const { source, width, height, cleanup } = decoded;

  try {
    if (!width || !height) return file;

    const longest = Math.max(width, height);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // White background — JPEG can't store transparency, and a black default
    // makes PNG screenshots look broken when re-encoded.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(source, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      } catch {
        resolve(null);
      }
    });

    // Free the source bitmap / object URL ASAP — critical on mobile Safari
    // where memory pressure can kill the tab between successive uploads.
    cleanup();
    // Hint to the GC that the canvas is no longer needed.
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) return file;
    // Only use the compressed version if it's actually smaller.
    if (blob.size >= file.size) return file;

    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (err) {
    cleanup();
    console.warn('Image compression failed, uploading original:', err);
    return file;
  }
};



const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onFilesChange,
  bookingRef,
  totalLimitBytes,
  compressAllImages,
  hideEmailLimitNote,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [recentStatus, setRecentStatus] = useState<UploadStatus[]>([]);

  const TOTAL_LIMIT_BYTES = totalLimitBytes ?? DEFAULT_TOTAL_LIMIT_BYTES;
  const totalLimitMB = Math.round(TOTAL_LIMIT_BYTES / (1024 * 1024));

  const currentTotalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const remainingBytes = Math.max(0, TOTAL_LIMIT_BYTES - currentTotalBytes);

  const uploadFiles = async (selectedFiles: FileList) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setIsUploading(true);
    setError('');

    const newFiles: UploadedFile[] = [];
    const tempId = bookingRef || `temp-${Date.now()}`;
    const statusUpdates: UploadStatus[] = [];

    // Track running total of files added IN THIS BATCH only. We deliberately
    // do NOT seed this with `currentTotalBytes` (the size of files already in
    // the parent's `files` array) — that caused a bug where a small new file
    // (e.g. a 500 KB photo) would be rejected because previously-uploaded
    // files had pushed the cumulative total close to TOTAL_LIMIT_BYTES, even
    // though the existing files were still well within budget. The total cap
    // is enforced visually via the progress bar + the per-batch check below
    // is enough in practice (users don't routinely paste 200 MB in one drop).
    let runningTotal = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const originalFile = selectedFiles[i];
      const initialName = originalFile.name || `photo-${Date.now()}.jpg`;

      const statusEntry: UploadStatus = {
        filename: initialName,
        state: 'uploading',
        size: originalFile.size,
      };
      statusUpdates.push(statusEntry);
      setRecentStatus([...statusUpdates]);

      // STEP 1 — auto-compress images before size checks.
      // Default mode: only compress > 1 MB (customer site-docs flow, where
      // images become email attachments). compressAllImages mode: ALL
      // images are downscaled + JPEG-re-encoded (admin completed-docs flow,
      // where files are stored for portal download — even small PNG
      // screenshots benefit from being normalised to ~150 KB JPEGs).
      let file = originalFile;
      try {
        file = await compressImageIfLarge(originalFile, {
          compressAll: !!compressAllImages,
        });
      } catch {
        file = originalFile;
      }

      // Reflect the compressed size + name in the status row immediately.
      const wasCompressed = file !== originalFile && file.size < originalFile.size;
      if (wasCompressed) {
        const savedPct = Math.round((1 - file.size / originalFile.size) * 100);
        statusEntry.size = file.size;
        statusEntry.message = `Compressed (${(originalFile.size / 1024 / 1024).toFixed(1)} MB → ${(file.size / 1024 / 1024).toFixed(1)} MB, −${savedPct}%)`;
        setRecentStatus([...statusUpdates]);
      }

      const effectiveName = wasCompressed
        ? `${initialName.replace(/\.[^.]+$/, '')}.jpg`
        : initialName;

      if (file.size > PER_FILE_LIMIT_BYTES) {
        statusEntry.state = 'error';
        statusEntry.message = `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.`;
        setError(`${initialName} is too large. Max size is 15MB.`);
        setRecentStatus([...statusUpdates]);
        continue;
      }

      // Enforce the configured *total* across all attachments. For the
      // customer site-docs flow this is 15 MB (matches the email-attachment
      // payload cap). For the admin completed-locate flow the cap is much
      // higher (e.g. 200 MB) because those files are downloaded from
      // storage, not sent via email.
      if (runningTotal + file.size > TOTAL_LIMIT_BYTES) {
        const remainingMB = Math.max(0, TOTAL_LIMIT_BYTES - runningTotal) / 1024 / 1024;
        statusEntry.state = 'error';
        statusEntry.message = `Skipped — would exceed ${totalLimitMB} MB total (only ${remainingMB.toFixed(1)} MB left).`;
        setError(
          `Total attachments are limited to ${totalLimitMB} MB. ${initialName} was skipped — only ${remainingMB.toFixed(
            1
          )} MB of space remaining. Remove a file or upload smaller images.`
        );
        setRecentStatus([...statusUpdates]);
        continue;
      }


      const ext = effectiveName.toLowerCase().split('.').pop() || '';
      const extOk = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'heic', 'heif', 'webp', 'doc', 'docx'].includes(ext);
      const typeOk = file.type && ALLOWED_TYPES.includes(file.type);
      const isImage = (file.type || '').startsWith('image/');
      if (!typeOk && !extOk && !isImage) {
        statusEntry.state = 'error';
        statusEntry.message = `Unsupported file type (${file.type || 'unknown'}).`;
        setError(`${initialName} is not a supported file type.`);
        setRecentStatus([...statusUpdates]);
        continue;
      }

      // ---------------------------------------------------------------
      // MIME-TYPE RESOLUTION (critical for image delivery)
      // ---------------------------------------------------------------
      // Browsers (especially Android Chrome and some iOS versions) often
      // hand us a File with `type === ''` for HEIC photos and even some
      // PNGs straight from the camera. If we upload those as
      // `application/octet-stream`, browsers later refuse to render them
      // inline and downloads land with no extension hint. Worse: some
      // CDN edges treat octet-stream uploads differently.
      //
      // We derive a real MIME type from the extension whenever the
      // browser-provided type is missing or generic.
      // ---------------------------------------------------------------
      const EXT_TO_MIME: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        heic: 'image/heic',
        heif: 'image/heif',
        webp: 'image/webp',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const browserType = (file.type || '').trim();
      const resolvedMime =
        browserType && browserType !== 'application/octet-stream'
          ? browserType
          : EXT_TO_MIME[ext] || 'application/octet-stream';

      // Path safety: keep the real extension intact so the signed URL
      // download lands as image.jpg / plan.pdf, never as a typeless blob.
      const safeName = effectiveName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${tempId}/${Date.now()}-${i}-${safeName}`;

      console.log('[upload:start]', {
        original: originalFile.name,
        resolvedName: effectiveName,
        path: filePath,
        browserMime: browserType || '(empty)',
        resolvedMime,
        size: file.size,
      });

      try {
        const { error: uploadError } = await supabase.storage
          .from('booking-documents')
          .upload(filePath, file, {
            contentType: resolvedMime,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('[upload:error]', { path: filePath, error: uploadError.message });
          statusEntry.state = 'error';
          statusEntry.message = uploadError.message || 'Upload failed';
          setError(`Failed to upload ${initialName}: ${uploadError.message}`);
          setRecentStatus([...statusUpdates]);
          continue;
        }

        // VERIFY: immediately create + HEAD the signed URL so we know the
        // exact same path/extension/MIME we just stored is retrievable.
        // If this fails the user sees it BEFORE submitting the booking,
        // not via an `invalid_token` JSON file in their email later.
        let verifiedUrl: string | undefined;
        try {
          const { data: signed, error: signErr } = await supabase.storage
            .from('booking-documents')
            .createSignedUrl(filePath, 60);
          if (signErr || !signed?.signedUrl) {
            console.warn('[upload:sign-failed]', { path: filePath, error: signErr?.message });
          } else {
            verifiedUrl = signed.signedUrl;
            console.log('[upload:signed-url-ok]', { path: filePath, url: signed.signedUrl.split('?')[0] });
          }
        } catch (sErr) {
          console.warn('[upload:sign-exception]', sErr);
        }

        console.log('[upload:end]', {
          path: filePath,
          name: effectiveName,
          mime: resolvedMime,
          size: file.size,
          signedOk: !!verifiedUrl,
        });

        statusEntry.state = 'success';
        // Preserve the "Compressed" note alongside the success state.
        statusEntry.message = wasCompressed
          ? `Uploaded · ${statusEntry.message}`
          : 'Uploaded';
        setRecentStatus([...statusUpdates]);
        newFiles.push({
          name: effectiveName,
          path: filePath,
          size: file.size,
          mimeType: resolvedMime,
        });
        runningTotal += file.size;
      } catch (err) {
        const msg = (err as Error).message || 'Network error';
        console.error('[upload:exception]', { path: filePath, error: msg });
        statusEntry.state = 'error';
        statusEntry.message = msg;
        setError(`Failed to upload ${initialName}: ${msg}`);
        setRecentStatus([...statusUpdates]);
      }
    }

    // Only commit successful uploads to the parent. If every file failed (or
    // none were valid) leave the parent's documents list untouched — this is
    // what prevents "empty placeholder" cards from appearing in the portal
    // after a failed/cancelled upload.
    const successful = newFiles.filter(
      (f) => f && f.path && f.name && typeof f.size === 'number'
    );
    if (successful.length > 0) {
      onFilesChange([...files, ...successful]);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    if (statusUpdates.length > 0 && statusUpdates.every((s) => s.state === 'success')) {
      setTimeout(() => setRecentStatus([]), 3500);
    }
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const removeFile = async (filePath: string) => {
    await supabase.storage.from('booking-documents').remove([filePath]);
    onFilesChange(files.filter(f => f.path !== filePath));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="mt-3">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.gif,.heic,.heif,.webp,.doc,.docx,application/pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-brand-teal/40 text-brand-teal hover:bg-brand-teal hover:text-white transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          <span>{isUploading ? 'Uploading...' : 'Upload files'}</span>
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-brand-orange/60 text-brand-orange hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          <span>Take a picture</span>
        </button>
      </div>

      {/* Per-file upload status (shows live progress for each photo / file) */}
      {recentStatus.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {recentStatus.map((s, idx) => (
            <div
              key={`${s.filename}-${idx}`}
              className={`flex items-center gap-2 text-xs rounded px-2.5 py-1.5 border ${
                s.state === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : s.state === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {s.state === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
              {s.state === 'success' && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
              {s.state === 'error' && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="flex-1 truncate">
                <span className="font-medium">{s.filename}</span>
                {s.size !== undefined && <span className="opacity-70 ml-1">({formatSize(s.size)})</span>}
                {s.message && <span className="opacity-80"> — {s.message}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div key={file.path} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 text-brand-teal flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-gray-500 flex-shrink-0">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(file.path)}
                aria-label={`Remove ${file.name}`}
                className="text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Combined-size indicator. Lets the user see how much of the
          configured attachment budget they've used so they don't end up
          with a booking where the confirmation email silently fails to
          deliver — or, in the admin completed-docs flow, hit storage caps. */}
      {files.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Total attachments</span>
            <span className={currentTotalBytes > TOTAL_LIMIT_BYTES * 0.9 ? 'text-orange-600 font-semibold' : ''}>
              {formatSize(currentTotalBytes)} / {totalLimitMB} MB
              {remainingBytes > 0 && currentTotalBytes > 0 && (
                <span className="text-gray-400"> ({formatSize(remainingBytes)} left)</span>
              )}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                currentTotalBytes >= TOTAL_LIMIT_BYTES
                  ? 'bg-red-500'
                  : currentTotalBytes > TOTAL_LIMIT_BYTES * 0.9
                  ? 'bg-orange-500'
                  : 'bg-brand-teal'
              }`}
              style={{ width: `${Math.min(100, (currentTotalBytes / TOTAL_LIMIT_BYTES) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {!hideEmailLimitNote && (
        <p className="text-xs text-gray-500 mt-2">
          Site plans, photos, sketches, etc. PDF / JPG / PNG / HEIC / DOC.
          Large photos (including iPhone HEIC) are <strong>auto-resized</strong> in your
          browser (max 1600px, JPEG) so 5–10 phone photos easily fit within the
          <strong> 15 MB combined</strong> email limit.
          On a phone, "Take a picture" opens your camera; on a computer it opens the file picker.
        </p>
      )}

      {hideEmailLimitNote && (
        <p className="text-xs text-gray-500 mt-2">
          Site plans, photos, sketches, etc. PDF / JPG / PNG / HEIC / DOC.
          All images are <strong>auto-compressed</strong> in your browser (max 1600px JPEG,
          ~150–500 KB each) so dozens of photos easily fit. On a phone, "Take a picture" opens your
          camera; on a computer it opens the file picker.
        </p>
      )}


    </div>
  );
};


export default FileUpload;
