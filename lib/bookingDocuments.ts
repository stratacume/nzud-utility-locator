/**
 * Persistence layer for the customer-portal Job Centre.
 *
 * The `booking_documents` table is the SOURCE OF TRUTH for any file that
 * has been uploaded against a booking — both customer-uploaded site
 * documents/photos and NZUD-uploaded completed locate reports.
 *
 * Why a dedicated table?
 *
 * The legacy `bookings.documents` column is `text[]` (an array of storage
 * paths). It was never structured to store filename / size / MIME type /
 * uploader / timestamp, so portal uploads tried to coerce JSON-ish objects
 * into that text[] column and the rich metadata silently disappeared on
 * refresh — which is what caused the "uploaded files vanish when I come
 * back to the booking" bug.
 *
 * `booking_documents` stores the full record per file. The portal reads
 * from THIS table on every booking-detail open (no React-state-only docs),
 * which makes uploads survive refresh, logout/login, and tab close.
 */
import { supabase } from '@/lib/supabase';
import { UploadedDocument } from '@/components/booking/BookingDetails';

export interface BookingDocumentRow {
  id: string;
  booking_id: string;
  booking_reference: string | null;
  customer_email: string | null;
  original_filename: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: string; // 'customer' | 'completed' | 'admin'
  uploaded_at: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface NewBookingDocument {
  booking_id: string;
  booking_reference?: string | null;
  customer_email?: string | null;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type?: string | null;
  document_type?: 'customer' | 'completed' | 'admin';
  uploaded_by?: string | null;
}

/** Convert a DB row into the UI's `UploadedDocument` shape so existing
 *  components (PortalDocumentItem, PortalImageLightbox, etc.) keep working. */
export const rowToDoc = (r: BookingDocumentRow): UploadedDocument => ({
  name: r.original_filename,
  path: r.storage_path,
  size: r.file_size || 0,
  mimeType: r.mime_type || undefined,
  category: (r.document_type === 'completed' ? 'completed' : 'customer') as
    | 'customer'
    | 'completed',
  uploaded_at: r.uploaded_at,
});

/** Fetch every document for a single booking (customer + completed). */
export async function fetchDocumentsForBooking(
  bookingId: string
): Promise<BookingDocumentRow[]> {
  console.log('[booking_documents:fetch:start]', { bookingId });
  const { data, error } = await supabase
    .from('booking_documents')
    .select('*')
    .eq('booking_id', bookingId)
    .order('uploaded_at', { ascending: false });
  if (error) {
    console.error('[booking_documents:fetch:error]', { bookingId, error: error.message });
    throw error;
  }
  console.log('[booking_documents:fetch:ok]', { bookingId, count: data?.length || 0 });
  return data || [];
}

/** Fetch every document for every booking owned by this customer. Used to
 *  pre-populate dashboard counts and booking-card pills without N round-trips. */
export async function fetchDocumentsForCustomer(
  customerEmail: string
): Promise<BookingDocumentRow[]> {
  if (!customerEmail) return [];
  console.log('[booking_documents:fetch-customer:start]', { customerEmail });
  const { data, error } = await supabase
    .from('booking_documents')
    .select('*')
    .eq('customer_email', customerEmail.toLowerCase())
    .order('uploaded_at', { ascending: false });
  if (error) {
    console.error('[booking_documents:fetch-customer:error]', {
      customerEmail,
      error: error.message,
    });
    throw error;
  }
  console.log('[booking_documents:fetch-customer:ok]', {
    customerEmail,
    count: data?.length || 0,
  });
  return data || [];
}

/** Insert one or more newly-uploaded files. Returns the inserted rows. */
export async function insertBookingDocuments(
  rows: NewBookingDocument[]
): Promise<BookingDocumentRow[]> {
  if (!rows.length) return [];
  // Defensive: drop anything missing the required fields. Storage was already
  // confirmed by FileUpload before we get here, so an empty list means a
  // failed upload and we MUST NOT create a phantom DB record.
  const clean = rows
    .filter((r) => r && r.booking_id && r.storage_path && r.original_filename)
    .map((r) => ({
      booking_id: r.booking_id,
      booking_reference: r.booking_reference ?? null,
      customer_email: r.customer_email?.toLowerCase() ?? null,
      original_filename: r.original_filename,
      storage_path: r.storage_path,
      file_size: typeof r.file_size === 'number' ? r.file_size : 0,
      mime_type: r.mime_type ?? null,
      document_type: r.document_type ?? 'customer',
      uploaded_by: r.uploaded_by ?? null,
    }));
  if (!clean.length) {
    console.warn('[booking_documents:insert] all rows invalid, skipping insert', { rows });
    return [];
  }
  console.log('[booking_documents:insert:start]', {
    count: clean.length,
    paths: clean.map((c) => c.storage_path),
  });
  const { data, error } = await supabase
    .from('booking_documents')
    .insert(clean)
    .select('*');
  if (error) {
    console.error('[booking_documents:insert:error]', {
      error: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    });
    throw error;
  }
  console.log('[booking_documents:insert:ok]', { inserted: data?.length || 0 });
  return data || [];
}

/** Delete a document row + its underlying storage object. */
export async function deleteBookingDocument(row: BookingDocumentRow | { id: string; storage_path: string }) {
  console.log('[booking_documents:delete:start]', {
    id: row.id,
    path: row.storage_path,
  });
  // 1) Remove the storage object first (best-effort — not fatal if it's
  //    already gone, e.g. an admin removed it manually).
  try {
    const { error: storageErr } = await supabase.storage
      .from('booking-documents')
      .remove([row.storage_path]);
    if (storageErr) {
      console.warn('[booking_documents:delete:storage-warn]', {
        path: row.storage_path,
        error: storageErr.message,
      });
    }
  } catch (e: any) {
    console.warn('[booking_documents:delete:storage-exception]', {
      path: row.storage_path,
      error: e?.message,
    });
  }

  // 2) Remove the DB record (this is what stops it appearing in the portal).
  const { error } = await supabase.from('booking_documents').delete().eq('id', row.id);
  if (error) {
    console.error('[booking_documents:delete:db-error]', {
      id: row.id,
      error: error.message,
    });
    throw error;
  }
  console.log('[booking_documents:delete:ok]', { id: row.id });
}

/** Group customer-wide documents into a `Record<bookingId, rows>` for fast
 *  lookups when rendering the dashboard / bookings list. */
export function groupByBooking(rows: BookingDocumentRow[]): Record<string, BookingDocumentRow[]> {
  const out: Record<string, BookingDocumentRow[]> = {};
  for (const r of rows) {
    if (!r.booking_id) continue;
    (out[r.booking_id] ||= []).push(r);
  }
  return out;
}

/** Generate a short-lived signed URL for a stored file. Logs structured
 *  failures so the portal "Unable to generate download link" toast is
 *  always traceable in browser console + edge logs. */
export async function getSignedUrl(storagePath: string, expiresInSeconds = 60 * 5) {
  if (!storagePath) {
    console.warn('[booking_documents:sign] missing storage_path');
    return null;
  }
  try {
    const { data, error } = await supabase.storage
      .from('booking-documents')
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      console.error('[booking_documents:sign:error]', {
        path: storagePath,
        error: error?.message,
      });
      return null;
    }
    return data.signedUrl;
  } catch (e: any) {
    console.error('[booking_documents:sign:exception]', {
      path: storagePath,
      error: e?.message,
    });
    return null;
  }
}
