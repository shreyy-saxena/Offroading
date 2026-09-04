import type { SupabaseClient, User } from "@supabase/supabase-js";

// FR7 / spec story 19: admin status is re-checked on every request, never
// cached from login. getUser() (never getSession()) is what makes that
// true — it round-trips to the Supabase Auth server and returns the
// user's current row, so a revoked app_metadata.role takes effect on the
// very next call even against an already-issued, unexpired session
// token. getSession() would just decode the JWT locally, which can carry
// a stale role baked in at token-issuance time.
export async function getAdminUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.app_metadata?.role === "admin" ? data.user : null;
}

export type SignInAdminResult = { outcome: "signed-in" } | { outcome: "error"; message: string };

// The login Server Action's actual logic, split out so it's testable
// without a real Next.js request context — it takes an already-built
// client rather than reaching for next/headers cookies() itself (the
// Server Action wrapper, src/app/admin/login/actions.ts, does that part).
export async function signInAdmin(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<SignInAdminResult> {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { outcome: "error", message: "Invalid email or password." };
  }

  // A successful password check only proves *this account exists* — FR7
  // still requires the admin-role check before granting dashboard access,
  // right here at login as well as on every later request (the layout
  // guard). A non-admin account that authenticates correctly is signed
  // back out immediately rather than left holding a live session.
  const admin = await getAdminUser(supabase);
  if (!admin) {
    await supabase.auth.signOut();
    return { outcome: "error", message: "This account isn't authorized for admin access." };
  }

  return { outcome: "signed-in" };
}
