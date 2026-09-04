import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mswServer } from "./support/msw-server";
import { resendSendFailureHandler, resendSendSuccessHandler } from "./support/fakes/resend";
import { testDbClient, trackRow } from "./support/db";
import {
  resolveMissingMapping,
  submitEmailReport,
  submitLoggedReport,
  type BaseReportInput,
} from "@/lib/reports/submit-report";
import { InvalidReportInputError } from "@/lib/reports/submit-report";

const MAPPED_DISTRICT = "Bengaluru Urban";
const MAPPED_STATE = "Karnataka";
const UNMAPPED_DISTRICT = "Mumbai City";
const UNMAPPED_STATE = "Maharashtra";
const AUTHORITY_EMAIL = "authority@example.com";

function baseInput(district: string): BaseReportInput {
  return {
    photoUrl: "https://example.com/photo.jpg",
    latitude: 12.9716,
    longitude: 77.5946,
    locality: "Test Locality",
    district,
    reporterType: "resident",
  };
}

const CONTACT = { name: "Test Reporter", mobile: "9999999999", email: "reporter@example.com" };

// A fresh identifier per test, not a shared constant — ticket 08's own
// tests aren't testing rate limiting (ticket 17's own tests do that),
// and a shared identifier across this file's ~7 submission calls would
// otherwise trip the real default threshold and break unrelated tests.
function freshRateLimitIdentifier(): string {
  return `submit-report-test-${randomUUID()}`;
}

async function readReport(id: string) {
  const db = testDbClient();
  const { data, error } = await db
    .from("reports")
    .select(
      "id, photo_url, latitude, longitude, locality, district, reporter_type, reporter_name, reporter_mobile, reporter_email, email_delivery_status, email_error_detail",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Ticket 08's primary seam — integration tests against the real DB
// (ticket 03 harness), Resend faked for the two branches that send
// immediately. All four terminal `email_delivery_status` outcomes must
// be reachable and must always persist a row (FR3). Calls the pure
// submitLoggedReport/submitEmailReport/resolveMissingMapping functions
// directly (not their "use server" action wrappers) — the wrappers
// resolve a rate-limit identifier via next/headers' headers(), which
// throws outside a real Next.js request; see ticket 17's Comments.
describe("submit-report (ticket 08)", () => {
  beforeEach(async () => {
    const db = testDbClient();
    await db.from("state_mapping").insert({ state: MAPPED_STATE, authority_emails: [AUTHORITY_EMAIL] });
    trackRow("state_mapping", MAPPED_STATE, "state");
  });

  afterEach(async () => {
    const db = testDbClient();
    // Belt-and-suspenders: the mapping is already tracked for cleanup,
    // but delete any accidental mapping for the "unmapped" state too, so
    // a failed run doesn't poison later runs.
    await db.from("state_mapping").delete().eq("state", UNMAPPED_STATE);
  });

  it("'not_applicable': just log it saves with no contact fields", async () => {
    const result = await submitLoggedReport(baseInput(UNMAPPED_DISTRICT), freshRateLimitIdentifier());
    expect(result.outcome).toBe("saved");
    if (result.outcome !== "saved") throw new Error("expected saved");
    trackRow("reports", result.id);

    const report = await readReport(result.id);
    expect(report.email_delivery_status).toBe("not_applicable");
    expect(report.reporter_name).toBeNull();
    expect(report.reporter_mobile).toBeNull();
    expect(report.reporter_email).toBeNull();
    expect(report.locality).toBe("Test Locality");
    expect(report.district).toBe(UNMAPPED_DISTRICT);
  });

  it("'sent': mapping exists, Resend succeeds", async () => {
    mswServer.use(resendSendSuccessHandler);

    const result = await submitEmailReport(baseInput(MAPPED_DISTRICT), CONTACT, freshRateLimitIdentifier());
    expect(result.outcome).toBe("saved");
    if (result.outcome !== "saved") throw new Error("expected saved");
    trackRow("reports", result.id);

    const report = await readReport(result.id);
    expect(report.email_delivery_status).toBe("sent");
    expect(report.email_error_detail).toBeNull();
    expect(report.reporter_email).toBe(CONTACT.email);
  });

  it("'failed': mapping exists, Resend fails permanently", async () => {
    mswServer.use(resendSendFailureHandler);

    const result = await submitEmailReport(baseInput(MAPPED_DISTRICT), CONTACT, freshRateLimitIdentifier());
    expect(result.outcome).toBe("saved");
    if (result.outcome !== "saved") throw new Error("expected saved");
    trackRow("reports", result.id);

    const report = await readReport(result.id);
    expect(report.email_delivery_status).toBe("failed");
    expect(report.email_error_detail).toBeTruthy();
    // Still saved, per FR3 — a failed send is never a lost report.
    expect(report.reporter_email).toBe(CONTACT.email);
  });

  it("'queued': no mapping, citizen picks queue — no send attempted, contact fields kept for ticket 15", async () => {
    const identifier = freshRateLimitIdentifier();
    const check = await submitEmailReport(baseInput(UNMAPPED_DISTRICT), CONTACT, identifier);
    expect(check).toEqual({ outcome: "needs-mapping-resolution" });

    const queueResult = await resolveMissingMapping(
      baseInput(UNMAPPED_DISTRICT),
      CONTACT,
      { type: "queue" },
      identifier,
    );
    expect(queueResult.outcome).toBe("saved");
    if (queueResult.outcome !== "saved") throw new Error("expected saved");
    trackRow("reports", queueResult.id);

    const report = await readReport(queueResult.id);
    expect(report.email_delivery_status).toBe("queued");
    expect(report.reporter_email).toBe(CONTACT.email);
  });

  it("no-mapping 'cancel': saves as not_applicable, contact fields dropped", async () => {
    const cancelResult = await resolveMissingMapping(
      baseInput(UNMAPPED_DISTRICT),
      CONTACT,
      { type: "cancel" },
      freshRateLimitIdentifier(),
    );
    expect(cancelResult.outcome).toBe("saved");
    if (cancelResult.outcome !== "saved") throw new Error("expected saved");
    trackRow("reports", cancelResult.id);

    const report = await readReport(cancelResult.id);
    expect(report.email_delivery_status).toBe("not_applicable");
    expect(report.reporter_email).toBeNull();
  });

  it("no-mapping 'provide-email': sends to the citizen-supplied address", async () => {
    mswServer.use(resendSendSuccessHandler);

    const provideEmailResult = await resolveMissingMapping(
      baseInput(UNMAPPED_DISTRICT),
      CONTACT,
      { type: "provide-email", email: "self-provided@example.com" },
      freshRateLimitIdentifier(),
    );
    expect(provideEmailResult.outcome).toBe("saved");
    if (provideEmailResult.outcome !== "saved") throw new Error("expected saved");
    trackRow("reports", provideEmailResult.id);

    const report = await readReport(provideEmailResult.id);
    expect(report.email_delivery_status).toBe("sent");
  });

  it("rejects a district not on the canonical list, even if the client claims a mapping exists for it", async () => {
    await expect(
      submitLoggedReport(baseInput("Not A Real District"), freshRateLimitIdentifier()),
    ).rejects.toThrow(InvalidReportInputError);
  });
});
