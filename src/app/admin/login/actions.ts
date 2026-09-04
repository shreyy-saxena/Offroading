"use server";

import { signInAdmin, type SignInAdminResult } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export type { SignInAdminResult };

// PRD Section 6 Step 1 / spec story 18. Thin Next.js wrapper around
// signInAdmin — mirrors the app's existing pattern (e.g.
// submitEmailReportAction): the action returns a result and the client
// navigates itself on success, rather than this action calling redirect()
// directly, whose thrown signal doesn't play well with a caller wrapping
// the action in try/catch.
export async function signInAdminAction(email: string, password: string): Promise<SignInAdminResult> {
  const supabase = await createClient();
  return signInAdmin(supabase, email, password);
}
