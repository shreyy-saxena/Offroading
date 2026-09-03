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

- [x] A successful send updates the report to `sent`.
- [x] A transient failure is retried a bounded number of times with backoff before settling to `failed`.
- [x] A permanent failure (e.g. malformed authority address) settles to `failed` with an error detail string, no infinite retry.
- [x] Sending a queued report's confirmation email is a distinct, callable path (used by ticket 15), separate from the original complaint send.

## Out of scope for this ticket

- Any dashboard "retry" action — explicitly out of scope per spec.
- The triggering logic that decides *when* a queued email should fire (ticket 15) — this ticket only provides the send capability ticket 15 calls.

## Testing

- Using ticket 03's Resend fake: success, transient-then-success (retry), and permanent-failure fixtures. Assert on the report's persisted `email_delivery_status`/error detail, not on internal retry call counts.

## Comments

- **Pulled ahead of ticket 08** (2026-09-04): ticket 08's own scope explicitly hands off the send to "ticket 09 as a dependency," but the tracker's `Blocked by:` line on 08 doesn't list 09 — a gap in the graph. Since 09 was independently already unblocked (only needs 02, 03, both done), built it first rather than stubbing the send in 08 and immediately replacing it.
- **No DB access in this ticket's functions, by design** — `sendComplaintEmail`/`sendQueuedReportConfirmation` (`src/lib/email/deliver-report-email.ts`) are pure: given content + recipient, they return `{status: "sent"} | {status: "failed", error}`, nothing more. This matches this ticket's own "Out of scope" line ("the triggering logic... ticket 15... this ticket only provides the send capability"): callers own persisting the outcome onto whichever report row it belongs to — ticket 08 does one INSERT with the already-resolved status (there's no "pending" value in the `reports.email_delivery_status` CHECK constraint from ticket 02 to hold an in-between state), and ticket 15 will UPDATE an existing `queued` row after triggering a later send. Read "A successful send updates the report to sent" in this ticket's acceptance criteria as describing that end-to-end observable effect, not a literal UPDATE statement inside this ticket's code.
- **Retry**: 3 attempts total, exponential-ish backoff (100ms × attempt number — kept small so tests stay fast; real durations don't matter much for a background retry). A `ResendError`'s `permanent` flag (set from the HTTP status: 4xx-except-429 = permanent, 429/5xx = transient) decides whether to retry at all; a permanent failure returns `failed` on the first attempt, matching "no infinite retry" and the explicit non-goal of a dashboard retry action.
- `src/lib/email/resend-client.ts` is the thin HTTP wrapper (server-only, `RESEND_API_KEY` has no `NEXT_PUBLIC_` prefix); `deliver-report-email.ts` is the retry/report-shaping layer on top.
- Test fakes extended in `tests/support/fakes/resend.ts`: a transient-failure handler (429, never recovers) and a `createResendTransientThenSuccessHandler()` factory (fails once, then succeeds) alongside the existing success/permanent-failure handlers.
- `.env.local`'s `RESEND_API_KEY` is empty (no real Resend account yet, same situation as LocationIQ in ticket 06) — `tests/setup.ts` fills a placeholder for test runs, same reasoning as before.
- `tsc`, `eslint`, and `pnpm test` (24/24) all pass clean.
