"use server";

import { createClient } from "@/lib/supabase/server";

export async function signOutAdminAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
