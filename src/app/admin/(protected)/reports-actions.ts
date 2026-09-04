"use server";

import { getAdminUser } from "@/lib/auth/admin";
import { deleteReports } from "@/lib/admin/reports";
import { createClient } from "@/lib/supabase/server";

// Server Actions are reachable as direct POST requests independent of
// which page rendered them — the (protected) layout's guard does not
// extend to actions defined under it (same reasoning as ticket 15's
// uploadMappingAction). This re-check is what actually enforces admin-only
// access for this irreversible operation.
export async function deleteReportsAction(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const admin = await getAdminUser(supabase);
  if (!admin) {
    throw new Error("Unauthorized");
  }

  await deleteReports(ids);
}
