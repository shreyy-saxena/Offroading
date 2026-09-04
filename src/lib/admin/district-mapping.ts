import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDistrictMappingCsv, type DistrictMappingRow } from "@/lib/csv/district-mapping";
import { sendComplaintEmail, sendQueuedReportConfirmation } from "@/lib/email/deliver-report-email";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type UploadMappingResult =
  | { outcome: "replaced"; districtCount: number; triggeredSends: number }
  | { outcome: "invalid"; errors: string[] };

type QueuedReportRow = {
  id: string;
  photo_url: string;
  locality: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  reporter_type: "passerby" | "resident";
  reporter_name: string;
  reporter_mobile: string;
  reporter_email: string;
};

// A currently-`queued` report's district necessarily had no mapping as of
// submission (ticket 08 only queues when lookupAuthorityEmail returns
// null) — so any district that appears in a freshly-replaced mapping is,
// by construction, newly covered. No need to diff the old mapping against
// the new one.
async function triggerQueuedReports(db: SupabaseClient, rows: DistrictMappingRow[]): Promise<number> {
  const authorityEmailByDistrict = new Map(rows.map((row) => [row.district, row.authorityEmail]));
  const districts = [...authorityEmailByDistrict.keys()];
  if (districts.length === 0) return 0;

  const { data: queuedReports, error } = await db
    .from("reports")
    .select("id, photo_url, locality, district, latitude, longitude, reporter_type, reporter_name, reporter_mobile, reporter_email")
    .eq("email_delivery_status", "queued")
    .in("district", districts);
  if (error) throw error;

  let triggered = 0;
  for (const report of (queuedReports ?? []) as QueuedReportRow[]) {
    const authorityEmail = authorityEmailByDistrict.get(report.district);
    if (!authorityEmail) continue; // defensive — can't happen given the .in() filter above

    const outcome = await sendComplaintEmail(
      {
        photoUrl: report.photo_url,
        locality: report.locality,
        district: report.district,
        latitude: report.latitude,
        longitude: report.longitude,
        reporterType: report.reporter_type,
        reporterName: report.reporter_name,
        reporterMobile: report.reporter_mobile,
        reporterEmail: report.reporter_email,
      },
      authorityEmail,
    );

    const { error: updateError } = await db
      .from("reports")
      .update({
        email_delivery_status: outcome.status,
        email_error_detail: outcome.status === "failed" ? outcome.error : null,
      })
      .eq("id", report.id);
    if (updateError) throw updateError;

    if (outcome.status === "sent") {
      triggered++;
      // Best-effort: the complaint send already succeeded and is already
      // persisted above, so a confirmation-email failure shouldn't undo
      // or re-flag that outcome — it's a courtesy notice, not the report's
      // delivery status.
      await sendQueuedReportConfirmation({
        to: report.reporter_email,
        locality: report.locality,
        district: report.district,
      });
    }
  }

  return triggered;
}

// PRD Section 6 Step 2 / FR5 / FR6 / spec stories 20-23. Caller (the
// Server Action) is responsible for the admin re-check — Server Actions
// are reachable as direct POST requests regardless of what page rendered
// them, so a page-level guard (ticket 14's layout) does not protect this
// function's entry point on its own.
export async function replaceDistrictMapping(csvText: string): Promise<UploadMappingResult> {
  const parsed = parseDistrictMappingCsv(csvText);
  if (!parsed.ok) {
    return { outcome: "invalid", errors: parsed.errors };
  }

  const db = createServiceRoleClient();

  // Delete-all + insert happens inside this one Postgres function call —
  // one function call is one implicit transaction, so a mid-upload
  // failure can never leave district_mapping partially replaced (see the
  // migration's own comment for why this couldn't be done as two plain
  // supabase-js calls).
  const { error: replaceError } = await db.rpc("replace_district_mapping", {
    rows: parsed.rows.map((row) => ({ district: row.district, authority_email: row.authorityEmail })),
  });
  if (replaceError) throw replaceError;

  const triggeredSends = await triggerQueuedReports(db, parsed.rows);

  return { outcome: "replaced", districtCount: parsed.rows.length, triggeredSends };
}

export type DistrictMappingEntry = { district: string; authorityEmail: string };

// Ticket 16's "view current mapping" — a plain Server Component data
// read reached only through the (protected) layout's render tree (unlike
// replaceDistrictMapping above, this isn't a Server Action, so the
// layout's admin check does cover it; nothing extra to re-check here).
export async function listDistrictMapping(): Promise<DistrictMappingEntry[]> {
  const db = createServiceRoleClient();
  const { data, error } = await db.from("district_mapping").select("district, authority_email").order("district");
  if (error) throw error;

  return (data ?? []).map((row) => ({ district: row.district, authorityEmail: row.authority_email }));
}
