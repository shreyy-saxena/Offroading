import type { EmailDeliveryStatus, ReporterType } from "@/lib/reports/submit-report";
import { deleteReportPhoto } from "@/lib/storage/report-photos";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type AdminReport = {
  id: string;
  photoUrl: string;
  locality: string;
  district: string;
  reporterType: ReporterType;
  reporterName: string | null;
  reporterMobile: string | null;
  reporterEmail: string | null;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailErrorDetail: string | null;
  createdAt: string;
};

const ADMIN_REPORT_COLUMNS =
  "id, photo_url, locality, district, reporter_type, reporter_name, reporter_mobile, reporter_email, email_delivery_status, email_error_detail, created_at";

type AdminReportRow = {
  id: string;
  photo_url: string;
  locality: string;
  district: string;
  reporter_type: ReporterType;
  reporter_name: string | null;
  reporter_mobile: string | null;
  reporter_email: string | null;
  email_delivery_status: EmailDeliveryStatus;
  email_error_detail: string | null;
  created_at: string;
};

function mapRow(row: AdminReportRow): AdminReport {
  return {
    id: row.id,
    photoUrl: row.photo_url,
    locality: row.locality,
    district: row.district,
    reporterType: row.reporter_type,
    reporterName: row.reporter_name,
    reporterMobile: row.reporter_mobile,
    reporterEmail: row.reporter_email,
    emailDeliveryStatus: row.email_delivery_status,
    emailErrorDetail: row.email_error_detail,
    createdAt: row.created_at,
  };
}

// Ticket 16's "view reports" — unlike the public feed (ticket 11), this
// includes reporter contact fields and delivery diagnostics (FR4), so it
// reads via the service-role client straight from `reports`, never the
// privacy-filtered `public_reports` view. A plain Server Component data
// read reached only through the (protected) layout's render tree — not a
// Server Action, so the layout's admin check already covers it.
export async function listAdminReports(): Promise<AdminReport[]> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("reports")
    .select(ADMIN_REPORT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map(mapRow);
}

// `reports.photo_url` stores the full public URL (what uploadReportPhoto
// returns), not the bare storage path deleteReportPhoto needs — there's
// no separate path column, so it's recovered from the URL itself. Only
// ever used for cleanup below; a URL that doesn't match the expected
// shape just means nothing to clean up (defensive, not expected in
// practice — every report's photo went through uploadReportPhoto).
const REPORT_PHOTOS_BUCKET_SEGMENT = "/report-photos/";
function extractStoragePath(photoUrl: string): string | null {
  const index = photoUrl.indexOf(REPORT_PHOTOS_BUCKET_SEGMENT);
  if (index === -1) return null;
  return decodeURIComponent(photoUrl.slice(index + REPORT_PHOTOS_BUCKET_SEGMENT.length));
}

// Admin-only, irreversible (caller — the Server Action — is responsible
// for re-checking admin status; this function trusts its caller, same
// pattern as replaceDistrictMapping). Deletes the report rows first
// (the part a citizen or admin can actually observe), then best-effort
// cleans up each photo from Storage — a photo failing to delete just
// leaves an orphaned file, not a dangling reference anything can reach,
// so it's not allowed to fail the whole operation.
export async function deleteReports(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const db = createServiceRoleClient();
  const { data: rows, error: fetchError } = await db.from("reports").select("photo_url").in("id", ids);
  if (fetchError) throw fetchError;

  const { error: deleteError } = await db.from("reports").delete().in("id", ids);
  if (deleteError) throw deleteError;

  await Promise.all(
    (rows ?? []).map((row) => {
      const path = extractStoragePath(row.photo_url);
      return path ? deleteReportPhoto(path).catch(() => {}) : Promise.resolve();
    }),
  );
}
