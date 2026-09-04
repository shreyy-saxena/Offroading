import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Mirrors tests/support/db.ts's tracked-cleanup pattern: real Supabase
// Auth users, created via the Admin API on the service-role client, torn
// down after each test — no mocking of auth itself (ticket 14's own
// access-control logic is exactly what's under test here).
function authAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const TEST_PASSWORD = "test-password-do-not-use-1234";

let trackedUserIds: string[] = [];

type TestUser = { id: string; email: string; password: string };

// email_confirm: true — sidesteps the (non-existent, by design) email
// confirmation flow so the seeded account can sign in immediately.
export async function createTestUser(options: { admin: boolean }): Promise<TestUser> {
  const email = `test-${options.admin ? "admin" : "user"}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await authAdminClient().auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    app_metadata: options.admin ? { role: "admin" } : {},
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  trackedUserIds.push(data.user.id);
  return { id: data.user.id, email, password: TEST_PASSWORD };
}

// Flips a seeded user's admin flag in place — used to prove the access
// check re-evaluates on the very next call rather than caching from login.
// Explicitly overwrites `role` (never `{}` to "clear" it) — the Admin
// API's app_metadata update is a shallow *merge*, not a replace, so an
// empty object here would silently leave a previously-set role untouched.
export async function setTestUserAdmin(userId: string, admin: boolean): Promise<void> {
  const { error } = await authAdminClient().auth.admin.updateUserById(userId, {
    app_metadata: { role: admin ? "admin" : "none" },
  });
  if (error) {
    throw new Error(`Failed to update test user: ${error.message}`);
  }
}

// An anon-key client with no session yet — the same shape of client
// (respects the caller's own session) that createClient() in
// src/lib/supabase/server.ts hands to route handlers/Server Components,
// just without the next/headers cookie plumbing that only works inside an
// actual Next.js request (which is also why signInAdmin, the logic behind
// the login Server Action, takes a client like this rather than building
// its own).
export function testAuthClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function signInAsTestUser(user: TestUser): Promise<SupabaseClient> {
  const client = testAuthClient();
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }
  return client;
}

export async function cleanupTrackedTestUsers(): Promise<void> {
  const ids = trackedUserIds;
  trackedUserIds = [];
  const admin = authAdminClient();
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id);
  }
}
