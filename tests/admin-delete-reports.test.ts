import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deleteReports } from "@/lib/admin/reports";
import { uploadReportPhoto } from "@/lib/storage/report-photos";
import { testDbClient, trackRow } from "./support/db";
import { trackStorageObject } from "./support/storage";

async function insertReportWithRealPhoto(locality: string) {
  const bytes = await readFile(path.join(__dirname, "fixtures/sample.png"));
  const { publicUrl, path: storagePath } = await uploadReportPhoto(new Blob([bytes], { type: "image/png" }));
  trackStorageObject("report-photos", storagePath); // safety net if the assertion below fails

  const db = testDbClient();
  const { data, error } = await db
    .from("reports")
    .insert({
      photo_url: publicUrl,
      latitude: null,
      longitude: null,
      locality,
      district: "Bengaluru Urban",
      reporter_type: "resident",
      email_delivery_status: "not_applicable",
    })
    .select("id")
    .single();
  if (error) throw error;

  return { id: data.id as string, storagePath, publicUrl };
}

// Ticket 16 follow-up: admin delete (real DB + real Storage, ticket 03's
// harness — no mocking either). deleteReports itself trusts its caller on
// admin status (the Server Action re-checks — see
// src/app/admin/(protected)/reports-actions.ts, untestable directly since
// it needs a real Next.js request for cookies(), same as every other
// "use server" wrapper in this project); this suite covers the actual
// deletion behavior.
describe("deleteReports", () => {
  it("deletes the report row and its photo from Storage", async () => {
    const { id, storagePath, publicUrl } = await insertReportWithRealPhoto("Delete Test Locality");
    trackRow("reports", id); // safety net if the assertion below fails

    await deleteReports([id]);

    const db = testDbClient();
    const { data: row } = await db.from("reports").select("id").eq("id", id).maybeSingle();
    expect(row).toBeNull();

    const response = await fetch(publicUrl);
    expect(response.status).toBe(400); // Supabase Storage's "object not found" for a public bucket

    const { data: listed } = await db.storage.from("report-photos").list("", { search: storagePath });
    expect(listed?.some((f) => f.name === storagePath)).toBe(false);
  });

  it("deletes multiple reports in one call", async () => {
    const first = await insertReportWithRealPhoto("Delete Test Locality A");
    const second = await insertReportWithRealPhoto("Delete Test Locality B");
    trackRow("reports", first.id);
    trackRow("reports", second.id);

    await deleteReports([first.id, second.id]);

    const db = testDbClient();
    const { data: rows } = await db.from("reports").select("id").in("id", [first.id, second.id]);
    expect(rows).toEqual([]);
  });

  it("leaves other reports untouched", async () => {
    const toDelete = await insertReportWithRealPhoto("Delete Test Locality C");
    const toKeep = await insertReportWithRealPhoto("Delete Test Locality D — keep me");
    trackRow("reports", toDelete.id);
    trackRow("reports", toKeep.id);

    await deleteReports([toDelete.id]);

    const db = testDbClient();
    const { data: kept } = await db.from("reports").select("id").eq("id", toKeep.id).maybeSingle();
    expect(kept).toEqual({ id: toKeep.id });
  });

  it("is a no-op for an empty id list", async () => {
    await expect(deleteReports([])).resolves.toBeUndefined();
  });
});
