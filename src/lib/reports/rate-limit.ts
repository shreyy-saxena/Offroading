import { createServiceRoleClient } from "@/lib/supabase/server";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MAX_ATTEMPTS = 5;

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function windowMs(): number {
  return positiveIntEnv("SUBMISSION_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);
}

function maxAttempts(): number {
  return positiveIntEnv("SUBMISSION_RATE_LIMIT_MAX", DEFAULT_MAX_ATTEMPTS);
}

export const RATE_LIMIT_MESSAGE =
  "You've submitted several reports recently. Please wait a few minutes before submitting another.";

// PRD 12.5 — throttling only, no content moderation (a distinct,
// out-of-scope concern per the spec). A Postgres sliding window over a
// dedicated table (ticket scope: "avoid introducing a new infra
// dependency if the existing stack already covers it" — it does).
// Threshold and window are both env-configurable so the limit can be
// tuned without a code change (ticket acceptance criterion).
//
// Every call records an attempt regardless of outcome — a rejected
// attempt still counts toward the window, so immediately retrying
// doesn't reset it, and a legitimate single submission is never affected
// since it's the first attempt in its own window either way.
export async function checkSubmissionRateLimit(identifier: string): Promise<{ allowed: boolean }> {
  const db = createServiceRoleClient();
  const windowStart = new Date(Date.now() - windowMs()).toISOString();

  const { count, error } = await db
    .from("submission_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("created_at", windowStart);
  if (error) throw error;

  const allowed = (count ?? 0) < maxAttempts();

  const { error: insertError } = await db.from("submission_attempts").insert({ identifier });
  if (insertError) throw insertError;

  // Light housekeeping, not a full solution: since this identifier's row
  // is already being touched, also drop its own rows that fell out of
  // the window — keeps a repeat visitor's row count bounded without a
  // separate cron job. A visitor who never returns still leaves one row
  // behind indefinitely; if that ever matters, a scheduled sweep
  // (`delete from submission_attempts where created_at < now() -
  // interval '...'`) would be the fix, not a change here.
  await db.from("submission_attempts").delete().eq("identifier", identifier).lt("created_at", windowStart);

  return { allowed };
}
