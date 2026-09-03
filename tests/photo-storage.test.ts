import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { InvalidPhotoError, uploadReportPhoto } from "@/lib/storage/report-photos";
import { trackStorageObject } from "./support/storage";

// Integration test against real Supabase Storage (ticket 04 acceptance
// criteria), per ticket 03's harness — no mocking of the storage layer.
describe("report photo storage", () => {
  it("uploads a photo and serves it at a public URL with no auth", async () => {
    const bytes = await readFile(path.join(__dirname, "fixtures/sample.png"));
    const file = new Blob([bytes], { type: "image/png" });

    const { publicUrl, path: objectPath } = await uploadReportPhoto(file);
    trackStorageObject("report-photos", objectPath);

    const response = await fetch(publicUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const served = Buffer.from(await response.arrayBuffer());
    expect(served.equals(bytes)).toBe(true);
  });

  it("rejects a non-image file with a clear error", async () => {
    const file = new Blob(["not a photo"], { type: "text/plain" });
    await expect(uploadReportPhoto(file)).rejects.toThrow(InvalidPhotoError);
  });

  it("rejects an oversized file with a clear error", async () => {
    const oversized = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "image/png" });
    await expect(uploadReportPhoto(oversized)).rejects.toThrow(InvalidPhotoError);
  });
});
