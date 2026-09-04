import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { replaceDistrictMapping } from "@/lib/admin/district-mapping";
import { resendSendFailureHandler, resendSendSuccessHandler } from "./support/fakes/resend";
import { mswServer } from "./support/msw-server";
import { testDbClient, trackRow } from "./support/db";

// Integration tests against the real district_mapping/reports tables
// (ticket 03's harness) and MSW's Resend fake — ticket 15's acceptance
// criteria. No mocking of replaceDistrictMapping's own DB/RPC calls.
describe("replaceDistrictMapping", () => {
  it("replaces the mapping in one shot — old rows are gone, new rows are present", async () => {
    const db = testDbClient();
    await db.from("district_mapping").insert({ district: "Chittoor", authority_email: "old@example.com" });
    trackRow("district_mapping", "Chittoor", "district");
    trackRow("district_mapping", "Guntur", "district");

    const result = await replaceDistrictMapping("Guntur,guntur@example.com");
    expect(result).toEqual({ outcome: "replaced", districtCount: 1, triggeredSends: 0 });

    // Scoped to the rows this test owns, not the whole table — other test
    // files run in parallel against this same shared dev project and seed
    // their own district_mapping rows (e.g. submit-report.test.ts's own
    // "Bengaluru Urban" mapping), so asserting on every row in the table
    // is flaky by construction, not a real assertion about this function.
    const { data: oldRow } = await db.from("district_mapping").select("*").eq("district", "Chittoor").maybeSingle();
    expect(oldRow).toBeNull();

    const { data: newRow } = await db
      .from("district_mapping")
      .select("authority_email")
      .eq("district", "Guntur")
      .single();
    expect(newRow).toEqual({ authority_email: "guntur@example.com" });
  });

  it("leaves the existing mapping untouched when the upload is invalid", async () => {
    const db = testDbClient();
    await db.from("district_mapping").insert({ district: "Chittoor", authority_email: "existing@example.com" });
    trackRow("district_mapping", "Chittoor", "district");

    const result = await replaceDistrictMapping("Guntur,not-an-email");
    expect(result.outcome).toBe("invalid");

    const { data: chittoor } = await db
      .from("district_mapping")
      .select("authority_email")
      .eq("district", "Chittoor")
      .single();
    expect(chittoor).toEqual({ authority_email: "existing@example.com" });

    // The RPC was never called at all (invalid upload short-circuits
    // before it) — Guntur was never inserted.
    const { data: guntur } = await db.from("district_mapping").select("district").eq("district", "Guntur").maybeSingle();
    expect(guntur).toBeNull();
  });

  it("triggers a queued report's send and confirmation when its district is newly covered", async () => {
    mswServer.use(resendSendSuccessHandler);
    const db = testDbClient();

    const { data: report } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/photo.jpg",
        latitude: null,
        longitude: null,
        locality: "Test Locality",
        district: "Krishna",
        reporter_type: "resident",
        reporter_name: "Test Reporter",
        reporter_mobile: "9999999999",
        reporter_email: "reporter@example.com",
        email_delivery_status: "queued",
      })
      .select("id")
      .single();
    trackRow("reports", report!.id);
    trackRow("district_mapping", "Krishna", "district");

    const result = await replaceDistrictMapping("Krishna,krishna-authority@example.com");
    expect(result).toEqual({ outcome: "replaced", districtCount: 1, triggeredSends: 1 });

    const { data: updated } = await db
      .from("reports")
      .select("email_delivery_status, email_error_detail")
      .eq("id", report!.id)
      .single();
    expect(updated).toEqual({ email_delivery_status: "sent", email_error_detail: null });
  });

  it("leaves a queued report queued if the district it's in isn't part of this upload", async () => {
    const db = testDbClient();

    const { data: report } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/photo.jpg",
        latitude: null,
        longitude: null,
        locality: "Test Locality",
        district: "Krishna",
        reporter_type: "resident",
        reporter_name: "Test Reporter",
        reporter_mobile: "9999999999",
        reporter_email: "reporter@example.com",
        email_delivery_status: "queued",
      })
      .select("id")
      .single();
    trackRow("reports", report!.id);
    trackRow("district_mapping", "Guntur", "district");

    const result = await replaceDistrictMapping("Guntur,guntur@example.com");
    expect(result).toEqual({ outcome: "replaced", districtCount: 1, triggeredSends: 0 });

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
        district: "Krishna",
        reporter_type: "resident",
        reporter_name: "Test Reporter",
        reporter_mobile: "9999999999",
        reporter_email: `${randomUUID()}@example.com`,
        email_delivery_status: "queued",
      })
      .select("id")
      .single();
    trackRow("reports", report!.id);
    trackRow("district_mapping", "Krishna", "district");

    const result = await replaceDistrictMapping("Krishna,krishna-authority@example.com");
    expect(result).toEqual({ outcome: "replaced", districtCount: 1, triggeredSends: 0 });

    const { data: updated } = await db
      .from("reports")
      .select("email_delivery_status, email_error_detail")
      .eq("id", report!.id)
      .single();
    expect(updated?.email_delivery_status).toBe("failed");
    expect(updated?.email_error_detail).toBeTruthy();
  });
});
