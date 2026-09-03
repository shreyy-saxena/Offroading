# 02: Database schema & migrations

Status: ready-for-agent
Blocked by: 01

## Spec references

- PRD Sections 5, 6, 7, 12.5, 13.3
- Spec User Stories 1–17d; Implementation Decisions — "Location model", "Admin authorization", "Email delivery", "Photo storage", "Social sharing"

## Scope

Design and migrate the Postgres schema (via Supabase migrations) for:

- **`reports`**: photo URL, GPS point (or lat/lng), locality name, district name (FK/reference into the canonical district list from ticket 01), reporter type (`passerby` | `resident`), reporter name/mobile/email (nullable — only present if the citizen chose to email), email delivery status (`not_applicable` | `sent` | `failed` | `queued`), error detail (nullable), created_at.
- **`district_mapping`**: district name (unique), authority email. This table is always fully replaced on a new CSV upload (ticket 15), never merged.
- Supabase Auth is used as-is for admin accounts (ticket 14) — no separate `admins` table needed unless role info can't be carried on the Supabase Auth user (e.g. via `app_metadata`); decide during implementation and note the choice in this ticket's Comments.
- Row-level security: public read on the subset of `reports` columns needed for the feed (or fetch full rows server-side and filter in application code — decide based on what's simplest to keep the FR8 privacy boundary airtight); admin-only read on contact/delivery fields and all of `district_mapping` writes.

## Acceptance Criteria

- [x] Migration files create `reports` and `district_mapping` with the fields above.
- [x] A report can be inserted with `email_delivery_status = 'not_applicable'` and no contact fields, and separately with contact fields + `'sent'`/`'failed'`/`'queued'` — verified live via service-role insert (2026-09-03).
- [x] RLS prevents an unauthenticated read of reporter contact fields or delivery status/error detail — verified live: anon gets zero rows from `reports` directly and only the feed-safe columns via `public_reports`; anon cannot insert into `reports` at all (report submission is server-side via service-role, see Comments).
- [x] `district_mapping` upsert-by-replace is possible in a single transaction — schema has no unique-constraint obstacles to `delete + insert` (or `truncate + insert`) in one transaction; the transaction itself is written in ticket 15's route handler, out of scope here.

## Out of scope for this ticket

- Any UI or API route — this is schema only.

## Testing

- Per spec Testing Decisions: exercise this schema through real Postgres (Supabase local or a test project), not a mock. A minimal test here just confirms constraints/RLS behave as above; full behavioral tests live with the tickets that add the route handlers (07, 08, 15).

## Comments

- **Admin authorization / no `admins` table (2026-09-03)**: role lives on the Supabase Auth user's `app_metadata.role = 'admin'` (settable only via service-role, not by the user) rather than a separate table. Kept the DB-level authorization boundary minimal on purpose: `district_mapping` and the sensitive columns of `reports` carry **no** RLS policies for `anon`/`authenticated` at all (default-deny), so the only way to reach them is the service-role client (`src/lib/supabase/server.ts: createServiceRoleClient`) from an admin route handler that re-checks `app_metadata.role` on every request (FR7, and the spec's "checked on every request, not cached from login"). This avoids maintaining the same authorization rule twice (once as SQL, once as app code) — the app-layer check is the single source of truth. RLS's job here is just the anon/public boundary.
- **Public read boundary implementation**: `reports` has RLS enabled with only an `insert` policy for `anon`/`authenticated` — no `select` policy, so direct reads of the base table are blocked for everyone but the table owner/service-role. Public/feed reads go through a `public_reports` view (owned by the migration role, so it reads through RLS rather than being subject to it — the standard Supabase pattern) exposing only `id, photo_url, latitude, longitude, locality, district, reporter_type, created_at`. This satisfies FR8 structurally: there is no query path, correct or buggy, through which an anon client can select `reporter_name`/`reporter_mobile`/`reporter_email`/`email_delivery_status`/`email_error_detail`.
- **District is not a DB foreign key**: the canonical district list is the static `src/lib/data/districts.ts` from ticket 01, not a table, so `reports.district` and `district_mapping.district` are plain `text` validated against that list in application code (tickets 06/15), matching PRD 12.2 ("must never become a hard runtime dependency").
- **Location model**: plain `latitude`/`longitude double precision` columns, not PostGIS — v1 has no proximity/geo queries, only display and district-string matching, so a geometry type would be unused complexity.
- **`reports` has no anon INSERT policy either (revised 2026-09-03, after live testing)**: originally gave `anon`/`authenticated` an INSERT policy so citizens could write directly. Live verification against the real project caught a real gotcha: PostgREST's `Prefer: return=representation` (needed to get the new row's id back, e.g. for the permalink redirect) does an implicit `RETURNING`, which requires *read* access to the row too — and since `reports` deliberately has no SELECT policy for anon (reads go through `public_reports`), every insert-with-return failed with the same RLS error as a blocked insert, even though the INSERT `WITH CHECK` itself was fine. Rather than add a narrow SELECT policy just to unblock RETURNING, dropped the anon INSERT policy entirely: citizens never talk to Supabase directly in this architecture (the spec's testing section already treats the Next.js route handler as the access boundary), so report submission goes through the service-role client server-side, same as everything else. Nothing about the citizen-facing flow changes — this only affects which DB role executes the write. Worth remembering for ticket 08: use `createServiceRoleClient()`, not the cookie-based client, for the report-insert route handler.
- **Applied to the live project and verified 2026-09-03** — pasted directly into the Supabase SQL Editor (CLI push route documented in the README stayed unused this time, since it needs a login/DB-password the agent doesn't have). Verified against the live REST API: anon gets zero rows from `reports`/`district_mapping` directly, gets only the feed-safe columns via `public_reports`, and cannot insert into `reports`; service-role can insert/read full rows including contact fields, the `reporter_type` CHECK constraint rejects bad values, and `email_delivery_status` defaults to `not_applicable`. Test rows cleaned up afterward — live DB is empty of report data as of this ticket closing. Local migration file (`supabase/migrations/20260903120000_reports_and_district_mapping.sql`) matches what's live, including the anon-INSERT-policy reversal above.

**Ticket 02 is done.**

**Follow-up from ticket 08 (2026-09-04)**: `latitude`/`longitude` turned out wrong as `NOT NULL` — a report reached via ticket 06's manual-locality path (GPS denied/unavailable) has no device coordinate at all, only a locality/district string. Fixed in a new migration rather than editing this one: `supabase/migrations/20260904090000_nullable_report_coordinates.sql`. See ticket 08's Comments for the full reasoning.
