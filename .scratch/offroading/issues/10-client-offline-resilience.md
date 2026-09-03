# 10: Client offline resilience (IndexedDB)

Status: ready-for-agent
Blocked by: 05, 06, 07, 08

## Spec references

- PRD Section 12.6 (Client Resilience); Section 8 FR9
- Spec User Story 14

## Scope

- Persist in-progress report data (photo, GPS point, locality/district selection, reporter type, log/email choice, contact details as entered) to IndexedDB as the citizen moves through the flow built in tickets 05–08.
- Restore from IndexedDB if the app reloads mid-flow (e.g. after a dropped connection).
- Clear the persisted state on successful submit.

## Acceptance Criteria

- [ ] Reloading the app mid-flow restores the citizen to where they left off, with prior selections intact.
- [ ] A successful submission clears the persisted draft — a fresh flow afterward starts empty.
- [ ] An abandoned draft doesn't block starting a new report from the landing screen.

## Out of scope for this ticket

- Server-side draft persistence — this is client-only, local-device resilience.

## Testing

- Simulate a mid-flow reload in a browser/component test and assert restored state; assert clearing after a successful submit (using ticket 08's submission path).
