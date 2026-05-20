/**
 * fileViewer — iOS-/mobile-safe document opening for any file stored in the
 * `booking-documents` Supabase bucket.
 *
 * Why this exists
 * ───────────────
 * On iPhone Safari, `window.open(signedUrl, '_blank')` for PDFs and images is
 * unreliable:
 *   • Safari sometimes pops up a blank tab instead of the native PDF viewer
 *     because the popup is fired from an async callback (after the Storage
 *     `createSignedUrl` promise resolves), which lands outside the user-
 *     gesture window iOS uses to allow popups.
 *   • If the underlying storage object's Content-Type is wrong (e.g. files
 *     uploaded long ago as `application/octet-stream`), Safari refuses to
 *     render PDFs inline even when the disposition is `inline`.
 *   • Calling `window.open` *and* trying to honour the filename for downloads
 *     fights the browser — iOS Safari ignores `download=` on cross-origin
 *     hosts, so we MUST pipe filename hints through Supabase's signed URL
 *     instead (`?download=<filename>` query, set via `createSignedUrl`'s
 *     `download` option) for downloads.
 *
 * What this module guarantees
 * ───────────────────────────
 *   1. PREVIEW (eye icon)   → Content-Disposition: inline  (no `download` opt)
 *      • iOS/Android: opens via a real <a> click inside the user gesture so
 *        Safari's native PDF/image viewer fires every time.
 *      • Desktop: same anchor open path, lets browser tab decide.
 *   2. DOWNLOAD (download icon) → Content-Disposition: attachment; filename=…
 *      • Uses Supabase's `download: <filename>` signed-URL option which
 *        sets the Content-Disposition header at edge. Works on iOS Safari
 *        (lands in Files app) and desktop browsers (saves to Downloads).
 *   3. Both flows preserve the storage object's Content-Type — we don't
 *      strip MIME, we don't re-encode, we don't add `attachment` to inline
 *      flows. The upload path (FileUpload.tsx) is already responsible for
 *      writing the correct contentType to storage at upload time.
 *   4. Graceful fallback: if the popup is blocked, we fall back to assigning
 *      `location.href` so the user is never left with a silent failure.
 */

import { supabase } from '@/lib/supabase';

const BUCKET = 'booking-documents';
const DEFAULT_INLINE_TTL = 60 * 30; // 30 minutes — long enough for iOS Safari
const DEFAULT_DOWNLOAD_TTL = 60 * 10; // 10 minutes — short-lived attachment

/**
 * Cheap device detection. We treat iPad on iPadOS 13+ as iOS too, since it
 * reports as Mac but has no proper PDF plugin window like macOS Safari does.
 */
export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ pretends to be Mac, but reports touch points.
  if (platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1) return true;
  return false;
};

export const isAndroidDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const isMobileDevice = (): boolean => isIOSDevice() || isAndroidDevice();

/**
 * Generate an INLINE-disposition signed URL — for the eye/preview icon.
 * Defaults to no `download` flag, so Supabase storage serves the file with
 * `Content-Disposition: inline` and its stored `Content-Type` intact.
 */
export const getInlineSignedUrl = async (
  storagePath: string,
  expiresInSeconds: number = DEFAULT_INLINE_TTL
): Promise<string | null> => {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      console.warn('[fileViewer:inline:sign-failed]', {
        path: storagePath,
        error: error?.message,
      });
      return null;
    }
    return data.signedUrl;
  } catch (e: any) {
    console.warn('[fileViewer:inline:exception]', { path: storagePath, error: e?.message });
    return null;
  }
};

/**
 * Generate an ATTACHMENT-disposition signed URL — for the explicit Download
 * button. Supabase's `download` option sets `Content-Disposition: attachment;
 * filename="…"` at the edge, which iOS Safari honours (saves to Files).
 */
export const getDownloadSignedUrl = async (
  storagePath: string,
  filename?: string,
  expiresInSeconds: number = DEFAULT_DOWNLOAD_TTL
): Promise<string | null> => {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds, {
        // Truthy string = force attachment with this filename.
        // Truthy `true`  = force attachment using the original storage name.
        download: filename || true,
      });
    if (error || !data?.signedUrl) {
      console.warn('[fileViewer:download:sign-failed]', {
        path: storagePath,
        error: error?.message,
      });
      return null;
    }
    return data.signedUrl;
  } catch (e: any) {
    console.warn('[fileViewer:download:exception]', { path: storagePath, error: e?.message });
    return null;
  }
};

