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

- [ ] A GPS point resolves to 2–4 candidate localities shown to the user.
- [ ] Selecting a candidate carries both locality and its district forward in flow state.
- [ ] Typing a custom locality requires an explicit district selection from the static list before continuing.
- [ ] GPS-denied path reaches a working manual search with no dead end.
- [ ] LocationIQ is unreachable/erroring → user still isn't blocked (falls back to manual entry with a clear message).

## Out of scope for this ticket

- Reporter type / log-or-email branch (ticket 07).

## Testing

- Using ticket 03's LocationIQ fake: candidate list happy path, zero/low-confidence candidates, and API-error fallback.
