"use server";

import { InvalidPhotoError, uploadReportPhoto } from "@/lib/storage/report-photos";

export type UploadReportPhotoResult =
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; error: string };

// Client-callable wrapper around ticket 04's storage helper — the helper
// itself uses the service-role client, so it can only run server-side.
export async function uploadReportPhotoAction(
  formData: FormData,
): Promise<UploadReportPhotoResult> {
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { ok: false, error: "No photo was provided." };
  }

  try {
    const { publicUrl, path } = await uploadReportPhoto(file);
    return { ok: true, publicUrl, path };
  } catch (error) {
    if (error instanceof InvalidPhotoError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
