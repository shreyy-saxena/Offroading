import { isKnownDistrict } from "@/lib/data/districts";
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
