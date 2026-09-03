# 01: Project scaffold & Supabase infra

Status: ready-for-agent

## Spec references

- PRD Section 12.1 (Stack & Hosting)
- Spec Implementation Decisions — "Stack", "Geographic scope"

## Scope

Bootstrap the greenfield repo:

- Next.js app (App Router), deployed target Vercel.
- Supabase project wired up: env vars for URL/anon key/service role key, client helper(s) for server and browser contexts.
- Static canonical district list (hand-maintained, India-only for v1) committed as a data file (e.g. `data/districts.ts` or `.json`) — used later by CSV validation (ticket 15) and manual locality entry (ticket 06). Per PRD 12.2, this must never become a hard runtime dependency: no external API call required to load it, and it's the only source of truth for v1 (no live sync).
- Base project conventions: linting, TypeScript config, folder structure for route handlers vs. UI.

## Acceptance Criteria

- [x] `next dev` runs a blank app locally.
- [x] Supabase client can be instantiated server-side and client-side from env vars, with no secrets committed.
- [x] Static district list is importable and typed (district name, any fields needed for matching in ticket 15).
- [x] README or equivalent documents required env vars for a fresh clone.

## Out of scope for this ticket

- Database schema (ticket 02).
- Any actual UI screens.

## Testing

- No app logic yet to test; confirm the app boots and Supabase client construction doesn't throw with valid env vars.

## Comments

- Verified 2026-09-03: `tsc`, `eslint`, and `next dev` pass clean. `.env.local` filled with the real Supabase project's values — anon key checked live via `/auth/v1/health`, service-role key via `/rest/v1/`. District seed list is intentionally partial (India, hand-maintained per PRD 12.2) — completing it is a pre-launch task, not part of this ticket's scope.
