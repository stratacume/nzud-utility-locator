import React, { useCallback, useId, useState } from 'react';
import { X, Loader2, ImageIcon, Camera, FolderOpen } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompression';
import { useToast } from '@/hooks/use-toast';


export interface ShowcaseImage {
  url: string;
  path: string;
  caption?: string;
}

interface Props {
  label: string;
  hint?: string;
  multiple?: boolean;
  value: ShowcaseImage | ShowcaseImage[] | null;
  onChange: (value: ShowcaseImage | ShowcaseImage[] | null) => void;
  maxFiles?: number;
}

/**
 * Mobile-reliable file picker.
 *
 * IMPORTANT: We use <label htmlFor> wrapping the visible "buttons" instead of
 * programmatic `.click()` on hidden inputs. iOS Safari often refuses to open
 * the picker from a programmatic click — even when the input is only
 * visually-hidden — because the click is no longer considered a direct user
 * gesture in many edge cases. A real <label> click is always honoured.
 *
 * We expose THREE inputs / labels:
 *  1) Photo library (no `capture` attr → opens iOS photo picker / Android gallery)
 *  2) Camera (`capture="environment"` → opens rear camera on phones)
 *  3) Files browser (no `accept` attr → opens iOS Files / Android file manager,
 *     allowing iCloud Drive, Google Drive, Downloads, etc.)
 */
const ShowcaseImageUpload: React.FC<Props> = ({
  label,
  hint,
  multiple = false,
  value,
  onChange,
  maxFiles = 10,
}) => {
  const uid = useId();
  const photoId = `showcase-photo-${uid}`;
  const cameraId = `showcase-camera-${uid}`;
  const filesId = `showcase-files-${uid}`;

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const { toast } = useToast();


  const items: ShowcaseImage[] = multiple
    ? Array.isArray(value) ? value : []
    : value ? [value as ShowcaseImage] : [];

  const uploadOne = async (file: File): Promise<ShowcaseImage | null> => {
    try {
      const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.82 });
      const token = sessionStorage.getItem('admin_token') || '';
      const { data, error } = await supabase.functions.invoke('manage-showcase-jobs', {
        body: {
          action: 'upload-image',
          token,
          filename: compressed.filename,
          contentType: compressed.contentType,
          dataBase64: compressed.dataBase64,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');
      return { url: data.url, path: data.path };
    } catch (e: any) {
      toast({
        title: 'Upload failed',
        description: e?.message || 'Could not upload image',
        variant: 'destructive',
      });
      return null;
    }
  };

  const resetInput = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = '';
  };

  const handleFiles = useCallback(
    async (files: FileList | File[], sourceId?: string) => {
      const all = Array.from(files);
      const arr = all.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
      const skipped = all.length - arr.length;
      if (skipped > 0) {
        toast({
          title: skipped === all.length ? 'No images selected' : 'Some files skipped',
          description:
            'Only image files (JPG, PNG, WebP, HEIC) can be added to the showcase. PDFs and other documents are not supported here.',
          variant: skipped === all.length ? 'destructive' : undefined,
        });
      }
      if (!arr.length) {
        if (sourceId) resetInput(sourceId);
        return;
      }
      setBusy(true);
      try {
        if (multiple) {
          const remaining = Math.max(0, maxFiles - items.length);
          const toProcess = arr.slice(0, remaining);
          if (toProcess.length < arr.length) {
            toast({
              title: 'Limit reached',
              description: `Only ${remaining} more image(s) can be added.`,
            });
          }
          const next: ShowcaseImage[] = [...items];
          setProgress({ done: 0, total: toProcess.length });
          for (let i = 0; i < toProcess.length; i++) {
            const r = await uploadOne(toProcess[i]);
            if (r) next.push(r);
            setProgress({ done: i + 1, total: toProcess.length });
          }
          onChange(next);
        } else {
          const r = await uploadOne(arr[0]);
          if (r) onChange(r);
        }
      } finally {
        setBusy(false);
        setProgress(null);
        resetInput(photoId);
        resetInput(cameraId);
        resetInput(filesId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, multiple, maxFiles, onChange],
  );


  const remove = (idx: number) => {
    if (multiple) {
      const next = items.filter((_, i) => i !== idx);
      onChange(next);
    } else {
      onChange(null);
    }
  };

  // Shared classes for the label-as-button styling
  const primaryBtn =
    'inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-md text-sm font-semibold hover:bg-brand-navy/90 cursor-pointer select-none';
  const orangeBtn =
    'inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-md text-sm font-semibold hover:bg-brand-orange/90 cursor-pointer select-none sm:hidden';
  const ghostBtn =
    'inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-50 cursor-pointer select-none';
  const disabledStyle = busy ? 'opacity-50 pointer-events-none' : '';

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          drag ? 'border-brand-orange bg-orange-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        {/* The hidden inputs are NOT display:none — iOS Safari will refuse to open
            them. They're visually hidden via sr-only-style positioning, and each
            has a matching <label htmlFor> rendered as a button. */}
        <input
          id={photoId}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length) {
              handleFiles(e.target.files, photoId);
            }
          }}
        />
        <input
          id={cameraId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length) {
              handleFiles(e.target.files, cameraId);
            }
          }}
        />
        <input
          id={filesId}
          type="file"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length) {
              handleFiles(e.target.files, filesId);
            }
          }}
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <label htmlFor={photoId} className={`${primaryBtn} ${disabledStyle}`}>
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress ? `Uploading ${progress.done}/${progress.total}…` : 'Uploading…'}
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                {multiple ? 'Photo library' : items.length ? 'Replace from photos' : 'Choose from photos'}
              </>
            )}
          </label>

          <label
            htmlFor={cameraId}
            className={`${orangeBtn} ${disabledStyle}`}
            aria-label="Take a photo"
          >
            <Camera className="w-4 h-4" />
            Take photo
          </label>

          <label
            htmlFor={filesId}
            className={`${ghostBtn} ${disabledStyle}`}
            aria-label="Browse files"
          >
            <FolderOpen className="w-4 h-4" />
            Browse files
          </label>
        </div>

        <p className="text-xs text-gray-500 mt-2 hidden sm:block">
          or drag &amp; drop {multiple ? 'images' : 'an image'} here
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Auto-compressed &amp; resized · JPG / PNG / WebP / HEIC
        </p>
      </div>


      {items.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            multiple ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' : 'grid-cols-1'
          }`}
        >
          {items.map((img, idx) => (
            <div
              key={img.path + idx}
              className="relative group aspect-square rounded-md overflow-hidden bg-gray-100 border"
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow opacity-90"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !busy && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <ImageIcon className="w-3.5 h-3.5" /> No image{multiple ? 's' : ''} yet
        </div>
      )}
    </div>
  );
};

export default ShowcaseImageUpload;
