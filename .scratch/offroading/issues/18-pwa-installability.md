# 18: PWA installability & offline shell

Status: ready-for-agent
Blocked by: 01, 11

## Spec references

- PRD Section 8 FR9
- Spec User Story 29; Implementation Decisions — "PWA"

## Scope

- Web app manifest + service worker so the app is installable to a phone home screen.
- App shell (static UI chrome, not data) loads even with a flaky/offline connection.
- Actual data operations (submitting a report, loading the feed) still require connectivity and should fail gracefully offline, not silently — this is distinct from ticket 10's IndexedDB draft persistence, which covers in-progress *form* data, not full offline data sync.

## Acceptance Criteria

- [ ] App is installable on a mobile browser (manifest + icons present, passes basic installability checks).
- [ ] With network disabled, the app shell still loads (cached via service worker) rather than showing a browser offline error page.
- [ ] Attempting to submit or load data while offline surfaces a clear "you're offline" message rather than hanging or erroring opaquely.

## Out of scope for this ticket

- Full offline data sync/queueing of submissions — v1 scope is shell resilience only, per FR9.

## Testing

- Manual/Lighthouse PWA installability check; a browser test simulating offline mode confirms the shell still renders and data actions show the offline message.
