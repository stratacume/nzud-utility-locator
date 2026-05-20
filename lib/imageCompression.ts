// Lightweight client-side image compression + base64 helper.
// Uses canvas to resize/recompress so we never upload massive
// originals from a phone camera. Falls back gracefully if the
// browser can't decode the file.

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0..1, JPEG/WebP only
  mimeType?: string;
}

export interface CompressedImage {
  blob: Blob;
  dataBase64: string; // raw base64, no data: prefix
  width: number;
  height: number;
  contentType: string;
  filename: string;
  sizeBytes: number;
}

function readAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = src;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      const idx = s.indexOf(',');
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.onerror = () => reject(r.error || new Error('Read failed'));
    r.readAsDataURL(blob);
  });
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<CompressedImage> {
  const maxWidth = opts.maxWidth ?? 1920;
  const maxHeight = opts.maxHeight ?? 1920;
  const quality = opts.quality ?? 0.82;
  const targetMime =
    opts.mimeType || (file.type === 'image/png' ? 'image/jpeg' : file.type) || 'image/jpeg';

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
      targetMime,
      quality,
    );
  });

  const dataBase64 = await blobToBase64(blob);
  const ext = targetMime === 'image/webp' ? 'webp' : targetMime === 'image/png' ? 'png' : 'jpg';
  const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
  return {
    blob,
    dataBase64,
    width,
    height,
    contentType: targetMime,
    filename: `${baseName}.${ext}`,
    sizeBytes: blob.size,
  };
}

export async function compressThumbnail(file: File): Promise<CompressedImage> {
  return compressImage(file, { maxWidth: 480, maxHeight: 480, quality: 0.78 });
}