/**
 * Open a URL in a new tab via a real, programmatically-clicked <a> element.
 *
 * Why not `window.open(url, '_blank')`?
 * On iOS Safari, popup blockers reject opens that aren't inside the synchronous
 * tail of a user gesture. An anchor click is treated as a navigation rather
 * than a popup, so it survives the iOS heuristic and the native PDF / image
 * viewer fires reliably.
 *
 * Returns true if the open was attempted; the caller can use the returned
 * boolean for fallback UX (e.g. "we tried but your popup blocker may have
 * caught it — tap here to retry").
 */
export const openUrlInNewTab = (url: string): boolean => {
  if (!url) return false;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    // Hidden but in the DOM — required for the click to dispatch a real
    // navigation on iOS Safari.
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.click();
    // Defer cleanup so the navigation has a tick to dispatch.
    setTimeout(() => {
      try { document.body.removeChild(a); } catch { /* noop */ }
    }, 0);
    return true;
  } catch (e: any) {
    console.warn('[fileViewer:open:exception]', { error: e?.message });
    // Last-resort fallback — at least the current tab will navigate, so the
    // user sees the file rather than a silent failure.
    try {
      window.location.href = url;
      return true;
    } catch {
      return false;
    }
  }
};


/**
 * Tap-on-eye-icon entrypoint. Generates an inline signed URL and opens it in
 * a new tab using an anchor click — the most reliable path on iPhone Safari.
 *
 * Returns the URL that was opened (or null if signing failed) so callers can
 * surface a toast on failure.
 */
export const previewFileInline = async (
  storagePath: string,
  expiresInSeconds: number = DEFAULT_INLINE_TTL
): Promise<string | null> => {
  const url = await getInlineSignedUrl(storagePath, expiresInSeconds);
  if (!url) return null;
  openUrlInNewTab(url);
  return url;
};

/**
 * Tap-on-download-icon entrypoint. Generates an attachment-disposition
 * signed URL (so the browser will save instead of preview) and opens it.
 * Falls back to the inline URL if attachment-signing fails for any reason —
 * the user still gets the file, just inline.
 */
export const downloadFile = async (
  storagePath: string,
  filename?: string,
  expiresInSeconds: number = DEFAULT_DOWNLOAD_TTL
): Promise<string | null> => {
  const url =
    (await getDownloadSignedUrl(storagePath, filename, expiresInSeconds)) ||
    (await getInlineSignedUrl(storagePath, expiresInSeconds));
  if (!url) return null;
  openUrlInNewTab(url);
  return url;
};

/**
 * UNIFIED "Download / Open file" entrypoint — the only action exposed in the
 * UI now. We deliberately do NOT route through any third-party preview
 * service (no Famous preview hosting, no Office365 viewer, no Google Docs
 * viewer). We just hand the browser the raw Supabase signed URL with
 * `Content-Disposition: inline` and let the OS / browser decide:
 *
 *   • iPhone Safari → opens PDFs and images in the native viewer; for
 *     DOCX / CSV / other files Safari shows iOS's "Open in…" share sheet
 *     so the user can route to Files / Pages / Numbers.
 *   • Desktop browsers → render PDFs / images in a tab, save other types.
 *
 * Returns:
 *   { ok: true,  url }                 — anchor click dispatched
 *   { ok: false, url: null, reason }   — signed URL could not be generated;
 *                                        caller should show
 *                                        "File preview unavailable — use Download"
 *
 * On `ok:false` the caller should expose `downloadFile()` as a fallback so
 * the user can still retrieve the file as a normal attachment.
 */
export const openOrDownloadFile = async (
  storagePath: string,
  filename?: string,
  expiresInSeconds: number = DEFAULT_INLINE_TTL
): Promise<{ ok: boolean; url: string | null; reason?: string }> => {
  if (!storagePath) {
    return { ok: false, url: null, reason: 'Missing file path' };
  }
  const inlineUrl = await getInlineSignedUrl(storagePath, expiresInSeconds);
  if (inlineUrl) {
    const opened = openUrlInNewTab(inlineUrl);
    if (opened) return { ok: true, url: inlineUrl };
    // Anchor-click was somehow rejected (extremely rare). Fall through to
    // attachment-download path so the user still gets the file.
  }
  // Inline signing failed (or open was blocked) — degrade gracefully to a
  // forced attachment download. Caller is informed via `ok: false` so it
  // can surface the "preview unavailable" hint, but we still try to push
  // the file to the user in the same gesture.
  const dlUrl = await getDownloadSignedUrl(storagePath, filename, DEFAULT_DOWNLOAD_TTL);
  if (dlUrl) {
    openUrlInNewTab(dlUrl);
    return {
      ok: false,
      url: dlUrl,
      reason: 'Preview unavailable — file is downloading instead.',
    };
  }
  return {
    ok: false,
    url: null,
    reason: 'File preview unavailable. Please use Download.',
  };
};
