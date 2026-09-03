import { createClient } from "@supabase/supabase-js";

// Mirrors tests/support/db.ts's tracked-cleanup pattern, for the same
// reason: no separate disposable Supabase project, so tests share the
// live bucket and must clean up after themselves.
function testStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

type TrackedObject = { bucket: string; path: string };

const tracked: TrackedObject[] = [];

export function trackStorageObject(bucket: string, path: string) {
  tracked.push({ bucket, path });
}

export async function cleanupTrackedStorageObjects() {
  const client = testStorageClient();
  const byBucket = new Map<string, string[]>();
  for (const { bucket, path } of tracked.splice(0)) {
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }
  for (const [bucket, paths] of byBucket) {
    await client.storage.from(bucket).remove(paths);
  }
}
