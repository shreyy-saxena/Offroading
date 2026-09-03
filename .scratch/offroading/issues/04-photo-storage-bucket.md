# 04: Photo storage bucket

Status: ready-for-agent
Blocked by: 01

## Spec references

- PRD Section 12.5 (Photo storage)
- Spec Implementation Decisions — "Photo storage"

## Scope

- Create a **public** Supabase Storage bucket for report photos — directly linkable, no signed-URL requirement, consistent with the feed's public-by-design purpose and with Section 13's Open Graph image requirement (ticket 12).
- Server-side upload helper: accepts a photo file, stores it, returns the public URL to persist on the `reports` row.
- Sane default validation only (file type/size sanity check) — per spec Out of Scope, no enforcement beyond sane defaults.

## Acceptance Criteria

- [x] A photo uploaded via the helper is retrievable at a public URL with no auth.
- [x] Oversized or non-image files are rejected with a clear error (sane-default check, not a configurable policy).

## Out of scope for this ticket

- The citizen-facing capture/upload UI (ticket 05) — this ticket is the storage plumbing it will call.

## Testing

- Integration test against real Supabase Storage (per ticket 03's harness): upload a fixture image, assert the returned URL is publicly fetchable.

## Comments

- **Bucket created live via the Storage Management REST API** (`POST /storage/v1/bucket`, service-role auth) rather than the SQL Editor — unlike ticket 02's schema, storage buckets aren't DDL, so this needed no manual paste step. Bucket id `report-photos`, `public: true`, `file_size_limit: 10485760` (10MB), `allowed_mime_types` restricted to jpeg/png/webp/heic/heif. Confirmed live via `GET /storage/v1/bucket/report-photos`.
- **No storage RLS policies needed**: a `public: true` bucket serves reads through Supabase's dedicated public-object endpoint without needing a `storage.objects` SELECT policy (same mechanism as `district_mapping` in ticket 02 for writes) — the upload helper always uses the service-role client, so there's no anon write path to guard against either.
- **Helper**: `src/lib/storage/report-photos.ts` — `uploadReportPhoto(file: Blob)` validates mime type (against an explicit allow-list, which also supplies the file extension for the storage key — never trusts a client-supplied filename) and size, uploads via service-role, returns `{ publicUrl, path }`. `deleteReportPhoto(path)` for cleanup/future admin use. Bucket-level limits mirror the app-layer check as defense in depth.
- **Test harness extended**: added `tests/support/storage.ts` (`trackStorageObject`/`cleanupTrackedStorageObjects`), same tracked-cleanup pattern as ticket 03's DB harness, wired into the same global `afterEach`. Also added a path alias (`@` → `src/`) to `vitest.config.mts` so tests can import app code the same way the app does — needed starting with this ticket, will matter more from ticket 05 on.
- Verified live: ran the suite, then listed the `report-photos` bucket directly via the Storage API and confirmed zero objects left behind.
- `tsc`, `eslint`, and `pnpm test` all pass clean.
