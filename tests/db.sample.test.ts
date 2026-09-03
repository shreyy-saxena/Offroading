import { describe, expect, it } from "vitest";
import { testDbClient, trackRow } from "./support/db";

// Sample test for the real-DB harness (ticket 03 acceptance criteria).
// Exercises the actual `reports` table through the service-role client —
// no mocking of the database layer, per the spec's Testing Decisions.
describe("real DB harness", () => {
  it("inserts a report and reads it back", async () => {
    const db = testDbClient();

    const { data: inserted, error: insertError } = await db
      .from("reports")
      .insert({
        photo_url: "https://example.com/sample.jpg",
        latitude: 12.34,
        longitude: 56.78,
        locality: "Sample Locality",
        district: "Sample District",
        reporter_type: "passerby",
      })
      .select("id")
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.id).toBeTruthy();
    trackRow("reports", inserted!.id);

    const { data: readBack, error: readError } = await db
      .from("reports")
      .select("locality, district, reporter_type, email_delivery_status")
      .eq("id", inserted!.id)
      .single();

    expect(readError).toBeNull();
    expect(readBack).toEqual({
      locality: "Sample Locality",
      district: "Sample District",
      reporter_type: "passerby",
      email_delivery_status: "not_applicable",
    });
  });
});
