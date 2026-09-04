# 17: Submission rate limiting

Status: ready-for-agent
Blocked by: 08

## Spec references

- PRD Section 12.5 (Abuse throttling); Section 8 FR (general robustness), Section 3 non-goals (no content moderation, distinct from this)
- Spec User Story 30

## Scope

- Basic IP/device rate-limiting on the report-submission endpoint (ticket 08) to prevent trivial flooding of the loginless public flow.
- This is throttling only, not content moderation — no spam/quality judgment on report content, just a request-rate ceiling.
- Choose a lightweight mechanism appropriate to the Vercel/Supabase stack (e.g. a sliding-window counter in Postgres or an edge-compatible store) — avoid introducing a new infra dependency if the existing stack already covers it.

## Acceptance Criteria

- [x] Submissions beyond a defined threshold from the same IP/device within a window are rejected with a clear, non-technical message (not silently dropped, not a raw 500).
- [x] Legitimate low-volume usage (a citizen submitting one report) is never affected.
- [x] The limit is configurable (env var or constant) without a code change to adjust the threshold later.

## Out of scope for this ticket

- Any content-based spam detection — explicit non-goal.

## Testing

- Integration test: N+1 rapid submissions from the same simulated IP/device trip the limit; a normal single submission does not.

## Comments

- **Mechanism**: a Postgres sliding-window counter over a new `submission_attempts` table (`identifier`, `created_at`), not a new infra dependency — matches the ticket's own steer ("avoid introducing a new infra dependency if the existing stack already covers it"). `identifier` is IP-only (`x-forwarded-for` / `x-real-ip`, whichever Vercel sets), not IP+device: a spoofable client-generated device id would add complexity without real security benefit against the actual threat model here (a single script/actor flooding the loginless endpoint), which server-derived IP already bounds. Threshold (`SUBMISSION_RATE_LIMIT_MAX`, default 5) and window (`SUBMISSION_RATE_LIMIT_WINDOW_MS`, default 10 minutes) are both env-configurable with sane fallbacks if unset or invalid.
- **Every call records an attempt regardless of outcome** — a rejected attempt still counts toward the window, so immediately retrying doesn't reset it. Light housekeeping is folded into the same check (deletes that identifier's own rows once they fall out of the window) to keep a repeat visitor's row count bounded without a separate cron job; a visitor who never returns still leaves one row behind indefinitely, noted as a non-issue for v1 rather than solved.
- **Modeled as a return value, not a thrown error — deliberately, and following Next.js's own documented guidance** (`node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`, "Handling expected errors": *"avoid using try/catch blocks and throw errors. Instead, model expected errors as return values"*). This also sidesteps a real risk: Next.js can redact a thrown Server Action error's message in production, which would have silently swallowed the whole point of "a clear, non-technical message." All three submission actions (`submitLoggedReportAction`, `submitEmailReportAction`, `resolveMissingMappingAction`) now return a `{ outcome: "rate-limited"; message }` case alongside their existing success shapes, and all three client call sites (`LogOrEmailStep`, `ContactDetailsStep`, `MissingMappingStep`) check for it explicitly and surface `message` verbatim, rather than falling into the generic catch-block fallback text.
- **Another next/headers request-scope gotcha, same shape as ticket 14's `cookies()` one** — `headers()` also throws `"called outside a request scope"` when called from a plain vitest test (confirmed directly before writing anything, same as before). Since the rate-limit check needed to run inside all three existing submission Server Actions, this forced a real refactor: the actual submission orchestration logic (previously living directly in `src/app/actions/submit-report.ts`) moved into `src/lib/reports/submit-report.ts` as `submitLoggedReport`/`submitEmailReport`/`resolveMissingMapping`, each taking an explicit `rateLimitIdentifier: string` parameter instead of reaching for `headers()` itself. The `"use server"` action file is now a thin wrapper: resolve the identifier from `headers()`, delegate. `tests/submit-report.test.ts` (ticket 08's own tests) now calls these lib functions directly with a fresh random identifier per test, mirroring ticket 14's `signInAdmin`/`signInAdminAction` split for the identical underlying reason.
- **Live-verified with a real threshold trip**, not just the automated suite: temporarily set `SUBMISSION_RATE_LIMIT_MAX=2` in `.env.local` (reverted before committing — confirmed via `git diff` showing no changes), drove 3 full real submissions through the actual UI in a real browser (transient Playwright, installed/removed after). Submissions 1 and 2 both created real report rows (confirmed via direct DB read, not just the UI) — legitimate low-volume usage unaffected. Submission 3 was rejected with exactly `RATE_LIMIT_MESSAGE`, and correctly created no report row at all. All temp data cleaned up afterward.
- `tsc`, `eslint`, and `pnpm test` (73/73) all pass clean.
