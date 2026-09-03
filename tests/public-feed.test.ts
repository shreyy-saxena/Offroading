import { describe, expect, it } from "vitest";
import { trackRow } from "./support/db";
import { insertReport } from "@/lib/reports/submit-report";
import { listPublicReports } from "@/lib/reports/public-feed";

const SENSITIVE_CONTACT = {
  name: "Should Never Appear",
  mobile: "5550001234",
  email: "leaked-secret@example.com",
};

// Ticket 11's required test: seed a report with contact fields
// populated, fetch the public feed, assert those fields are absent from
// the *response* — not just unrendered by the UI.
describe("listPublicReports (ticket 11)", () => {
  it("never includes reporter contact fields or delivery diagnostics, even when populated", async () => {
    const { id } = await insertReport({
      photoUrl: "https://example.com/photo.jpg",
      latitude: 12.9716,
      longitude: 77.5946,
      locality: "Feed Test Locality",
      district: "Bengaluru Urban",
      reporterType: "resident",
      contact: SENSITIVE_CONTACT,
      emailDeliveryStatus: "failed",
      emailErrorDetail: "Should also never appear",
    });
    trackRow("reports", id);

    const reports = await listPublicReports();
    const seeded = reports.find((r) => r.id === id);

    expect(seeded).toBeTruthy();
    expect(seeded).toEqual({
      id,
      photoUrl: "https://example.com/photo.jpg",
      latitude: 12.9716,
      longitude: 77.5946,
      locality: "Feed Test Locality",
      district: "Bengaluru Urban",
      reporterType: "resident",
      createdAt: seeded!.createdAt,
    });

    // Belt-and-suspenders: the sensitive values themselves never appear
    // anywhere in the payload, under any key name.
    const serialized = JSON.stringify(reports);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.name);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.mobile);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.email);
    expect(serialized).not.toContain("failed");
    expect(serialized).not.toContain("Should also never appear");
  });

  it("lists newest first", async () => {
    const older = await insertReport({
      photoUrl: "https://example.com/older.jpg",
      latitude: null,
      longitude: null,
      locality: "Older Report",
      district: "Bengaluru Urban",
      reporterType: "passerby",
      emailDeliveryStatus: "not_applicable",
    });
    trackRow("reports", older.id);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const newer = await insertReport({
      photoUrl: "https://example.com/newer.jpg",
      latitude: null,
      longitude: null,
      locality: "Newer Report",
      district: "Bengaluru Urban",
      reporterType: "passerby",
      emailDeliveryStatus: "not_applicable",
    });
    trackRow("reports", newer.id);

    const reports = await listPublicReports();
    const olderIndex = reports.findIndex((r) => r.id === older.id);
    const newerIndex = reports.findIndex((r) => r.id === newer.id);

    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it("loads with no auth/session required", async () => {
    // listPublicReports uses the anon-respecting client, never
    // service-role — this test just documents/pins that by calling it
    // exactly as the (unauthenticated) feed page does.
    await expect(listPublicReports()).resolves.toBeInstanceOf(Array);
  });
});
