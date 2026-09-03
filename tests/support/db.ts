import { createClient } from "@supabase/supabase-js";

// The real-DB test seam (ticket 03 / spec Testing Decisions): tests run
// against this project's actual Supabase instance via the service-role
// key, bypassing RLS, so they can set up and tear down freely regardless
// of the policies under test. There's no separate disposable test project
// for v1 — see tests/README.md for why, and the cleanup discipline that
// makes sharing the dev project safe.
export function testDbClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

type TrackedRow = { table: string; column: string; value: string };

let tracked: TrackedRow[] = [];

// Call right after inserting a row a test owns, so cleanupTrackedRows can
// delete it afterward. Prefer this over wiping whole tables between tests
// — the harness shares a project with real (eventually) production data.
export function trackRow(table: string, value: string, column = "id") {
  tracked.push({ table, column, value });
}

export async function cleanupTrackedRows() {
  const db = testDbClient();
  const rows = tracked;
  tracked = [];
  for (const { table, column, value } of rows) {
    await db.from(table).delete().eq(column, value);
  }
}
