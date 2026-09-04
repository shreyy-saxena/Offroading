import type { EmailDeliveryStatus, ReporterType } from "@/lib/reports/submit-report";
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
