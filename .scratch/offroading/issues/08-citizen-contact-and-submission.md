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

- [ ] All four terminal outcomes (`not_applicable`, `sent`, `failed`, `queued`) are reachable through the flow and produce a saved row — none of them ever fail to save the report itself.
- [ ] Locality → district resolution happens server-side before checking `district_mapping`, not trusted from client-only state.
- [ ] The no-mapping branch offers exactly the three choices above, no more/fewer.
- [ ] Confirmation always routes to the public feed.

## Out of scope for this ticket

- The actual email send implementation (ticket 09) — this ticket calls it as a dependency.
- Queued-email auto-trigger on later CSV upload (ticket 15).

## Testing

- Per spec Testing Decisions: integration tests against the real DB (ticket 03 harness) asserting each terminal state is reached and persisted correctly, using the Resend fake for the two branches that send immediately.
