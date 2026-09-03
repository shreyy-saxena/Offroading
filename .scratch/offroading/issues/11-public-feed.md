# 11: Public feed

Status: ready-for-agent
Blocked by: 02, 04, 08, 19

## Spec references

- PRD Section 7; Section 8 FR8
- Spec User Stories 16, 17

## Scope

- No-login page listing all submitted reports: photo, locality + district, reporter type, submission time.
- Strictly excludes reporter contact details and email delivery diagnostics — enforce this at the query/serialization boundary, not just by omitting fields in the UI (defense against the RLS/app-layer boundary from ticket 02 being loosened later).
- This is the landing destination after every citizen submission (ticket 08) and the home base for the permalink (ticket 12) and share UI (ticket 13).

## Acceptance Criteria

- [x] Feed lists all reports with exactly the allowed fields, newest first (or a defined order — confirm/pick a reasonable default, e.g. newest first).
- [x] No response payload (including dev tools network inspection) contains reporter contact fields or delivery status/error detail for an unauthenticated request.
- [x] Feed loads with no login/session required.

## Out of scope for this ticket

- Per-report permalink page (ticket 12).
- Share buttons on feed cards (ticket 13).

## Testing

- Integration test (ticket 03 harness): seed reports with contact fields populated, fetch the public feed endpoint, assert contact/delivery fields are absent from the response — not just unrendered.

## Comments

- **Found and fixed a real gap from ticket 08**: while writing this ticket's tests, discovered ticket 08's nullable-coordinates migration (`supabase/migrations/20260904090000_nullable_report_coordinates.sql`) had never actually been applied to the live database, despite being marked done — `latitude`/`longitude` were still `NOT NULL` live. Confirmed via `information_schema.columns` before re-pasting the migration and getting it applied for real this time. Ticket 08's own record has been left as-is (it did accurately describe the intended fix and reasoning) but this is worth knowing: **always re-verify a migration is live, not just that it was presented once** — a "done" from the user in an earlier turn isn't proof a specific SQL paste succeeded.
- **Double defense-in-depth on the privacy boundary, not just the DB view**: `listPublicReports()` (`src/lib/reports/public-feed.ts`) selects an explicit column list from `public_reports` (ticket 02's view) rather than `*`, and the feed page is a Server Component that never passes the raw report object to any Client Component — so even the RSC flight payload sent to the browser can't carry the excluded fields, not just the rendered HTML. Verified directly: fetched the live page's raw HTML via curl (not just visually) and confirmed none of a seeded report's contact fields or delivery status appeared anywhere in the response.
- **New `createAnonClient()` in `src/lib/supabase/server.ts`**: the existing `createClient()` depends on `next/headers`' `cookies()`, which throws outside an actual Next.js request context — including in a plain Vitest test, discovered while writing this ticket's tests. Since the feed is always-anonymous and never needs session awareness, added a lighter client that skips the cookie plumbing entirely (mirrors `createServiceRoleClient()`'s shape, anon key instead). Prefer `createClient()` for anything that might actually be signed in (admin routes, ticket 14+); use this for reads that are identical regardless of caller.
- `BottomNav` (built in ticket 19, unused until now) is wired into a real screen for the first time here.
- Verified live: seeded two real reports (one with `reporter_name`/`mobile`/`email`/`sent` status populated) via service-role, loaded `/feed` in a real browser, confirmed newest-first ordering and correct locality/district/reporter-type/time display, zero console errors, then cleaned up.
- `tsc`, `eslint`, and `pnpm test` (36/36) all pass clean.
