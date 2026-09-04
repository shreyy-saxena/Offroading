import { describe, expect, it } from "vitest";
import { listStateMapping } from "@/lib/admin/state-mapping";
import { listAdminReports } from "@/lib/admin/reports";
import { testDbClient, trackRow } from "./support/db";

// Integration tests against the real state_mapping/reports tables
// (ticket 03's harness) — ticket 16's data-shape acceptance criteria,
// ported to the state-level fallback mapping. The access-boundary
// criterion ("the same data fetched without admin auth is rejected")
// isn't testable at this layer: unlike ticket 15's uploadMappingAction
// (a Server Action, independently re-checked — see its own tests),
// listStateMapping/listAdminReports are plain Server Component reads
// with no separate entry point of their own — they're only ever
// reachable through the (protected) layout's render tree, whose admin
// check ticket 14's tests already cover directly. Verified live instead
// (this ticket's Comments) that an unauthenticated /admin request
// redirects before any of this data is ever rendered.
describe("listStateMapping", () => {
  it("returns the current mapping, ordered by state", async () => {
    const db = testDbClient();
    await db
      .from("state_mapping")
      .insert([
        { state: "Goa", authority_emails: ["goa@example.com"] },
        { state: "Chhattisgarh", authority_emails: ["chhattisgarh-one@example.com", "chhattisgarh-two@example.com"] },
      ]);
    trackRow("state_mapping", "Goa", "state");
    trackRow("state_mapping", "Chhattisgarh", "state");

    const mapping = await listStateMapping();
    const ours = mapping.filter((entry) => ["Goa", "Chhattisgarh"].includes(entry.state));
    expect(ours).toEqual([
      { state: "Chhattisgarh", authorityEmails: ["chhattisgarh-one@example.com", "chhattisgarh-two@example.com"] },
      { state: "Goa", authorityEmails: ["goa@example.com"] },
    ]);
  });
});

describe("listAdminReports", () => {
  it("includes reporter contact fields and delivery status/error detail, unlike the public feed", async () => {
    const db = testDbClient();
    const { data: sent } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/sent.jpg",
        latitude: null,
        longitude: null,
        locality: "Sent Locality",
        district: "Guntur",
        reporter_type: "resident",
        reporter_name: "Sent Reporter",
        reporter_mobile: "9000000001",
        reporter_email: "sent-reporter@example.com",
        email_delivery_status: "sent",
      })
      .select("id")
      .single();
    trackRow("reports", sent!.id);

    const { data: failed } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/failed.jpg",
        latitude: null,
        longitude: null,
        locality: "Failed Locality",
        district: "Guntur",
        reporter_type: "passerby",
        reporter_name: "Failed Reporter",
        reporter_mobile: "9000000002",
        reporter_email: "failed-reporter@example.com",
        email_delivery_status: "failed",
        email_error_detail: "Some delivery error",
      })
      .select("id")
      .single();
    trackRow("reports", failed!.id);

    const { data: logged } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/logged.jpg",
        latitude: null,
        longitude: null,
        locality: "Logged Locality",
        district: "Guntur",
        reporter_type: "resident",
        email_delivery_status: "not_applicable",
      })
      .select("id")
      .single();
    trackRow("reports", logged!.id);

    const reports = await listAdminReports();
    const byId = new Map(reports.map((r) => [r.id, r]));

    expect(byId.get(sent!.id)).toMatchObject({
      reporterName: "Sent Reporter",
      reporterMobile: "9000000001",
      reporterEmail: "sent-reporter@example.com",
      emailDeliveryStatus: "sent",
      emailErrorDetail: null,
    });
    expect(byId.get(failed!.id)).toMatchObject({
      reporterName: "Failed Reporter",
      emailDeliveryStatus: "failed",
      emailErrorDetail: "Some delivery error",
    });
    expect(byId.get(logged!.id)).toMatchObject({
      reporterName: null,
      reporterMobile: null,
      reporterEmail: null,
      emailDeliveryStatus: "not_applicable",
      emailErrorDetail: null,
    });
  });
});
