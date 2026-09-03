import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Respects the caller's session and RLS grants — use this in route
// handlers/server actions serving citizens or admins alike.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no writable cookie jar
            // (e.g. during static rendering) — safe to ignore as long as
            // middleware is refreshing the session.
          }
        },
      },
    },
  );
}

// Always-anonymous reads that don't need session/cookie awareness at
// all (e.g. the public feed, ticket 11) — respects RLS via the anon
// key, same as createClient(), but doesn't depend on next/headers'
// request-scoped cookies(), so it also works outside an actual Next.js
// request (a route handler under test, a script). Prefer createClient()
// for anything that might actually be signed in (admin routes); this is
// specifically for reads that are the same for every caller regardless.
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

// Bypasses RLS entirely — service-role only. Use exclusively for
// operations that must run with elevated privileges regardless of the
// calling user (admin CSV mapping replace, sending queued/authority
// emails). Never expose this client or its key to the browser.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
