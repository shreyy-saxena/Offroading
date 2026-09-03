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

- [ ] Feed lists all reports with exactly the allowed fields, newest first (or a defined order — confirm/pick a reasonable default, e.g. newest first).
- [ ] No response payload (including dev tools network inspection) contains reporter contact fields or delivery status/error detail for an unauthenticated request.
- [ ] Feed loads with no login/session required.

## Out of scope for this ticket

- Per-report permalink page (ticket 12).
- Share buttons on feed cards (ticket 13).

## Testing

- Integration test (ticket 03 harness): seed reports with contact fields populated, fetch the public feed endpoint, assert contact/delivery fields are absent from the response — not just unrendered.
