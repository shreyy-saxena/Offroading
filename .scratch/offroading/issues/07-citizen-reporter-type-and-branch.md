# 07: Citizen flow — reporter type & log-or-email choice

Status: ready-for-agent
Blocked by: 06

## Spec references

- PRD Section 5 Steps 5–6
- Spec User Stories 7, 8

## Scope

- Step: user selects **passer-by** or **resident** for the confirmed area.
- Step: user chooses **"Just log it"** (ends the flow → submission with no contact fields, `email_delivery_status = 'not_applicable'`) or **"Email the authorities"** (continues to ticket 08's contact-details step).
- This ticket wires the branch point only; the actual submission logic (both branches converge here) is ticket 08.

## Acceptance Criteria

- [ ] Reporter type is captured and carried in flow state.
- [ ] "Just log it" path is reachable without ever asking for contact details.
- [ ] "Email the authorities" path hands off into ticket 08's contact step with all prior flow state (photo, locality, district, reporter type) intact.

## Out of scope for this ticket

- Actual DB write / submission (ticket 08).
- Contact-details form (ticket 08).

## Testing

- UI test asserting the two paths diverge correctly and flow state survives the branch.
