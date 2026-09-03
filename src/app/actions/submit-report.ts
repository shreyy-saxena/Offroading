"use server";

import { sendComplaintEmail } from "@/lib/email/deliver-report-email";
import {
  assertValidReportInput,
  insertReport,
  lookupAuthorityEmail,
  type BaseReportInput,
  type ContactDetails,
} from "@/lib/reports/submit-report";

export type { BaseReportInput, ContactDetails };

// "Just log it" (PRD 5.6) — never touches contact details or email at
// all, structurally: this action doesn't accept them.
export async function submitLoggedReportAction(input: BaseReportInput): Promise<{ id: string }> {
  return insertReport({ ...input, emailDeliveryStatus: "not_applicable" });
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

export type SubmitEmailReportResult = { outcome: "saved"; id: string } | { outcome: "needs-mapping-resolution" };

// PRD 5.8: contact details submitted, district mapping resolved
// server-side (never trusted from client state) — sends immediately if a
// mapping exists, otherwise hands back to the client for the three-way
// choice (resolveMissingMappingAction) without saving anything yet.
export async function submitEmailReportAction(
  input: BaseReportInput,
  contact: ContactDetails,
): Promise<SubmitEmailReportResult> {
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

// PRD 5.8's exactly-three choices when no mapping is on file — every
// branch still saves the report (FR3), matching the acceptance criteria.
export async function resolveMissingMappingAction(
  input: BaseReportInput,
  contact: ContactDetails,
  choice: MissingMappingChoice,
): Promise<{ id: string }> {
  assertValidReportInput(input);

  if (choice.type === "cancel") {
    // Cancelling the email is structurally identical to "just log it" —
    // no email was sent, so no reason to retain the contact details that
    // were only ever collected for a send that didn't happen.
    return insertReport({ ...input, emailDeliveryStatus: "not_applicable" });
  }

  if (choice.type === "queue") {
    // Contact fields ARE kept here — ticket 15 needs reporterEmail to
    // send the queued confirmation once a covering mapping is uploaded.
    return insertReport({ ...input, contact, emailDeliveryStatus: "queued" });
  }

  return sendAndInsertReport(input, contact, choice.email);
}
