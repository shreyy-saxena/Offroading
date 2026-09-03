# 10: Client offline resilience (IndexedDB)

Status: ready-for-agent
Blocked by: 05, 06, 07, 08

## Spec references

- PRD Section 12.6 (Client Resilience); Section 8 FR9
- Spec User Story 14

## Scope

- Persist in-progress report data (photo, GPS point, locality/district selection, reporter type, log/email choice, contact details as entered) to IndexedDB as the citizen moves through the flow built in tickets 05–08.
- Restore from IndexedDB if the app reloads mid-flow (e.g. after a dropped connection).
- Clear the persisted state on successful submit.

## Acceptance Criteria

- [x] Reloading the app mid-flow restores the citizen to where they left off, with prior selections intact.
- [x] A successful submission clears the persisted draft — a fresh flow afterward starts empty.
- [x] An abandoned draft doesn't block starting a new report from the landing screen.

## Out of scope for this ticket

- Server-side draft persistence — this is client-only, local-device resilience.

## Testing

- Simulate a mid-flow reload in a browser/component test and assert restored state; assert clearing after a successful submit (using ticket 08's submission path).

## Comments

- **Genuinely unblocked as numbered this time** — all four blockers (05, 06, 07, 08) were done, no gap between ticket order and dependency order like the last two tickets had.
- **Resume is offered, never forced**: restoring straight into a later step with no escape would violate "doesn't block starting a new report" — the close button only exists on the hero screen (ticket 05's own scope), so a silent auto-restore past it would trap the citizen in the old draft. Instead, `PhotoStep` shows an optional "Continue your last report" link alongside its normal, fully-functional capture buttons; not clicking it and just taking/uploading a new photo naturally supersedes the stale draft (single fixed IndexedDB key, next write overwrites it) with no separate "discard" affordance needed.
- **`FlowState` doubles as the persisted shape** (`src/components/report-flow/draft-store.ts`, `PersistableFlowState = Exclude<FlowState, {step:"photo"}>`) rather than a parallel shadow structure — one conversion boundary (at the IndexedDB read/write) instead of two parallel type hierarchies to keep in sync. "Contact details as entered" (scope bullet) is handled the same way: `FlowState`'s `"contact"` variant gained an optional `draftContact` field that `ContactDetailsStep` updates via a debounced (300ms) callback, so typed-but-not-submitted fields flow through the exact same persist mechanism as step transitions.
- **Two real bugs found via testing, not just environment quirks**:
  1. `getDb()` opened a fresh, never-closed IndexedDB connection on every single save/load/clear call — with several calls firing in quick succession as the flow advances, this reliably hung a live submission on `clearDraft()`. Fixed by memoizing a single shared connection.
  2. `loadDraft()` originally passed the stored `File` straight to `URL.createObjectURL`. Real browsers preserve File identity through IndexedDB's structured clone; found via testing that this can't be assumed blindly, so `loadDraft` now rebuilds a fresh `File` from raw bytes (`arrayBuffer()`) rather than trusting the round-tripped object's prototype — more robust regardless of environment.
- **Test-environment-only gotcha, not a code bug**: jsdom's `File` implementation doesn't survive `fake-indexeddb`'s structured clone at all (comes back as an empty, null-prototype object — no bytes, no methods). Node's native `File` (`node:buffer`) round-trips correctly. Fixed by adding `tests/support/sample-file.ts` (built on the native `File`) and switching every test fixture that touches the draft store to it, rather than jsdom's global `File`.
- Verified live with a real page reload (not just a component-test unmount/remount simulation): actual browser reload mid-flow, resume offer appears with normal buttons still present, resuming lands back exactly where left off, and a real successful submission clears the draft (confirmed by reloading fresh afterward and seeing no resume offer). Zero console errors.
- `tsc`, `eslint`, and `pnpm test` (33/33) all pass clean.
