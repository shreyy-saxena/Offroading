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

- [ ] A fully valid CSV replaces the mapping in one transaction and the read-only view (ticket 16) reflects it immediately.
- [ ] A CSV with even one malformed email or unrecognized district is rejected entirely, with an error identifying the offending row(s); the existing mapping is untouched.
- [ ] Uploading a mapping that newly covers a district with queued reports automatically triggers those sends and the reporter confirmation emails, with no further admin action.
- [ ] Concurrent uploads: last-write-wins is acceptable per spec assumption — no locking mechanism required, but the delete+insert must still be atomic per upload (no interleaved partial state visible mid-upload).

## Out of scope for this ticket

- Read-only mapping table UI (ticket 16) — this ticket is the upload/validation/replace/trigger logic and its own success/error UI.

## Testing

- Integration test (ticket 03 harness + Resend fake): valid upload replaces mapping; invalid-row upload leaves mapping untouched and surfaces the right error; upload covering a queued report's district results in that report's status moving from `queued` to `sent` and a confirmation email fake-call being made.
