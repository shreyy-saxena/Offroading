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

- [ ] A seeded admin account can log in and reach the dashboard shell (ticket 16 builds its content).
- [ ] A non-admin authenticated user is rejected from every admin route.
- [ ] Revoking admin status (flipping the flag) takes effect on the *next* request without requiring the user to log out — proves the check isn't cached at login.

## Out of scope for this ticket

- Dashboard content (tickets 15, 16).
- Any self-serve invite flow (explicit non-goal).

## Testing

- Integration test: seeded admin vs. seeded non-admin hitting an admin-only route; a test that flips the admin flag mid-session and confirms the very next request re-evaluates it.
