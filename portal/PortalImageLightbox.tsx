import React, { useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface LightboxImage {
  name: string;
  url: string;
  path: string;
}

interface PortalImageLightboxProps {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  onDownload?: (img: LightboxImage) => void;
}

const PortalImageLightbox: React.FC<PortalImageLightboxProps> = ({
  images, index, onClose, onIndexChange, onDownload,
}) => {
  const current = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) onIndexChange(index + 1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, images.length, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {onDownload && (
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(current); }}
          className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
          aria-label="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      )}

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={current.url}
          src={current.url}
          alt={current.name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          loading="eager"
        />
        <div className="mt-3 text-white/90 text-sm flex items-center gap-3">
          <span className="font-medium truncate max-w-[60vw]">{current.name}</span>
          <span className="text-white/50">{index + 1} / {images.length}</span>
        </div>
      </div>
    </div>
  );
};

export default PortalImageLightbox;
