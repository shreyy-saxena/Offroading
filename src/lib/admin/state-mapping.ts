import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStateMappingCsv, type StateMappingRow } from "@/lib/csv/state-mapping";
import { DISTRICTS, findCanonicalDistrict } from "@/lib/data/districts";
import { sendComplaintEmail, sendQueuedReportConfirmation } from "@/lib/email/deliver-report-email";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type UploadMappingResult =
  | { outcome: "replaced"; stateCount: number; triggeredSends: number }
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

// A currently-`queued` report's district necessarily had no covering
// state on file as of submission (ticket 08 only queues when
// lookupAuthorityEmails returns null) — so any state that appears in a
// freshly-replaced mapping newly covers every queued report sitting in
// one of that state's districts. No need to diff the old mapping against
// the new one.
async function triggerQueuedReports(db: SupabaseClient, rows: StateMappingRow[]): Promise<number> {
  const authorityEmailsByState = new Map(rows.map((row) => [row.state, row.authorityEmails]));
  const coveredStates = new Set(authorityEmailsByState.keys());
  if (coveredStates.size === 0) return 0;

  // The mapping is keyed by state, but `reports.district` is what's on
  // each row — expand the covered states out to every district within
  // them so the query can still filter on `reports.district`.
  const districts = DISTRICTS.filter((d) => coveredStates.has(d.state)).map((d) => d.name);
  if (districts.length === 0) return 0;

  const { data: queuedReports, error } = await db
    .from("reports")
    .select("id, photo_url, locality, district, latitude, longitude, reporter_type, reporter_name, reporter_mobile, reporter_email")
    .eq("email_delivery_status", "queued")
    .in("district", districts);
  if (error) throw error;

  let triggered = 0;
  for (const report of (queuedReports ?? []) as QueuedReportRow[]) {
    const state = findCanonicalDistrict(report.district)?.state;
    const authorityEmails = state ? authorityEmailsByState.get(state) : undefined;
    if (!authorityEmails) continue; // defensive — can't happen given the .in() filter above

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
      authorityEmails,
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

// Fallback for state-level authority-email mapping — collecting a
// separate email per district isn't logistically possible, so an admin
// instead uploads one or more authority addresses per state, and every
// district within that state routes complaint emails there. Caller (the
// Server Action) is responsible for the admin re-check — Server Actions
// are reachable as direct POST requests regardless of what page rendered
// them, so a page-level guard (ticket 14's layout) does not protect this
// function's entry point on its own.
export async function replaceStateMapping(csvText: string): Promise<UploadMappingResult> {
  const parsed = parseStateMappingCsv(csvText);
  if (!parsed.ok) {
    return { outcome: "invalid", errors: parsed.errors };
  }

  const db = createServiceRoleClient();

  // Delete-all + insert happens inside this one Postgres function call —
  // one function call is one implicit transaction, so a mid-upload
  // failure can never leave state_mapping partially replaced (see the
  // migration's own comment for why this couldn't be done as two plain
  // supabase-js calls).
  const { error: replaceError } = await db.rpc("replace_state_mapping", {
    rows: parsed.rows.map((row) => ({ state: row.state, authority_emails: row.authorityEmails })),
  });
  if (replaceError) throw replaceError;

  const triggeredSends = await triggerQueuedReports(db, parsed.rows);

  return { outcome: "replaced", stateCount: parsed.rows.length, triggeredSends };
}

export type StateMappingEntry = { state: string; authorityEmails: string[] };

// Admin's "view current mapping" — a plain Server Component data read
// reached only through the (protected) layout's render tree (unlike
// replaceStateMapping above, this isn't a Server Action, so the layout's
// admin check does cover it; nothing extra to re-check here).
export async function listStateMapping(): Promise<StateMappingEntry[]> {
  const db = createServiceRoleClient();
  const { data, error } = await db.from("state_mapping").select("state, authority_emails").order("state");
  if (error) throw error;

  return (data ?? []).map((row) => ({ state: row.state, authorityEmails: row.authority_emails }));
}
