import { describe, expect, it, vi } from "vitest";
import { trackRow } from "./support/db";
import { insertReport } from "@/lib/reports/submit-report";
import { getPublicReportById } from "@/lib/reports/public-feed";

// getReportPermalinkUrl (src/lib/site-url.ts) needs next/headers'
// headers(), which only works inside a real Next.js request — mocked
// here the same way tests elsewhere mock next/navigation for router
// hooks, so generateMetadata is directly callable as a plain function.
vi.mock("next/headers", () => ({
  headers: async () =>
    new Map([
      ["host", "offroading.example"],
      ["x-forwarded-proto", "https"],
    ]),
}));

const { generateMetadata } = await import("@/app/reports/[id]/page");

const SENSITIVE_CONTACT = {
  name: "Should Never Appear",
  mobile: "5550009999",
  email: "leaked-permalink@example.com",
};

describe("Report permalink (ticket 12)", () => {
  it("shows the same fields as the feed, no contact/delivery data, for a real report", async () => {
    const { id } = await insertReport({
      photoUrl: "https://example.com/permalink-photo.jpg",
      latitude: 12.9716,
      longitude: 77.5946,
      locality: "Permalink Test Locality",
      district: "Bengaluru Urban",
      reporterType: "resident",
      contact: SENSITIVE_CONTACT,
      emailDeliveryStatus: "failed",
      emailErrorDetail: "Should also never appear",
    });
    trackRow("reports", id);

    const report = await getPublicReportById(id);
    expect(report).toEqual({
      id,
      photoUrl: "https://example.com/permalink-photo.jpg",
      latitude: 12.9716,
      longitude: 77.5946,
      locality: "Permalink Test Locality",
      district: "Bengaluru Urban",
      reporterType: "resident",
      createdAt: report!.createdAt,
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.name);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.mobile);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.email);
    expect(serialized).not.toContain("failed");
  });

  it("renders correct OG/Twitter Card metadata pointing at the report's real photo, with no contact data", async () => {
    const { id } = await insertReport({
      photoUrl: "https://example.com/og-photo.jpg",
      latitude: 12.9716,
      longitude: 77.5946,
      locality: "Metadata Locality",
      district: "Bengaluru Urban",
      reporterType: "passerby",
      contact: SENSITIVE_CONTACT,
      emailDeliveryStatus: "sent",
    });
    trackRow("reports", id);

    const metadata = await generateMetadata({ params: Promise.resolve({ id }) });

    expect(metadata.title).toBe("Pothole reported in Metadata Locality, Bengaluru Urban");
    expect(metadata.openGraph?.images).toEqual([{ url: "https://example.com/og-photo.jpg" }]);
    expect(metadata.openGraph).toMatchObject({ url: `https://offroading.example/reports/${id}` });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["https://example.com/og-photo.jpg"],
    });

    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.name);
    expect(serialized).not.toContain(SENSITIVE_CONTACT.email);
  });

  it("returns null (→ 404) for an unknown but well-formed id", async () => {
    const report = await getPublicReportById("00000000-0000-0000-0000-000000000000");
    expect(report).toBeNull();
  });

  it("returns null (→ 404), not a DB error, for a malformed id", async () => {
    await expect(getPublicReportById("not-a-real-id")).resolves.toBeNull();
    await expect(getPublicReportById("../../etc/passwd")).resolves.toBeNull();
  });
});
