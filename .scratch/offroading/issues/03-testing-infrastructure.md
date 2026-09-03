# 03: Testing infrastructure — real-DB harness + third-party fakes

Status: ready-for-agent
Blocked by: 02

## Spec references

- Spec "Testing Decisions" section in full (primary seam, third-party fakes, prior-art note)

## Scope

This is called out in the spec as the project's **first architectural precedent** — land it before feature tickets so every later ticket's tests follow the same pattern.

- Test harness that runs route handlers / server actions against a real Postgres/Supabase instance (local Supabase or a disposable test project/schema), with setup/teardown that resets state between tests.
- A network-level fake for **LocationIQ** (reverse geocoding + autocomplete endpoints) — intercepts HTTP calls at the boundary and returns canned fixtures, not a mock of our own wrapper code.
- A network-level fake for **Resend** (email send) — same principle: fake the HTTP call, not our wrapper.
- Document the pattern (a short README in the test directory) so it's discoverable for tickets 05–09, 12–15.

## Acceptance Criteria

- [x] A sample test exists that inserts and reads back a row through the real DB harness.
- [x] A sample test exists that triggers a fake LocationIQ response and asserts on the result.
- [x] A sample test exists that triggers a fake Resend send (success and failure cases) and asserts on the result.
- [x] Tests assert externally observable outcomes only (e.g. "report exists with delivery status X"), never internal call sequences.

## Out of scope for this ticket

- The actual LocationIQ/Resend integration code (tickets 06, 09) — this ticket only builds the fakes and harness those tickets will use.

## Testing

- This ticket *is* the testing infrastructure; its own verification is that the sample tests above pass and are legible enough for future tickets to copy the pattern from.

## Comments

- **Stack**: Vitest (test runner) + MSW/`msw-node` (network-level HTTP interception for LocationIQ/Resend) + the existing `@supabase/supabase-js` service-role client for the DB seam. `pnpm test` runs the suite (`vitest run`). Everything lives under `tests/` at the repo root; `tests/README.md` documents the pattern in full for tickets 05–09, 12–15 to copy.
- **No separate/disposable Supabase project** (spec allows "local or a disposable test project/schema"): Docker isn't available in this environment (`supabase start` needs it), and provisioning a genuinely separate project needs the project owner. Tests instead run against the same live Supabase project as dev, isolated by a `trackRow()`/`cleanupTrackedRows()` discipline in `tests/support/db.ts` — every row a test inserts gets tracked and deleted in a global `afterEach`. Verified live: ran the suite, then queried `reports` directly via service-role and confirmed zero rows left behind. Documented as a real trade-off (with an upgrade path) in `tests/README.md`, not silently glossed over.
- **msw's postinstall build script** needed `pnpm approve-builds msw` once (it's msw's browser-mock-worker setup step; harmless and unnecessary for our node-only `setupServer` usage, but pnpm blocks unapproved build scripts by default).
- `tsc --noEmit`, `pnpm run lint`, and `pnpm test` all pass clean.
