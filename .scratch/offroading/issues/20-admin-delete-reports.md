# 20: Admin — delete reports (single or multi-select)

Status: ready-for-agent
Blocked by: 16

## Spec references

- Reverses PRD Section 3 / Section 11's "no admin moderation/deletion of individual reports" non-goal, and spec's matching Out of Scope line — both struck-through-and-annotated in place, not deleted, per user request 2026-09-04.
- No PRD/spec user story exists for this (added after v1 was feature-complete) — this ticket file is the spec.

## Scope

- On the admin dashboard's reports view (ticket 16), let an admin select one or more reports via checkboxes (a header "select all" checkbox included) and delete them.
- Deletion is irreversible: removes the `reports` row(s) and best-effort removes each report's photo from Supabase Storage (never blocks the row deletion on storage cleanup succeeding).
- A confirmation step (native `confirm()`) before any delete actually runs — no accidental one-click data loss.
- No restore/undo — genuinely permanent, matching how the feature was asked for.

## Acceptance Criteria

- [x] Each report row has a checkbox; a header checkbox selects/deselects all.
- [x] A "Delete selected (N)" control appears only once at least one report is selected, and is disabled while a delete is in flight.
- [x] Confirming deletes exactly the selected reports — both the DB row and its Storage photo are gone; unselected reports are untouched.
- [x] Declining the confirmation dialog deletes nothing.
- [x] The delete Server Action independently re-checks admin status (Server Actions don't inherit a page's layout guard — ticket 15's same finding) rather than trusting the dashboard's own access control.

## Out of scope for this ticket

- Any edit/retry action — still an explicit non-goal (ticket 16), unaffected by this change.
- Soft-delete/undo/audit trail — the request was for a genuine permanent delete.

## Testing

- Integration test (ticket 03 harness, real DB + real Storage): deleting removes the row and the photo; deleting a subset leaves the rest untouched; multi-id delete in one call; empty-id-list no-op.
- The Server Action's own admin re-check isn't directly unit-testable (same `next/headers` request-scope restriction as every other "use server" wrapper in this project — see ticket 14/15/17's Comments) — covered by `getAdminUser`'s own tests (ticket 14) plus live verification below.

## Comments

- **Data-layer detail**: `reports.photo_url` stores the full public Storage URL, not a bare path — there's no separate path column (schema unchanged since ticket 02). `deleteReports` (`src/lib/admin/reports.ts`) recovers the path by parsing the URL rather than adding a migration for this. A URL that doesn't match the expected shape just skips storage cleanup for that row (defensive; never actually hit — every report's photo went through `uploadReportPhoto`, which always produces this shape).
- **`ReportsTable` split into two components**: it stays an async Server Component doing the data fetch (unchanged reasoning from ticket 16 — a plain read, protected by the layout guard alone), now rendering a new `ReportsTableClient` (`"use client"`) that owns selection state and the delete button/confirmation/`router.refresh()`. Mirrors the existing `UploadMappingSection` pattern (ticket 15) for the refresh-after-mutation behavor.
- **Verified live** in a real browser (transient Playwright, installed/removed after, same pattern as every prior ticket): logged in as a seeded admin, selected two of three seeded reports, confirmed the native dialog showed the correct pluralized "Delete 2 reports? This cannot be undone..." text, accepted it, and confirmed via a direct DB query (not just the UI updating) that exactly the two selected reports were gone and the third survived untouched. All seeded test data cleaned up afterward.
- 86/86 automated tests pass; `tsc`/`eslint` clean.
