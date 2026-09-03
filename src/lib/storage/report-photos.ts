import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "report-photos";
const MAX_BYTES = 10 * 1024 * 1024;

// Extension is derived from the (validated) mime type rather than trusted
// from a client-supplied filename, so the storage key is never influenced
// by arbitrary user input.
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export class InvalidPhotoError extends Error {}

// Server-side only — accepts a photo, stores it in the public
// `report-photos` bucket, and returns the public URL to persist on the
// report row. Sane-default validation per PRD 12.5 / spec Out of Scope
// (no configurable policy, just a basic type/size sanity check); the
// bucket itself also enforces the same limits as defense in depth.
export async function uploadReportPhoto(
  file: Blob,
): Promise<{ publicUrl: string; path: string }> {
  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    throw new InvalidPhotoError(`Unsupported photo type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_BYTES) {
    throw new InvalidPhotoError(`Photo exceeds the ${MAX_BYTES / (1024 * 1024)}MB limit`);
  }

  const path = `${crypto.randomUUID()}.${extension}`;
  const client = createServiceRoleClient();
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function deleteReportPhoto(path: string): Promise<void> {
  const client = createServiceRoleClient();
  await client.storage.from(BUCKET).remove([path]);
}
