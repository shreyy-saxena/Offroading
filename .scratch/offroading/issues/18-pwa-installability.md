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

- [x] App is installable on a mobile browser (manifest + icons present, passes basic installability checks).
- [x] With network disabled, the app shell still loads (cached via service worker) rather than showing a browser offline error page.
- [x] Attempting to submit or load data while offline surfaces a clear "you're offline" message rather than hanging or erroring opaquely.

## Out of scope for this ticket

- Full offline data sync/queueing of submissions — v1 scope is shell resilience only, per FR9.

## Testing

- Manual/Lighthouse PWA installability check; a browser test simulating offline mode confirms the shell still renders and data actions show the offline message.

## Comments

- **Manifest**: `src/app/manifest.ts` (Next's generated-manifest file convention — confirmed live, not assumed, that it auto-injects `<link rel="manifest" href="/manifest.webmanifest">` into `<head>` with no manual `metadata.manifest` needed; adding one too would have risked a duplicate/conflicting tag). Colors pulled from the existing design tokens (`--color-canvas`/`--color-ink`), `display: "standalone"`.
- **Icons**: `public/icons/icon-{192,512}.png`, generated once via `next/og`'s `ImageResponse` run as a plain Node script (not a live route — simpler and more standard for fixed-size manifest icons than generating them per-request) — a simple on-brand rounded-square "O" mark, since no existing app icon/logo asset exists yet. Real PNG bytes, not placeholders; viewed directly to confirm they render correctly before committing.
- **Deliberately minimal service worker** (`public/sw.js`): precaches and serves exactly one static `offline.html` fallback for failed *navigations* only (`event.request.mode === "navigate"`) — never intercepts data fetches or Server Action POSTs, which must keep failing normally so the app's own client-side offline handling (see below) can respond to them instead. Full precaching of the actual dynamic app shell was considered and rejected: Next's static asset filenames are content-hashed and change every build, which would make that fragile and is explicitly beyond "basic shell resilience" (full offline data sync is a stated non-goal). `offline.html` is a plain static file outside Next's app router (inline CSS, no dependency on the build pipeline) so it works even when nothing else can be reached.
- **Two distinct offline mechanisms, on purpose, matching the ticket's own distinction between shell resilience and data actions**: the service worker (above) only ever fires for full-page navigations; `src/lib/offline.ts`'s `isOffline()` (wrapping `navigator.onLine`) is what the three report-submission client components (`LogOrEmailStep`, `ContactDetailsStep`, `MissingMappingStep`) check — once before attempting a submission (fast, no doomed network call) and again in the catch block (in case connectivity dropped mid-request) — surfacing `OFFLINE_MESSAGE` instead of the generic fallback error text.
- **Live-verified all three acceptance criteria in a real browser** (transient Playwright, installed/removed after): (1) service worker registers and reaches `active` state, manifest link present, both icon files serve 200 with real image bytes; (2) going offline then navigating to `/feed` served the cached `offline.html` shell (`response.ok()` true, body contains "You're offline") instead of a browser error page; (3) going offline mid-flow and clicking "Just log it" showed the exact `OFFLINE_MESSAGE`, stayed on the current page, and — confirmed via a direct DB read, not just the UI — created no report row at all, matching "surfaces a clear message rather than hanging or erroring opaquely," never a silent partial submission.
- Lighthouse itself wasn't run (no new dependency added for a one-off audit); the ticket's own Testing note allows "Manual/Lighthouse" as alternatives, and the manual checks above cover the same underlying installability requirements (valid manifest with name/short_name/start_url/standalone display/192px+512px icons, a registered service worker with a navigation fetch handler, served from a browser-trusted origin).
- `tsc`, `eslint`, and `pnpm test` (77/77) all pass clean.
