# Testing pattern

This is the project's first test infrastructure (ticket 03) and is meant to be copied by every later ticket (05–09, 12–15), per the spec's Testing Decisions. Three pieces:

## 1. Real-DB harness (`tests/support/db.ts`)

Tests exercise the actual `reports`/`state_mapping` tables via a service-role Supabase client — never a mocked database layer. `testDbClient()` gets you the client; call `trackRow(table, id)` right after any insert your test owns, and the global `afterEach` (in `tests/setup.ts`) deletes it automatically. Don't leave rows untracked — this harness runs against the same Supabase project as local dev (see "Why no separate test project" below), so untracked rows leak into it.

Once route handlers/server actions exist (from ticket 05 onward), prefer calling *those* in tests rather than hitting the DB client directly — the spec's primary seam is "the route handlers / server actions backing report submission, CSV upload, and feed retrieval," not the database itself. The two sample tests here predate any route handlers, so they exercise the DB directly as a stand-in.

## 2. Network-level fakes for Google Maps and Resend (`tests/support/fakes/`)

Built with [MSW](https://mswjs.io) (`msw/node`), which intercepts real outgoing HTTP requests at the network boundary — so it fakes Google Maps Platform's and Resend's actual APIs, not whatever wrapper functions `src/lib/google-maps/client.ts`/ticket 09 write around them. `tests/support/msw-server.ts` wires up the shared server; `tests/setup.ts` starts/stops it and resets handlers between tests with `onUnhandledRequest: "bypass"` (so real calls, like the DB harness's Supabase requests, pass through untouched — only Google Maps/Resend URLs get intercepted).

- Google Maps' reverse-geocode handler is registered globally by default (`googleMapsHandlers` in `msw-server.ts`), since most citizen-flow tests will hit it incidentally.
- Resend's handlers are *not* global — call `mswServer.use(resendSendSuccessHandler)` or `mswServer.use(resendSendFailureHandler)` inside the specific test that needs one, since a suite often needs to exercise both outcomes.

To add a fake for a new third-party call: add a handler file under `fakes/`, matching the real provider's actual endpoint URL and response shape as closely as you can (see the existing two for the pattern), and either register it globally in `msw-server.ts` or use it per-test.

## 3. Sample tests

- `db.sample.test.ts` — real DB insert + read-back.
- `resend.sample.test.ts` — fake Resend send, success and failure.
- Google Maps' fakes (`tests/support/fakes/google-maps.ts`) don't have a separate sample test — `tests/locality-resolution.test.ts` exercises them directly through the real `resolve-candidates.ts` business logic, which covers the same "fake intercepts at the network boundary" acceptance criterion.

Run with `pnpm test`. All three assert externally observable outcomes only (a row's fields, a response body/status) — never the internal call sequence used to get there, per the spec.

## Why no separate test project

The spec allows "Supabase local or a disposable test project/schema." Supabase local (`supabase start`) needs Docker, which isn't available in this environment; a genuinely separate/disposable Supabase project needs manual provisioning only the project owner can do. For now, tests run against the same live Supabase project as dev, isolated by the tracked-row cleanup discipline above. If that ever becomes a real problem (test flakiness from shared state, or real report data existing to accidentally collide with), the fix is either standing up Docker for local Supabase, or provisioning a second Supabase project and pointing `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` at it for the test run specifically.
