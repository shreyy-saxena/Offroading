import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

// FR7 / spec story 19: this guard runs fresh on every request to any
// route under this group (Server Components aren't cached across
// requests by default) and calls getAdminUser, which itself always
// re-verifies against the Auth server rather than trusting a cached
// login-time flag — see src/lib/auth/admin.ts. Deliberately not
// delegated to Next.js's proxy.js (formerly middleware): its own docs
// warn that a matcher change or a route moving can silently drop proxy
// coverage, and recommend verifying auth inside the request itself
// instead of relying on proxy alone. This layout *is* that verification.
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const admin = await getAdminUser(supabase);

  if (!admin) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
