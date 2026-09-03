# Spec: Offroading v1

Status: ready-for-agent

**Source:** Synthesized from `offroading-prd.md` (incl. Section 12, Design Review 2026-09-01)

---

## Problem Statement

Citizens who notice a pothole have no simple way to log it publicly or route a complaint to the right local authority. Existing channels (phone calls, generic email addresses, physical complaint offices) are slow, untracked, and easy to give up on — which makes it hard for citizens to hold authorities accountable and hard for authorities to see where problems are concentrated.

## Solution

A no-login, mobile-first web app (installable as a PWA) that lets a citizen photograph a pothole, automatically captures their GPS location, resolves and lets them confirm the locality and district, and then either logs the report publicly or routes a formal complaint email to the authority responsible for that district. When no authority email is on file yet, the citizen isn't stuck — they can supply an email themselves, cancel just the email step, or queue the complaint to send automatically once an admin uploads a covering mapping. A small set of trusted admins maintain the district → authority-email mapping via CSV upload and can see every report's delivery outcome; the public feed shows reports to anyone without exposing reporter contact details or delivery diagnostics.

## User Stories

1. As a citizen reporter, I want the app to open directly into the photo-capture screen, so that I can start reporting immediately without navigating through a menu first.
1a. As a citizen reporter, I want a close ("×") button on that opening photo-capture screen, so that I can back out to the public feed if I decide not to report.
2. As a citizen reporter, I want to take a new photo or upload an existing one of the pothole, so that I can document it however is easiest for me.
3. As a citizen reporter, I want the app to automatically request my GPS location, so that I don't have to type an address.
4. As a citizen reporter, I want to be shown a short list of 2–4 candidate locality names near my location, so that I can quickly confirm exactly where the pothole is.
5. As a citizen reporter, I want to type my own locality name and pick its district from a list if none of the suggested candidates are correct, so that I'm never blocked by bad suggestions.
6. As a citizen reporter whose browser denies or lacks GPS access, I want to search for my locality manually, so that I can still report without location permissions.
7. As a citizen reporter, I want to indicate whether I'm a passer-by or a resident of the area, so that the public feed reflects my relationship to the report.
8. As a citizen reporter, I want to choose between just logging the report publicly or also emailing the authority, so that I control how far my report goes.
9. As a citizen reporter who chooses to email the authority, I want to provide my name, mobile number, and email address, so that the authority (and admin) can identify the complaint's source.
10. As a citizen reporter, I want my complaint emailed immediately if the app already has an authority email on file for my district, so that my report reaches the right people without delay.
11. As a citizen reporter whose district has no authority email on file, I want to be told so and given the choice to supply the email myself, cancel just the email (while keeping the report logged), or queue it to send automatically later, so that my report is never lost regardless of the mapping's completeness.
12. As a citizen reporter who queues my complaint, I want a short confirmation email once it's actually sent (triggered by a later admin mapping upload), so that I know my wait resulted in something.
13. As a citizen reporter, I want my report saved no matter which path I take through the email choices, so that nothing I submit is ever silently discarded.
14. As a citizen reporter, I want my in-progress report (photo, location, selections) preserved locally if my connection drops mid-flow, so that a bad signal on the street doesn't cost me my work.
15. As a citizen reporter, I want to land on the public feed after submitting, so that I can see my report take its place among others.
16. As any visitor, I want to browse a public feed of all reports showing photo, locality, district, reporter type, and submission time, so that I can see where problems are concentrated without needing an account.
17. As any visitor, I want reporter contact details and email delivery diagnostics to never appear on the public feed, so that reporters' personal information stays private.
17a. As a citizen reporter, I want to share my just-submitted report to Twitter/X with one tap, so that I can spread visibility with minimal effort.
17b. As a citizen reporter, I want a generic "Share..." option using my device's native share sheet, so that I can post to whichever app I actually use (WhatsApp, Facebook, etc.) without the app needing a button for each one.
17c. As any visitor, I want a shared report link to open a page showing that specific report with its photo, so that the context isn't lost when someone shares it outside the feed.
17d. As any visitor, I want a share button right on each report card in the public feed, so that I can share any report without having to open it first.
18. As an admin, I want to sign in with email and password, so that I can reach the dashboard.
19. As an admin, I want every request to the dashboard re-checked for admin status (not just at login), so that access can't be retained after it's revoked.
20. As an admin, I want to upload a CSV mapping districts to authority emails, so that I can control where complaint emails go without a developer.
21. As an admin, I want a new CSV upload to fully replace the current mapping rather than merge with it, so that the mapping always reflects exactly the file I uploaded.
22. As an admin, I want an uploaded CSV containing any malformed email or unrecognized district name to be rejected in full with a clear explanation, so that the mapping never ends up in a partially broken state.
23. As an admin, I want uploading a mapping that newly covers a district with queued reports to automatically trigger those queued emails, so that I don't have to take any extra action.
24. As an admin, I want to view the current mapping as a read-only table, so that I can confirm what's in effect.
25. As an admin, I want to view all submitted reports, including reporter contact details and delivery status (sent / failed / queued / not applicable, with error detail), so that I can monitor outcomes.
26. As an admin, I want a failed email to be retried automatically a few times with backoff, so that transient delivery issues resolve themselves without my intervention.
27. As an admin, I want a permanently failed send to remain visible as "failed" with no retry button, so that I know to fix it via a corrected CSV mapping rather than expecting a dashboard action.
28. As the app operator, I want admin accounts created via manual database insert with no self-serve signup, so that only trusted individuals ever reach the dashboard.
29. As the app operator, I want the app installable to a phone home screen with a shell that loads even on a flaky connection, so that citizens can access it like a native app.
30. As the app operator, I want basic IP/device rate-limiting on submissions, so that the loginless public flow can't be trivially flooded.
31. As the app operator, I want a canonical, hand-maintained district list used consistently for CSV validation and manual locality entry, so that district matching stays reliable without depending on an external service's uptime.

