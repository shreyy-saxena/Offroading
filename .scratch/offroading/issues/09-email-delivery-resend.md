# 09: Email delivery via Resend

Status: ready-for-agent
Blocked by: 02, 03

## Spec references

- PRD Section 12.4 (Email Delivery); Section 8 FR4
- Spec Implementation Decisions — "Email delivery", "Failed-send recovery", "Queued reports"

## Scope

- Resend integration, launching on Resend's shared sandbox sending domain for v1 (no dedicated verified domain yet).
- A send function: takes report details (photo URL, location, reporter details) + target authority email, sends the complaint email, returns/persists outcome onto the report's `email_delivery_status` + error detail.
- Automatic retry with backoff on failure (a few attempts); a send that fails permanently stays `failed` — no manual retry surface anywhere (confirmed non-goal).
- Queued-report confirmation: when a queued report's email is triggered later (by ticket 15's CSV upload flow), send a short confirmation email to the original reporter (their address was already captured at submission).

## Acceptance Criteria

- [ ] A successful send updates the report to `sent`.
- [ ] A transient failure is retried a bounded number of times with backoff before settling to `failed`.
- [ ] A permanent failure (e.g. malformed authority address) settles to `failed` with an error detail string, no infinite retry.
- [ ] Sending a queued report's confirmation email is a distinct, callable path (used by ticket 15), separate from the original complaint send.

## Out of scope for this ticket

- Any dashboard "retry" action — explicitly out of scope per spec.
- The triggering logic that decides *when* a queued email should fire (ticket 15) — this ticket only provides the send capability ticket 15 calls.

## Testing

- Using ticket 03's Resend fake: success, transient-then-success (retry), and permanent-failure fixtures. Assert on the report's persisted `email_delivery_status`/error detail, not on internal retry call counts.
