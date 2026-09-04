# 16: Admin dashboard — mapping & reports views

Status: ready-for-agent
Blocked by: 14, 15, 19

## Spec references

- PRD Section 6 Step 2 (View current mapping, View reports); Section 8 FR4
- Spec User Stories 24, 25, 26, 27

## Scope

- **View current mapping**: read-only table of district → authority email currently in effect (reflects ticket 15's uploads live).
- **View reports**: table of all submitted reports including fields not on the public feed — reporter name/mobile/email, and email delivery status (sent/failed/queued/not applicable) with error detail where present.
- No manual "retry send" action anywhere in this view — explicit non-goal; a failed send is recovered only via a corrected CSV upload (ticket 15).
- No moderation/deletion controls — explicit non-goal.

## Acceptance Criteria

- [x] Mapping table shows exactly what's currently in `district_mapping`, read-only.
- [x] Reports table shows every report with contact fields and delivery status/error detail visible (admin-only, enforced server-side per ticket 14).
- [x] No retry, edit, or delete control exists anywhere on this page.

## Out of scope for this ticket

- CSV upload itself (ticket 15) — this ticket only renders its result.

## Testing

- Integration test: seeded reports with varied delivery statuses render correctly in the admin view; the same data fetched without admin auth is rejected (reuses ticket 14's boundary).

## Comments

- **Update 2026-09-04 — reversed**: "No moderation/deletion controls" (scope line above, and acceptance criterion "No retry, edit, or delete control exists anywhere on this page") was a deliberate v1 non-goal at the time this ticket was built, per explicit PRD Section 3/11 language. The user later explicitly asked for admin report deletion; see ticket 20 for the addition. Left this ticket's original text as-is (an accurate record of what v1 shipped and why) rather than rewritten — ticket 20 and the PRD's own struck-through non-goal lines carry the current state.
- **No separate admin re-check inside `listDistrictMapping`/`listAdminReports`** — deliberate, and different from ticket 15's `uploadMappingAction`. Those two are plain Server Component data reads (`src/lib/admin/district-mapping.ts`, `src/lib/admin/reports.ts`), not Server Actions — Next.js's "page-level check doesn't extend to Server Actions" caveat (which ticket 15 hit and worked around) specifically doesn't apply to ordinary page rendering, since a page's render only ever happens by first passing through its layout tree. Ticket 14's `(protected)/layout.tsx` guard runs and can `redirect()` before `AdminDashboardPage` (and therefore these reads) ever executes. Confirmed live: `curl -i http://localhost:3000/admin` unauthenticated returns a 307 to `/admin/login` with zero report/mapping data anywhere in the response body — the redirect happens before any of this ticket's data ever gets fetched, let alone rendered.
- **Testing note**: the "same data fetched without admin auth is rejected" criterion isn't meaningfully testable by calling `listDistrictMapping`/`listAdminReports` directly in a unit test the way ticket 15 tested `uploadMappingAction` — these two functions have no access-control logic of their own to test (see point above), so a test asserting they "reject" wouldn't be testing anything real. Verified the actual boundary live instead (previous point), and via the automated suite for data shape/correctness only.
- **`router.refresh()` after a successful upload** (`UploadMappingSection.tsx`) — added once this ticket's `MappingTable` existed to update, so ticket 15's "the read-only view reflects it immediately" acceptance criterion is now literally true rather than needing a manual page reload; confirmed live (upload a CSV, table updates with the new district/email and the old one gone, with no reload in between).
- **Design restraint**: no color-coded status badges — kept to the existing near-monochrome palette (PRD 14.1) plus the one precedent already established elsewhere in the app (`text-red-600` for error text, e.g. login/contact-details forms), reused here only for `email_error_detail`. Status itself is a plain text label.
- **Wide reports table**: `ReportsTable` sets `min-w-[42rem]` inside its own `overflow-x-auto` wrapper rather than widening the page — the outer dashboard container stays `max-w-lg` like every other page in this app; the table scrolls horizontally within its own card instead.
- Verified live in a real browser (transient Playwright, installed/removed after): seeded mapping + a `sent` report render correctly in both tables with all admin-only fields visible (name/mobile/email/status), zero retry/delete/edit controls anywhere on the page (asserted via role-based locator counts, not just visual inspection), and the unauthenticated-redirect boundary confirmed via raw `curl -i`. All seeded data deleted afterward.
- `tsc`, `eslint`, and `pnpm test` (68/68) all pass clean.
