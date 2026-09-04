# 14: Admin authentication & authorization

Status: ready-for-agent
Blocked by: 01, 02

## Spec references

- PRD Section 6 Step 1; Section 12.3; Section 8 FR7
- Spec User Stories 18, 19, 28; Implementation Decisions — "Admin accounts", "Admin authorization"

## Scope

- Admin sign-in via email + password using Supabase Auth. No self-serve signup — accounts are created by manual row insert in the Supabase dashboard (document the exact steps, e.g. in a short ops note, but build no UI for it).
- Admin-status check (e.g. an `is_admin` flag in `app_metadata`, or membership in an admins table if ticket 02 went that route) re-verified on **every** request to any admin route — not cached from login, not trusted from a client-side flag.
- Non-admin or unauthenticated requests to admin routes are rejected server-side (redirect to login for pages, 401/403 for API routes) regardless of what the client believes.

## Acceptance Criteria

- [x] A seeded admin account can log in and reach the dashboard shell (ticket 16 builds its content).
- [x] A non-admin authenticated user is rejected from every admin route.
- [x] Revoking admin status (flipping the flag) takes effect on the *next* request without requiring the user to log out — proves the check isn't cached at login.

## Out of scope for this ticket

- Dashboard content (tickets 15, 16).
- Any self-serve invite flow (explicit non-goal).

## Testing

- Integration test: seeded admin vs. seeded non-admin hitting an admin-only route; a test that flips the admin flag mid-session and confirms the very next request re-evaluates it.

## Comments

- **`app_metadata.role = 'admin'`**, per ticket 02's own header comment (no separate `admins` table) — `src/lib/auth/admin.ts`'s `getAdminUser(supabase)` is the single check every admin route calls, always via `supabase.auth.getUser()`, never `getSession()`. `getUser()` round-trips to the Supabase Auth server and returns the user's *current* row rather than decoding the JWT locally, which is what makes "takes effect on the next request without logging out" actually true — confirmed live (see below), not just assumed.
- **Real gotcha caught while writing the test harness**: the Admin API's `updateUserById(id, { app_metadata })` is a shallow *merge*, not a replace. The first version of `tests/support/setTestUserAdmin(id, false)` passed `app_metadata: {}` to "clear" the role, which silently left the old `role: 'admin'` in place (merge of `{}` into existing data is a no-op) and the revoke-related test failed — looked like `getAdminUser` was wrongly caching, but the bug was in the test seeding, not the auth check. Fixed by always passing an explicit overwrite value (`role: 'none'`), never `{}`. Worth remembering for ticket 15/16 if either ever needs to clear rather than set an `app_metadata` field via the Admin API.
- **No `proxy.js`/middleware** — deliberately. Next.js 16 renamed/deprecated `middleware.js` to `proxy.js` and its own docs warn a matcher change or a route move can silently drop proxy coverage, recommending auth be verified inside the request itself rather than relying on proxy alone (`node_modules/next/dist/docs/.../proxy.md`, "Execution order" section). The `(protected)` route group's `layout.tsx` *is* that per-request verification — it re-runs on every request to every route under it, no caching, so proxy would only ever be a defense-in-depth nicety, not load-bearing. One consequence: Supabase's access-token refresh (when it happens inside a Server Component render) can't persist its new cookies back to the browser, since Server Components can't write cookies (see the try/catch note in `src/lib/supabase/server.ts`'s `createClient()`) — Server Actions (login, logout) can and do persist cookies fine, so this only means a mid-session token refresh during a plain page load might repeat next request rather than sticking; not a security gap, just a possible future UX nit if it ever becomes noticeable.
- **Login flow structure**: `src/lib/auth/admin.ts` exports both `getAdminUser` (the per-request check) and `signInAdmin` (sign in → re-check role → sign back out if not admin) — the latter is pure business logic taking an already-built `SupabaseClient`, split out from the `"use server"` wrapper (`src/app/admin/login/actions.ts`) specifically so it's unit-testable: `next/headers`' `cookies()` throws ("called outside a request scope") when invoked from a plain vitest test with no real Next.js request, confirmed by trying it directly before writing this split. Mirrors the existing `src/lib/reports/submit-report.ts` / `src/app/actions/submit-report.ts` split.
- **Route structure**: `src/app/admin/login/` (public) is a sibling of `src/app/admin/(protected)/` (the guarded group holding the dashboard) — a route group rather than nesting login under the guard, so the guard's own redirect-to-login can't loop against itself.
- **Server actions return a result; the client navigates** (`router.push` + `router.refresh()`), same pattern as ticket 08's `ContactDetailsStep` — avoids calling `redirect()` from inside a Server Action that's awaited inside a client `try/catch`, where its thrown redirect signal doesn't reliably survive being caught.
- **Ops note**: `docs/admin-ops.md` — manual admin creation is two steps (create the `auth.users` row via Dashboard → Users, then set `app_metadata.role = 'admin'` via a SQL Editor `update`, the same tool ticket 02's migrations went through), no UI, per PRD 12.3/explicit non-goal.
- **Verified fully live** (2026-09-04), not just via the automated suite: a real dev server, two real seeded Supabase Auth accounts (one admin, one not), driven through a transient headless-browser pass (Playwright, installed then removed afterward, same as tickets 05/13) covering all seven scenarios — unauthenticated `/admin` → redirected to login; non-admin login → rejected with the "not authorized" message and no session left; admin login → reaches the dashboard shell; **revoking admin mid-session and reloading the same already-authenticated browser session (no logout) → redirected to login**; re-granting and reloading again → back on the dashboard, still no re-login; log out → back to login; `/admin` after logout → redirected to login. Test accounts deleted afterward via the service-role Admin API.
- `tsc`, `eslint`, and `pnpm test` (51/51) all pass clean.
