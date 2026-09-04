import { isKnownDistrict } from "@/lib/data/districts";
import { sendComplaintEmail } from "@/lib/email/deliver-report-email";
import { checkSubmissionRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/reports/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type ReporterType = "passerby" | "resident";
export type EmailDeliveryStatus = "not_applicable" | "sent" | "failed" | "queued";

// Everything the flow has gathered by the time a citizen reaches
// log-or-email (ticket 07) — the common ground every terminal path (this
// ticket) inserts from. latitude/longitude are null for a report reached
// via ticket 06's manual-locality path (no device GPS reading exists).
export type BaseReportInput = {
  photoUrl: string;
  latitude: number | null;
  longitude: number | null;
  locality: string;
  district: string;
  reporterType: ReporterType;
};

export type ContactDetails = {
  name: string;
  mobile: string;
  email: string;
};

export class InvalidReportInputError extends Error {}

// Server-side re-validation (acceptance criteria: district resolution
// isn't trusted from client-only state) — a Server Action is a real
// network endpoint, not just an RPC the client controls; a client
// submitting straight to it could pass any string as `district` without
// this check.
export function assertValidReportInput(input: BaseReportInput): void {
  if (!input.photoUrl.trim()) throw new InvalidReportInputError("A photo is required.");
  if (!input.locality.trim()) throw new InvalidReportInputError("A locality is required.");
  if (!isKnownDistrict(input.district)) {
    throw new InvalidReportInputError(`"${input.district}" is not a recognized district.`);
  }
}

function assertValidContactDetails(contact: ContactDetails): void {
  if (!contact.name.trim()) throw new InvalidReportInputError("A name is required.");
  if (!contact.mobile.trim()) throw new InvalidReportInputError("A mobile number is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    throw new InvalidReportInputError("A valid email address is required.");
  }
}

type InsertReportParams = BaseReportInput & {
  contact?: ContactDetails;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailErrorDetail?: string;
};

// Single INSERT path every terminal outcome funnels through (FR3: a
// report is always saved, regardless of which path was taken). There's
// no "pending" status in the DB's CHECK constraint, so this is only ever
// called once the final status is already known — never followed by an
// UPDATE for this ticket's paths.
export async function insertReport(params: InsertReportParams): Promise<{ id: string }> {
  assertValidReportInput(params);
  if (params.contact) assertValidContactDetails(params.contact);

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("reports")
    .insert({
      photo_url: params.photoUrl,
      latitude: params.latitude,
      longitude: params.longitude,
      locality: params.locality,
      district: params.district,
      reporter_type: params.reporterType,
      reporter_name: params.contact?.name ?? null,
      reporter_mobile: params.contact?.mobile ?? null,
      reporter_email: params.contact?.email ?? null,
      email_delivery_status: params.emailDeliveryStatus,
      email_error_detail: params.emailErrorDetail ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

// district_mapping has no RLS policies at all (ticket 02) — only reachable
// via the service-role client, same as this whole module.
export async function lookupAuthorityEmail(district: string): Promise<string | null> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("district_mapping")
    .select("authority_email")
    .eq("district", district)
    .maybeSingle();

  if (error) throw error;
  return data?.authority_email ?? null;
}

// --- Ticket 17: rate-limit-gated submission orchestration ---
//
// These take an already-resolved `rateLimitIdentifier` rather than
// reaching for next/headers themselves, so they're callable directly from
// a plain test with no real Next.js request context — the thin "use
// server" wrappers in src/app/actions/submit-report.ts resolve the
// identifier from the request and delegate here. Mirrors ticket 14's
// signInAdmin/signInAdminAction split for the same reason (next/headers'
// headers(), like cookies(), throws "called outside a request scope"
// when invoked from a plain vitest test — confirmed directly before
// writing this split).

export type RateLimitedResult = { outcome: "rate-limited"; message: string };

async function checkRateLimit(rateLimitIdentifier: string): Promise<RateLimitedResult | null> {
  const { allowed } = await checkSubmissionRateLimit(rateLimitIdentifier);
  return allowed ? null : { outcome: "rate-limited", message: RATE_LIMIT_MESSAGE };
}

async function sendAndInsertReport(
  input: BaseReportInput,
  contact: ContactDetails,
  targetEmail: string,
): Promise<{ id: string }> {
  const outcome = await sendComplaintEmail(
    {
      photoUrl: input.photoUrl,
      locality: input.locality,
      district: input.district,
      latitude: input.latitude,
      longitude: input.longitude,
      reporterType: input.reporterType,
      reporterName: contact.name,
      reporterMobile: contact.mobile,
      reporterEmail: contact.email,
    },
    targetEmail,
  );

  return insertReport({
    ...input,
    contact,
    emailDeliveryStatus: outcome.status,
    emailErrorDetail: outcome.status === "failed" ? outcome.error : undefined,
  });
}

export type SubmitLoggedReportResult = { outcome: "saved"; id: string } | RateLimitedResult;

// "Just log it" (PRD 5.6) — never touches contact details or email at
// all, structurally: this function doesn't accept them.
export async function submitLoggedReport(
  input: BaseReportInput,
  rateLimitIdentifier: string,
): Promise<SubmitLoggedReportResult> {
  const limited = await checkRateLimit(rateLimitIdentifier);
  if (limited) return limited;

  const { id } = await insertReport({ ...input, emailDeliveryStatus: "not_applicable" });
  return { outcome: "saved", id };
}

export type SubmitEmailReportResult =
  | { outcome: "saved"; id: string }
  | { outcome: "needs-mapping-resolution" }
  | RateLimitedResult;

// PRD 5.8: contact details submitted, district mapping resolved
// server-side (never trusted from client state) — sends immediately if a
// mapping exists, otherwise hands back to the client for the three-way
// choice (resolveMissingMapping) without saving anything yet.
export async function submitEmailReport(
  input: BaseReportInput,
  contact: ContactDetails,
  rateLimitIdentifier: string,
): Promise<SubmitEmailReportResult> {
  const limited = await checkRateLimit(rateLimitIdentifier);
  if (limited) return limited;

  assertValidReportInput(input);

  const authorityEmail = await lookupAuthorityEmail(input.district);
  if (!authorityEmail) {
    return { outcome: "needs-mapping-resolution" };
  }

  const { id } = await sendAndInsertReport(input, contact, authorityEmail);
  return { outcome: "saved", id };
}

export type MissingMappingChoice =
  | { type: "provide-email"; email: string }
  | { type: "cancel" }
  | { type: "queue" };

export type ResolveMissingMappingResult = { outcome: "saved"; id: string } | RateLimitedResult;

// PRD 5.8's exactly-three choices when no mapping is on file — every
// branch still saves the report (FR3), matching the acceptance criteria.
export async function resolveMissingMapping(
  input: BaseReportInput,
  contact: ContactDetails,
  choice: MissingMappingChoice,
  rateLimitIdentifier: string,
): Promise<ResolveMissingMappingResult> {
  const limited = await checkRateLimit(rateLimitIdentifier);
  if (limited) return limited;

  assertValidReportInput(input);

  if (choice.type === "cancel") {
    // Cancelling the email is structurally identical to "just log it" —
    // no email was sent, so no reason to retain the contact details that
    // were only ever collected for a send that didn't happen.
    const { id } = await insertReport({ ...input, emailDeliveryStatus: "not_applicable" });
    return { outcome: "saved", id };
  }

  if (choice.type === "queue") {
    // Contact fields ARE kept here — ticket 15 needs reporterEmail to
    // send the queued confirmation once a covering mapping is uploaded.
    const { id } = await insertReport({ ...input, contact, emailDeliveryStatus: "queued" });
    return { outcome: "saved", id };
  }

  const { id } = await sendAndInsertReport(input, contact, choice.email);
  return { outcome: "saved", id };
}
