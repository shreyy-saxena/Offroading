# 05: Citizen flow — photo capture & GPS location

Status: ready-for-agent
Blocked by: 02, 04, 19

## Spec references

- PRD Section 5, Steps 1–3; Section 8 FR11; Section 14
- Spec User Stories 1, 1a, 2, 3

## Scope

- **Hero flow**: the app opens directly into the photo-capture screen — no landing menu, no "Report a pothole" button to tap first. Opening the app *is* starting a report.
- A close ("×") control, styled per Section 14.3 (translucent circular icon button over the photo/camera view), sits in the top-right corner of this screen. Tapping it exits immediately with **no confirmation dialog** (nothing has been captured yet) and navigates to the public feed (ticket 11) — the same destination a completed submission reaches (ticket 08).
  - If ticket 11 isn't built yet at implementation time, route to a stub/placeholder page rather than blocking this ticket on 11's full completion.
- Photo step: take a new photo or upload an existing one (mobile-first UI).
- Location step: request device GPS via browser permission prompt immediately after the photo step.
- Wire the photo upload into the storage helper from ticket 04.
- This is the first two steps of a multi-step flow that continues in tickets 06–08 — implement as a flow/wizard shell that later tickets add steps to, holding in-progress state in memory (persistence to IndexedDB is ticket 10, don't build that here).

## Acceptance Criteria

- [ ] Cold-opening the app lands directly on the photo-capture screen — no intermediate menu screen exists.
- [ ] A close ("×") button is visible in the top-right corner of this screen at all times.
- [ ] Tapping close navigates straight to the public feed with no confirmation prompt.
- [ ] User can take or upload a photo; it uploads to the bucket from ticket 04.
- [ ] Browser GPS permission is requested right after the photo step; a granted position (lat/lng) is captured and held in flow state for ticket 06.
- [ ] GPS denial/unavailability doesn't dead-end the flow — hands off cleanly to the manual-locality-search path (ticket 06 implements the actual search).

## Out of scope for this ticket

- Reverse geocoding / candidate locality list (ticket 06).
- IndexedDB persistence (ticket 10).
- Close/back affordances on later steps of the flow (only the hero entry screen's close button is in scope here).

## Testing

- Component/UI test for the photo+GPS steps with a mocked `navigator.geolocation` (granted and denied cases).
- Test that tapping close from the hero screen navigates to the feed route with no capture in progress.
