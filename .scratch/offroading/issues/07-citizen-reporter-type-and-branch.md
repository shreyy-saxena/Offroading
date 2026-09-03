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

- [x] Reporter type is captured and carried in flow state.
- [x] "Just log it" path is reachable without ever asking for contact details.
- [x] "Email the authorities" path hands off into ticket 08's contact step with all prior flow state (photo, locality, district, reporter type) intact.

## Out of scope for this ticket

- Actual DB write / submission (ticket 08).
- Contact-details form (ticket 08).

## Testing

- UI test asserting the two paths diverge correctly and flow state survives the branch.

## Comments

- **Two sequential screens**, matching the PRD's own step numbering (5 and 6) rather than combining into one: `src/components/report-flow/{ReporterTypeStep,LogOrEmailStep}.tsx`. Both CTAs on the log-or-email screen are equal-weight buttons — PRD doesn't establish a visual hierarchy between them, so none was invented.
- **`FlowState` continues the same discriminated-union pattern** from tickets 05/06 (each step's variant carries all accumulated prior state) rather than switching to a flatter "draft object" shape. It's getting deep (6 variants now) and ticket 08 will add more — worth reconsidering the shape then if it gets unwieldy, but not warranted yet on its own.
- `tests/reporter-type-flow.test.tsx` drives the *whole* assembled `ReportFlow` from photo through to the ticket-08 placeholder (not just the two new components in isolation) for both branches, since "flow state survives the branch" is inherently about the wizard as a whole, not one component — matches the spec's "test through the real seam" philosophy.
- Verified live end-to-end in a real browser (no LocationIQ key, same as ticket 06 — manual entry path): photo → manual locality → reporter type → log-or-email → placeholder, correct state at every step, zero console errors.
- `tsc`, `eslint`, and `pnpm test` (19/19) all pass clean.
