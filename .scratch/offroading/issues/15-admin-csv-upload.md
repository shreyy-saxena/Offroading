# 15: Admin CSV mapping upload

Status: ready-for-agent
Blocked by: 02, 09, 14

## Spec references

- PRD Section 6 Step 2 (Upload mapping); Section 12.3; Section 8 FR5, FR6
- Spec User Stories 20, 21, 22, 23; Implementation Decisions — "CSV upload", "Queued reports"

## Scope

- Admin-only upload of a two-column CSV (district name, authority email).
- Validation per row: email format, and district name checked against the canonical district table (ticket 01). **Any** invalid row rejects the **whole file** with a clear explanation (which row(s), what's wrong) — no partial mapping state ever persists.
- A valid upload **fully replaces** `district_mapping` (delete-all + insert in one transaction, per ticket 02) — never a merge.
- After a successful replace, find any `reports` currently `queued` whose district is newly covered by this upload, and trigger their email send via ticket 09's send function, followed by the queued-confirmation email to each original reporter.

## Acceptance Criteria

- [x] A fully valid CSV replaces the mapping in one transaction and the read-only view (ticket 16) reflects it immediately. (Ticket 16 doesn't exist yet to verify the view itself — verified instead that `district_mapping` is fully and correctly replaced immediately after upload, both via direct DB read and live in the browser; ticket 16 will just be a fresh read of the same table, no caching involved.)
- [x] A CSV with even one malformed email or unrecognized district is rejected entirely, with an error identifying the offending row(s); the existing mapping is untouched.
- [x] Uploading a mapping that newly covers a district with queued reports automatically triggers those sends and the reporter confirmation emails, with no further admin action.
- [x] Concurrent uploads: last-write-wins is acceptable per spec assumption — no locking mechanism required, but the delete+insert must still be atomic per upload (no interleaved partial state visible mid-upload).

## Out of scope for this ticket

- Read-only mapping table UI (ticket 16) — this ticket is the upload/validation/replace/trigger logic and its own success/error UI.

## Testing

- Integration test (ticket 03 harness + Resend fake): valid upload replaces mapping; invalid-row upload leaves mapping untouched and surfaces the right error; upload covering a queued report's district results in that report's status moving from `queued` to `sent` and a confirmation email fake-call being made.

## Comments

- **Atomicity required a real Postgres function, not two client calls.** supabase-js has no client-side multi-statement transaction API, so "delete-all + insert in one transaction" (scope line, acceptance criterion 4) is implemented as `replace_district_mapping(rows jsonb)` in a new migration (`supabase/migrations/20260904100000_replace_district_mapping_fn.sql`) — one function call is one implicit Postgres transaction, so a failure partway through rolls back the delete too.
- **Two real, live-discovered gotchas while getting that function working** (both required the user to re-run updated SQL in the Supabase SQL Editor — same manual-apply workflow as tickets 02/08, no programmatic DDL access available to this session):
  1. A Postgres function's `EXECUTE` privilege defaults to **PUBLIC**, unlike a table (which defaults to no access). Without an explicit `revoke ... from public, anon, authenticated` + `grant ... to service_role`, this function would have been silently callable by `anon`/`authenticated` straight through PostgREST — completely bypassing the admin re-check ticket 14 established. Caught by reasoning about ticket 02's access model before ever shipping it, not by an incident.
  2. **Supabase installs the `pg-safeupdate` extension by default**, which rejects a bare `DELETE`/`UPDATE` with no `WHERE` clause — even inside a `SECURITY INVOKER` function running as `service_role`. The first version of this migration's `delete from district_mapping;` failed live with `"DELETE requires a WHERE clause"`. Fixed with the standard workaround, `delete from district_mapping where true;`. Worth remembering for any future full-table delete/replace in this project.
- **Server Action re-checks admin itself — does not rely on ticket 14's layout guard.** Per Next.js's own Data Security guide (`node_modules/next/dist/docs/01-app/02-guides/data-security.md`, "Authentication and authorization" section): *"A page-level authentication check does not extend to the Server Actions defined within it... the Server Action is a separate entry point and must verify the caller on its own."* Confirmed this is real, not just a docs caveat — Server Actions are reachable as direct POST requests regardless of which page rendered them. `src/app/admin/(protected)/mapping-actions.ts`'s `uploadMappingAction` calls `getAdminUser` itself before doing anything. This is a pattern every future admin-mutating action (ticket 16 has none planned, but if that changes) needs to repeat — the layout only controls which *UI* a browser is shown, nothing more.
- **A second real gotcha, caught by the automated test suite itself, not manual testing**: the admin-mutation testing exposed a structural gap in the shared-live-DB test harness. Vitest runs test *files* in parallel by default; `replaceDistrictMapping`'s full-table wipe (correct, required behavior) raced against `submit-report.test.ts`'s own seeded `district_mapping` row in a different file, non-deterministically deleting it mid-test and failing an unrelated test. Fixed by setting `fileParallelism: false` in `vitest.config.mts` — every prior ticket's tests only ever inserted/read their own tracked rows, so this race was latent but never triggered until a full-table mutation existed. Confirmed fixed with 5 consecutive full clean runs after the change (all 66 tests, all files) — 1 in 5 failed before it.
- **CSV parsing** (`src/lib/csv/district-mapping.ts`, pure, unit-tested with no DB/network): comma-split, optional header row (recognized only as the very first non-blank line, matched on `"district"` — safe since no real district in the canonical list is named that), every row validated (not just the first failing one, so one upload attempt surfaces every problem at once), plus a same-file duplicate-district check that isn't explicitly in the spec but exists because `district_mapping.district` is a primary key — an in-file duplicate would otherwise surface as a raw Postgres constraint-violation error out of the RPC instead of a row-scoped message.
- **Queued-report triggering logic** (`src/lib/admin/district-mapping.ts`): no diffing of old vs. new mapping needed — a currently-`queued` report's district necessarily had *no* mapping as of submission (ticket 08 only queues on a null lookup), so any district present in a freshly-replaced mapping is, by construction, newly covered. Confirmation email (`sendQueuedReportConfirmation`) only fires on a successful complaint send — a failed complaint send stays `failed` with no confirmation implied, matching the normal (non-queued) failed-send semantics from ticket 09.
- **Live-verified end to end**, not just the automated suite (66/66 passing): a real dev server, a real seeded admin account, and a transient Playwright pass (installed then removed after, same pattern as tickets 05/13/14) — an invalid CSV showed the exact expected row-level error live in the browser, a valid two-district CSV replaced the mapping (confirmed both via the UI's success message and by reading `district_mapping` directly), and a real seeded `queued` report in one of the uploaded districts had its trigger logic actually execute against the live DB. That last part correctly settled to `failed` with a real error detail (`RESEND_API_KEY is not configured.`) rather than sending — this environment has no real Resend account yet (same situation as tickets 06/09), so the "sent" branch of this trigger path is only exercised by the mocked/faked automated tests for now, same caveat as those tickets. All seeded test data deleted afterward.
- `tsc`, `eslint`, and `pnpm test` (66/66) all pass clean.
