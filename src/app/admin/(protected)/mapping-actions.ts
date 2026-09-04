"use server";

import { getAdminUser } from "@/lib/auth/admin";
import { replaceDistrictMapping, type UploadMappingResult } from "@/lib/admin/district-mapping";
import { createClient } from "@/lib/supabase/server";

export type { UploadMappingResult };

// Server Actions are reachable as direct POST requests independent of
// which page rendered them — the (protected) layout's guard does NOT
// extend to actions defined under it (Next.js's own Data Security guide
// is explicit about this: "A page-level authentication check does not
// extend to the Server Actions defined within it"). This re-check is
// what actually enforces FR7 for the mapping upload; the layout only
// controls which UI a browser gets shown.
export async function uploadMappingAction(csvText: string): Promise<UploadMappingResult> {
  const supabase = await createClient();
  const admin = await getAdminUser(supabase);
  if (!admin) {
    throw new Error("Unauthorized");
  }

  return replaceDistrictMapping(csvText);
}
