# 16: Admin dashboard — mapping & reports views

Status: ready-for-agent
Blocked by: 14, 15, 19

## Spec references

- PRD Section 6 Step 2 (View current mapping, View reports); Section 8 FR4
- Spec User Stories 24, 25, 26, 27

## Scope

- **View current mapping**: read-only table of district → authority email currently in effect (reflects ticket 15's uploads live).
- **View reports**: table of all submitted reports including fields not on the public feed — reporter name/mobile/email, and email delivery status (sent/failed/queued/not applicable) with error detail where present.
- No manual "retry send" action anywhere in this view — explicit non-goal; a failed send is recovered only via a corrected CSV upload (ticket 15).
- No moderation/deletion controls — explicit non-goal.

## Acceptance Criteria

- [ ] Mapping table shows exactly what's currently in `district_mapping`, read-only.
- [ ] Reports table shows every report with contact fields and delivery status/error detail visible (admin-only, enforced server-side per ticket 14).
- [ ] No retry, edit, or delete control exists anywhere on this page.

## Out of scope for this ticket

- CSV upload itself (ticket 15) — this ticket only renders its result.

## Testing

- Integration test: seeded reports with varied delivery statuses render correctly in the admin view; the same data fetched without admin auth is rejected (reuses ticket 14's boundary).
