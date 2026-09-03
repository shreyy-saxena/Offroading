# 08: Citizen flow — contact details & submission logic

Status: ready-for-agent
Blocked by: 02, 07

## Spec references

- PRD Section 5 Steps 7–9; Section 8 FR1, FR3
- Spec User Stories 9, 10, 11, 13, 15; Implementation Decisions — "Location model" (district resolution for routing)

## Scope

This is the core write path — the primary seam called out in the Testing Decisions section.

- Contact-details step (name, mobile, email) — only reached via the "Email the authorities" branch (ticket 07).
- Submission route handler / server action that, regardless of path taken, **always saves the report** (FR3 — nothing silently discarded):
  - "Just log it" → save with `email_delivery_status = 'not_applicable'`, no contact fields.
  - "Email the authorities" + district has a mapping on file → save + trigger immediate send (hands off to ticket 09) → status `sent`/`failed` per delivery outcome.
  - "Email the authorities" + **no** mapping on file for the resolved district → present three choices per PRD 5.8:
    a. citizen supplies the email themselves → send immediately to that address.
    b. cancel → save as logged only, no send.
    c. queue → save with `email_delivery_status = 'queued'`; no further action from the citizen (ticket 15 triggers the eventual send).
- On any successful save, land the user on the public feed (confirmation), where ticket 13's share options attach.

## Acceptance Criteria

- [x] All four terminal outcomes (`not_applicable`, `sent`, `failed`, `queued`) are reachable through the flow and produce a saved row — none of them ever fail to save the report itself.
- [x] Locality → district resolution happens server-side before checking `district_mapping`, not trusted from client-only state.
- [x] The no-mapping branch offers exactly the three choices above, no more/fewer.
- [x] Confirmation always routes to the public feed.

## Out of scope for this ticket

- The actual email send implementation (ticket 09) — this ticket calls it as a dependency.
- Queued-email auto-trigger on later CSV upload (ticket 15).

## Testing

- Per spec Testing Decisions: integration tests against the real DB (ticket 03 harness) asserting each terminal state is reached and persisted correctly, using the Resend fake for the two branches that send immediately.

## Comments

- **Ticket 09 pulled ahead of this one**: this ticket's own scope hands the send off to "ticket 09 as a dependency," but 09 wasn't listed as a blocker here (a gap in the tracker's graph) — since 09 was independently unblocked, built it first rather than stubbing the send and swapping it out immediately. See ticket 09's Comments for that reasoning.
- **Real schema gap found while wiring the write path**: `reports.latitude`/`longitude` were `NOT NULL` (ticket 02), but a report reached via ticket 06's manual-locality path (GPS denied/unavailable) has no device coordinate at all. Fixed with a new migration (`supabase/migrations/20260904090000_nullable_report_coordinates.sql`, applied live via the SQL Editor and verified against the real DB) rather than editing ticket 02's migration — see that ticket's follow-up note. `BaseReportInput.latitude`/`longitude` are `number | null` throughout; the complaint email template omits the location line entirely when null rather than showing a fake `0.00000, 0.00000`.
- **One INSERT per report, no UPDATE** — matches ticket 09's design (pure send functions, no DB access): the final `email_delivery_status` is always resolved *before* the single `insertReport` call, since there's no "pending" value in the CHECK constraint to hold an in-between state.
- **"Cancel" ≡ "just log it"** at the DB level: both produce `not_applicable` with no contact fields stored. There's no 5th status value for "attempted to email, then cancelled," and once cancelled there's no remaining reason to retain the contact details that were only collected for a send that didn't happen — dropping them keeps the FR8 privacy boundary tighter than necessary rather than looser.
- **Server-side re-validation** (`assertValidReportInput` in `src/lib/reports/submit-report.ts`): a Server Action is a real network endpoint, not a client-trusted RPC, so `district` is re-checked against the canonical list (`isKnownDistrict`) on every submission path — a client submitting straight to the action with a fabricated district string is rejected before anything is looked up or saved. Covered by its own integration test.
- **Verified live end-to-end** in a real browser for the two paths that don't need real Resend/LocationIQ credentials (just-log, and email→no-mapping→queue): actual rows landed in the live DB with exactly the expected fields (confirmed via the REST API before cleanup), actual redirects to `/feed`, zero console errors. The `sent`/`failed`/provide-email paths are covered by the automated MSW-faked integration tests instead, same reasoning as tickets 06/09 (no real Resend account configured yet).
- 7 new integration tests (`tests/submit-report.test.ts`) cover all four terminal outcomes plus cancel, provide-email, and the district-tampering rejection — against the real DB and Resend fake, per the spec's primary-seam testing philosophy.
- `tsc`, `eslint`, and `pnpm test` (31/31) all pass clean.
