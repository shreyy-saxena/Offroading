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

- [x] Cold-opening the app lands directly on the photo-capture screen — no intermediate menu screen exists.
- [x] A close ("×") button is visible in the top-right corner of this screen at all times.
- [x] Tapping close navigates straight to the public feed with no confirmation prompt.
- [x] User can take or upload a photo; it uploads to the bucket from ticket 04.
- [x] Browser GPS permission is requested right after the photo step; a granted position (lat/lng) is captured and held in flow state for ticket 06.
- [x] GPS denial/unavailability doesn't dead-end the flow — hands off cleanly to the manual-locality-search path (ticket 06 implements the actual search).

## Out of scope for this ticket

- Reverse geocoding / candidate locality list (ticket 06).
- IndexedDB persistence (ticket 10).
- Close/back affordances on later steps of the flow (only the hero entry screen's close button is in scope here).

## Testing

- Component/UI test for the photo+GPS steps with a mocked `navigator.geolocation` (granted and denied cases).
- Test that tapping close from the hero screen navigates to the feed route with no capture in progress.

## Comments

- **Blocked-by 19 resolved first** (2026-09-03): ticket 19 (design system foundations) hadn't been built yet even though it's only blocked by 01; built that first so this ticket's screens draw from real tokens/components instead of ad hoc styling.
- **Wizard shell**: `src/components/report-flow/{ReportFlow,PhotoStep,LocationStep,NextStepPlaceholder,types}.tsx`. `ReportFlow` holds a single `FlowState` union (`"photo" | "location" | "next"`) in `useState` — in-memory only, per scope (IndexedDB is ticket 10). `NextStepPlaceholder` is a stand-in for ticket 06, carrying the captured photo + location forward so that ticket doesn't have to rebuild the hand-off.
- **Photo upload wiring**: `src/app/actions/report-photo.ts` is a Server Action wrapping ticket 04's `uploadReportPhoto` — the storage helper uses the service-role client, so it can only run server-side; the action is the client-callable boundary. Upload happens as soon as a photo is picked (not deferred to final submission in ticket 08), per the ticket's acceptance criteria.
- **Feed stub**: `src/app/feed/page.tsx` — placeholder route per the ticket's explicit allowance ("route to a stub... rather than blocking this ticket on 11's full completion"). Ticket 11 replaces its content; the route itself is real and shouldn't need to move.
- **Two react-hooks lint rules caught real bugs during implementation**, not style nits: `react-hooks/refs` (mutating a ref during render, not inside an effect) and `react-hooks/set-state-in-effect` (calling `setState` synchronously in an effect body rather than in a callback or via lazy initial state) — both in `LocationStep`. Fixed by lazy-initializing the geolocation-supported check via `useState(() => ...)` and syncing the "latest callback" ref inside its own effect. Worth knowing these rules exist and are enforced here before writing more effect-heavy components in tickets 06-10.
- **Test infra additions**: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` as dev dependencies — first UI ticket, so first need for a DOM environment. Component tests opt in per-file via `// @vitest-environment jsdom` (rest of the suite stays on the faster `node` environment) and import `tests/support/react-testing.ts` for RTL's `cleanup()` + jest-dom matchers — deliberately *not* added to the global `setupFiles`, since `cleanup()` touches `document`, which doesn't exist in the `node`-environment tests. `tests/report-flow.test.tsx` covers close-navigation, GPS-granted, and GPS-denied — the Server Action is mocked at the module boundary (ticket 04's test already covers the real storage integration; this suite is about flow orchestration).
- **Verified live in a real browser** (Playwright, transient install, not a project dependency): screenshotted the hero screen, confirmed close navigates to `/feed`, and drove the *real* flow end-to-end — actual file picked via a hidden input, actually uploaded to the live Supabase Storage bucket, real (simulated) GPS grant, landing on the placeholder with correct coordinates. Zero console errors both passes. Cleaned up the resulting test photo from the live bucket afterward.
- `tsc`, `eslint`, and `pnpm test` (10/10) all pass clean.
