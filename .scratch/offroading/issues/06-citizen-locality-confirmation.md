# 06: Citizen flow — locality confirmation

Status: ready-for-agent
Blocked by: 05

## Spec references

- PRD Section 5 Step 4; Section 12.2 (Location Resolution)
- Spec User Stories 4, 5, 6, 31; Implementation Decisions — "Reverse geocoding", "Manual locality entry", "Canonical district table"

## Scope

- On a captured GPS point, call **LocationIQ** reverse geocoding plus a secondary nearby-places query (e.g. Overpass) to build 2–4 candidate locality names.
- Show the candidates; user picks one, or types a custom locality name.
- If the user types a custom locality, they also pick its **district** from a dropdown backed by the static canonical district list (ticket 01) — the app never infers district from free text.
- If GPS was denied/unavailable (from ticket 05), fall back to manual locality search via LocationIQ autocomplete instead of blocking the citizen.
- Use the network fake from ticket 03 in tests — never call the real LocationIQ API in CI.

## Acceptance Criteria

- [x] A GPS point resolves to 2–4 candidate localities shown to the user.
- [x] Selecting a candidate carries both locality and its district forward in flow state.
- [x] Typing a custom locality requires an explicit district selection from the static list before continuing.
- [x] GPS-denied path reaches a working manual search with no dead end.
- [x] LocationIQ is unreachable/erroring → user still isn't blocked (falls back to manual entry with a clear message).

## Out of scope for this ticket

- Reporter type / log-or-email branch (ticket 07).

## Testing

- Using ticket 03's LocationIQ fake: candidate list happy path, zero/low-confidence candidates, and API-error fallback.

## Comments

- **"Secondary nearby-places query" implemented via LocationIQ's own Nearby API, not Overpass.** The ticket offered Overpass only as an example ("e.g. Overpass"), and the spec's Testing Decisions already scope this feature to exactly two third-party dependencies (LocationIQ, Resend) with their own fakes — adding a third real service (with its own quota/rate-limit/fake to maintain) for a need LocationIQ's Nearby endpoint already covers seemed like unwarranted scope growth. `src/lib/locationiq/client.ts` exposes `reverseGeocode`, `nearbyPlaces`, `autocompleteLocality` — all server-only (`LOCATIONIQ_API_KEY` has no `NEXT_PUBLIC_` prefix, ticket 01's env scaffold already decided that).
- **District matching is strict, not fuzzy**: `src/lib/locality/resolve-candidates.ts` only turns a LocationIQ place into a candidate if its reported `state_district` case-insensitively matches an entry in the canonical list (`findCanonicalDistrict`, added to `src/lib/data/districts.ts`) — an unmatched place is silently dropped rather than guessed, per PRD 12.2's "app never infers district from free text" extended to the automated path too. Verified live with zero LocationIQ credentials configured: both calls reject, the UI shows the graceful fallback message, and manual entry still completes the flow end-to-end — real proof of the "never blocked" requirement, not just a unit test.
- **Resilience**: reverse-geocode and nearby run via `Promise.allSettled`, not `.all` — one failing doesn't discard the other's results. `ok:false` (the "clear message" case) only fires when *both* fail; a legitimate zero-candidate result is `ok:true` with an empty array, and the UI distinguishes the two.
- **One manual-entry UI serves both scope bullets** ("types a custom locality" and "GPS-denied → manual search via autocomplete"): a single search input with LocationIQ-autocomplete suggestions (debounced 300ms) plus a required district dropdown, always present regardless of whether candidates are shown above it. Picking a suggestion pre-fills district (same trust level as a GPS candidate); free-typing without picking one leaves the dropdown as the only way to set district, satisfying "never infer from free text" either way.
- **Flow-state changes**: `FlowState`'s `"next"` step now carries `localityInfo: ConfirmedLocality` instead of raw `location` — `LocalityCandidate` (in `resolve-candidates.ts`) and `ConfirmedLocality` (in `report-flow/types.ts`) are the same shape by design (a confirmed locality is either a picked candidate or a manually-entered one). `NextStepPlaceholder` now stands in for ticket 07 instead of ticket 06.
- **Test infra note**: `.env.local` has `LOCATIONIQ_API_KEY=` (empty — no real account yet) — `tests/setup.ts` now fills a placeholder value when unset, since MSW intercepts by URL and never validates the key, but the client's own "not configured" guard would otherwise block every test regardless of mocking.
- `tsc`, `eslint`, and `pnpm test` (17/17) all pass clean.
