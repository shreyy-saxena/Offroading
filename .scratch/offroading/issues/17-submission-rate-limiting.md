# 17: Submission rate limiting

Status: ready-for-agent
Blocked by: 08

## Spec references

- PRD Section 12.5 (Abuse throttling); Section 8 FR (general robustness), Section 3 non-goals (no content moderation, distinct from this)
- Spec User Story 30

## Scope

- Basic IP/device rate-limiting on the report-submission endpoint (ticket 08) to prevent trivial flooding of the loginless public flow.
- This is throttling only, not content moderation — no spam/quality judgment on report content, just a request-rate ceiling.
- Choose a lightweight mechanism appropriate to the Vercel/Supabase stack (e.g. a sliding-window counter in Postgres or an edge-compatible store) — avoid introducing a new infra dependency if the existing stack already covers it.

## Acceptance Criteria

- [ ] Submissions beyond a defined threshold from the same IP/device within a window are rejected with a clear, non-technical message (not silently dropped, not a raw 500).
- [ ] Legitimate low-volume usage (a citizen submitting one report) is never affected.
- [ ] The limit is configurable (env var or constant) without a code change to adjust the threshold later.

## Out of scope for this ticket

- Any content-based spam detection — explicit non-goal.

## Testing

- Integration test: N+1 rapid submissions from the same simulated IP/device trip the limit; a normal single submission does not.