## Implementation Decisions

- **Stack**: Next.js (deployed on Vercel) for the frontend and server-side request handling; Supabase for Postgres, Auth, and Storage.
- **Geographic scope**: India only for v1.
- **Location model**: locality (fine-grained) always nested within a district. The district → authority-email mapping is the single source of truth for routing (one email per district, no multiple recipients or CC chains for v1).
- **Reverse geocoding**: LocationIQ, paired with a secondary nearby-places query to build the 2–4 candidate locality list.
- **Manual locality entry**: a free-typed locality is paired with an explicit district selection from the canonical district table — the app never infers district from free text.
- **Canonical district table**: static and hand-maintained, used both for CSV validation and the manual-entry district dropdown. Must never become a hard runtime dependency — any future external sync is additive only, falling back to the last-known static list.
- **Admin accounts**: created via manual database insert; no self-serve invite flow.
- **Admin authorization**: checked on every request to the dashboard, not cached from login.
- **CSV upload**: validates email format and district name (against the canonical table) per row; any invalid row rejects the whole upload with a clear explanation; a valid upload fully replaces the existing mapping (no merge) and triggers any newly-coverable queued emails to send.
- **Email delivery**: Resend, launching on its shared sandbox sending domain for v1 (a dedicated verified domain is deferred); delivery status per report is one of not applicable / sent / failed / queued, visible to admins only.
- **Failed-send recovery**: automatic retry with backoff (a few attempts); a permanently failed send stays "failed" with no manual retry action in the dashboard — recovery is via a corrected CSV upload.
- **Queued reports**: when a later CSV upload adds coverage for a queued report's district, the email sends automatically and the original reporter (whose address was captured at submission) receives a short confirmation email.
- **Photo storage**: public Supabase Storage bucket, directly linkable — consistent with the feed's public-by-design purpose.
- **Public feed**: shows locality and district together, plus reporter type and submission time; never reporter contact info or delivery diagnostics.
- **Rate limiting**: basic IP/device throttling on submissions, distinct from any content moderation (which is out of scope).
- **Client resilience**: in-progress report state (photo, GPS point, step selections) persisted to IndexedDB as the citizen progresses through the flow, cleared on successful submit.
- **Hero flow**: the app's entry screen is the photo-capture step itself — no landing menu precedes it. A close ("×") control on that screen exits (no confirmation needed, nothing captured yet) to the public feed, the same destination as a completed submission.
- **Visual design**: near-monochrome palette (photography supplies the color), fully rounded corners, photo-led cards with translucent circular icon buttons overlaid (close, share), pill filter chips, and a floating pill bottom nav — adapted from a reference mockup with all login/personalization-dependent patterns (avatar, favorites, ratings, pricing, booking CTAs) excluded as inapplicable to this no-login app.
- **PWA**: installable shell loads even on a flaky connection; actual data submission still requires connectivity.
- **Social sharing**: each report gets a public permalink page (`/reports/[id]`) with Open Graph/Twitter Card metadata (image = report photo). Share UI offers Twitter's web intent URL first, then a Web Share API ("Share...") catch-all with copy-link fallback where unsupported. No reporter contact details are ever included in shared content or metadata (extends the FR8 privacy boundary). The same share UI appears both on the post-submit confirmation and on every report card in the public feed — sharing a report never requires opening its permalink page first.

## Testing Decisions

- **Primary seam**: exercise the app through its server-side request boundary — the route handlers / server actions backing report submission, CSV upload, and feed retrieval — against a real Postgres/Supabase instance, rather than mocking the database layer. This verifies actual state transitions (a report is saved with the right delivery status, a mapping is fully replaced, a queued report transitions to "sent") instead of implementation details.
- **One new seam required**: a network-level fake for the two third-party APIs this feature depends on — LocationIQ (reverse geocoding) and Resend (email) — since both are paid, rate-limited, external services outside our control. Tests substitute canned responses at the HTTP boundary rather than mocking our own wrapper code around them, keeping the fake as close as possible to the real integration point.
- **What makes a good test here**: assert externally observable outcomes only (report exists with correct delivery status; mapping table reflects the uploaded CSV; a queued report becomes "sent" after a covering upload) — never the internal call sequence used to get there.
- **Prior art**: none — this is a greenfield codebase. This seam choice should be treated as the project's first architectural precedent, since every later feature will follow the same pattern.

## Out of Scope

- Citizen accounts, login, or profile system.
- In-app tracking of complaint resolution status after an email is sent (the app records that an email was sent, not what happened after).
- Admin moderation or deletion of individual reports.
- Native mobile apps (PWA only).
- Automatic duplicate-report detection.
- Enforcement of photo size/type limits beyond sane defaults.
- A manual "retry send" action in the admin dashboard.
- Any dynamic or external sync of the canonical district list (static-only for v1).
- Multiple recipients or CC chains per district.
- Self-service admin invites.
- Share-count analytics/tracking.
- Auto-posting to an official/organizational social account.

## Further Notes

- Carried assumption from the PRD: admin activity is low enough that concurrent conflicting CSV uploads can rely on last-write-wins.
- Photo storage/bandwidth limits are not a v1 concern at expected initial scale; revisit if usage grows significantly.
