"use server";

import { headers } from "next/headers";
import {
  resolveMissingMapping,
  submitEmailReport,
  submitLoggedReport,
  type BaseReportInput,
  type ContactDetails,
  type MissingMappingChoice,
  type RateLimitedResult,
  type ResolveMissingMappingResult,
  type SubmitEmailReportResult,
  type SubmitLoggedReportResult,
} from "@/lib/reports/submit-report";

export type {
  BaseReportInput,
  ContactDetails,
  MissingMappingChoice,
  RateLimitedResult,
  ResolveMissingMappingResult,
  SubmitEmailReportResult,
  SubmitLoggedReportResult,
};

// Resolves an identifier for ticket 17's rate limiting from the headers
// Vercel sets on every request (next/headers, only callable inside an
// actual request — this is exactly why the rate-limit-gated logic itself
// lives in src/lib/reports/submit-report.ts and takes this as a plain
// argument, not by reaching for headers() internally).
async function resolveRateLimitIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

// "Just log it" (PRD 5.6) — never touches contact details or email at
// all, structurally: this action doesn't accept them.
export async function submitLoggedReportAction(input: BaseReportInput): Promise<SubmitLoggedReportResult> {
  return submitLoggedReport(input, await resolveRateLimitIdentifier());
}

// PRD 5.8: contact details submitted, district mapping resolved
// server-side (never trusted from client state) — sends immediately if a
// mapping exists, otherwise hands back to the client for the three-way
// choice (resolveMissingMappingAction) without saving anything yet.
export async function submitEmailReportAction(
  input: BaseReportInput,
  contact: ContactDetails,
): Promise<SubmitEmailReportResult> {
  return submitEmailReport(input, contact, await resolveRateLimitIdentifier());
}

// PRD 5.8's exactly-three choices when no mapping is on file — every
// branch still saves the report (FR3), matching the acceptance criteria.
export async function resolveMissingMappingAction(
  input: BaseReportInput,
  contact: ContactDetails,
  choice: MissingMappingChoice,
): Promise<ResolveMissingMappingResult> {
  return resolveMissingMapping(input, contact, choice, await resolveRateLimitIdentifier());
}
