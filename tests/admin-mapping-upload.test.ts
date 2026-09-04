import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { replaceStateMapping } from "@/lib/admin/state-mapping";
import { resendSendFailureHandler, resendSendSuccessHandler } from "./support/fakes/resend";
import { mswServer } from "./support/msw-server";
import { testDbClient, trackRow } from "./support/db";

// Integration tests against the real state_mapping/reports tables
// (ticket 03's harness) and MSW's Resend fake — ticket 15's acceptance
// criteria, ported to the state-level fallback mapping. No mocking of
// replaceStateMapping's own DB/RPC calls.
//
// Test districts are deliberately drawn from two different states
// (Chhattisgarh's Raipur, Goa's North Goa) so a mapping upload for one
// state can be asserted to NOT cover the other — same distinction the
// old per-district tests got for free just by using different districts.
describe("replaceStateMapping", () => {
  it("replaces the mapping in one shot — old rows are gone, new rows are present", async () => {
    const db = testDbClient();
    await db.from("state_mapping").insert({ state: "Chhattisgarh", authority_emails: ["old@example.com"] });
    trackRow("state_mapping", "Chhattisgarh", "state");
    trackRow("state_mapping", "Goa", "state");

    const result = await replaceStateMapping("Goa,goa@example.com");
    expect(result).toEqual({ outcome: "replaced", stateCount: 1, triggeredSends: 0 });

    // Scoped to the rows this test owns, not the whole table — other test
    // files run in parallel against this same shared dev project and seed
    // their own state_mapping rows (e.g. submit-report.test.ts's own
    // "Karnataka" mapping), so asserting on every row in the table is
    // flaky by construction, not a real assertion about this function.
    const { data: oldRow } = await db.from("state_mapping").select("*").eq("state", "Chhattisgarh").maybeSingle();
    expect(oldRow).toBeNull();

    const { data: newRow } = await db
      .from("state_mapping")
      .select("authority_emails")
      .eq("state", "Goa")
      .single();
    expect(newRow).toEqual({ authority_emails: ["goa@example.com"] });
  });

  it("stores multiple semicolon-separated emails for one state", async () => {
    const db = testDbClient();
    trackRow("state_mapping", "Goa", "state");

    const result = await replaceStateMapping("Goa,first@example.com;second@example.com");
    expect(result).toEqual({ outcome: "replaced", stateCount: 1, triggeredSends: 0 });

    const { data: newRow } = await db.from("state_mapping").select("authority_emails").eq("state", "Goa").single();
    expect(newRow).toEqual({ authority_emails: ["first@example.com", "second@example.com"] });
  });

  it("leaves the existing mapping untouched when the upload is invalid", async () => {
    const db = testDbClient();
    await db.from("state_mapping").insert({ state: "Chhattisgarh", authority_emails: ["existing@example.com"] });
    trackRow("state_mapping", "Chhattisgarh", "state");

    const result = await replaceStateMapping("Goa,not-an-email");
    expect(result.outcome).toBe("invalid");

    const { data: chhattisgarh } = await db
      .from("state_mapping")
      .select("authority_emails")
      .eq("state", "Chhattisgarh")
      .single();
    expect(chhattisgarh).toEqual({ authority_emails: ["existing@example.com"] });

    // The RPC was never called at all (invalid upload short-circuits
    // before it) — Goa was never inserted.
    const { data: goa } = await db.from("state_mapping").select("state").eq("state", "Goa").maybeSingle();
    expect(goa).toBeNull();
  });

  it("triggers a queued report's send and confirmation when its district's state is newly covered", async () => {
    mswServer.use(resendSendSuccessHandler);
    const db = testDbClient();

    const { data: report } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/photo.jpg",
        latitude: null,
        longitude: null,
        locality: "Test Locality",
        district: "Raipur",
        reporter_type: "resident",
        reporter_name: "Test Reporter",
        reporter_mobile: "9999999999",
        reporter_email: "reporter@example.com",
        email_delivery_status: "queued",
      })
      .select("id")
      .single();
    trackRow("reports", report!.id);
    trackRow("state_mapping", "Chhattisgarh", "state");

    const result = await replaceStateMapping("Chhattisgarh,chhattisgarh-authority@example.com");
    expect(result).toEqual({ outcome: "replaced", stateCount: 1, triggeredSends: 1 });

    const { data: updated } = await db
      .from("reports")
      .select("email_delivery_status, email_error_detail")
      .eq("id", report!.id)
      .single();
    expect(updated).toEqual({ email_delivery_status: "sent", email_error_detail: null });
  });

  it("leaves a queued report queued if its district's state isn't part of this upload", async () => {
    const db = testDbClient();

    const { data: report } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/photo.jpg",
        latitude: null,
        longitude: null,
        locality: "Test Locality",
        district: "Raipur",
        reporter_type: "resident",
        reporter_name: "Test Reporter",
        reporter_mobile: "9999999999",
        reporter_email: "reporter@example.com",
        email_delivery_status: "queued",
      })
      .select("id")
      .single();
    trackRow("reports", report!.id);
    trackRow("state_mapping", "Goa", "state");

    const result = await replaceStateMapping("Goa,goa@example.com");
    expect(result).toEqual({ outcome: "replaced", stateCount: 1, triggeredSends: 0 });

    const { data: unchanged } = await db.from("reports").select("email_delivery_status").eq("id", report!.id).single();
    expect(unchanged).toEqual({ email_delivery_status: "queued" });
  });

  it("settles a triggered send that permanently fails to 'failed', with error detail, no confirmation implied", async () => {
    mswServer.use(resendSendFailureHandler);
    const db = testDbClient();

    const { data: report } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/photo.jpg",
        latitude: null,
        longitude: null,
        locality: "Test Locality",
        district: "Raipur",
        reporter_type: "resident",
        reporter_name: "Test Reporter",
        reporter_mobile: "9999999999",
        reporter_email: `${randomUUID()}@example.com`,
        email_delivery_status: "queued",
      })
      .select("id")
      .single();
    trackRow("reports", report!.id);
    trackRow("state_mapping", "Chhattisgarh", "state");

    const result = await replaceStateMapping("Chhattisgarh,chhattisgarh-authority@example.com");
    expect(result).toEqual({ outcome: "replaced", stateCount: 1, triggeredSends: 0 });

    const { data: updated } = await db
      .from("reports")
      .select("email_delivery_status, email_error_detail")
      .eq("id", report!.id)
      .single();
    expect(updated?.email_delivery_status).toBe("failed");
    expect(updated?.email_error_detail).toBeTruthy();
  });
});
