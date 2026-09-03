# Product Requirements Document: Offroading

**Status:** Draft for review
**Date:** 2026-09-01
**Owner:** Shreyy Saxena

---

## 1. Problem Statement

Potholes on public roads go unreported or unreported *effectively* — a citizen who notices one has no simple way to log it publicly or route a complaint to the right local authority. Existing channels (phone calls, generic email addresses, physical complaint offices) are slow, untracked, and easy to give up on. This makes it hard for citizens to hold authorities accountable and hard for authorities to see where problems are concentrated.

## 2. Goals

- Let any citizen report a pothole in under a minute, from their phone, with no account required.
- Automatically capture *where* the pothole is, without asking the user to type an address.
- Give the citizen a choice: just log it publicly (visibility/accountability), or also route a formal complaint email to the correct district authority.
- Let a small number of trusted admins maintain which email address handles which district, without needing a developer involved.
- Keep the whole thing operable by one person (no ops team, no manual server maintenance).

## 3. Non-Goals (v1)

- No user accounts, login, or profile system for citizens.
- No in-app tracking of complaint resolution status by the authority (the app records that an email was sent, not what happened after).
- No admin moderation/deletion of individual reports (revisit if spam becomes a problem).
- No native mobile app — a mobile-friendly installable web app (PWA) only.
- No automatic detection of duplicate reports of the same pothole.

## 4. Users

| User | Access | What they do |
|---|---|---|
| **Citizen reporter** | No login | Photographs a pothole, submits a report, optionally emails the authority |
| **Admin** | Login required (invite-only, no public signup) | Uploads/maintains the district → authority-email mapping; views submitted reports and email delivery status |

## 5. Core User Flow — Citizen Report

1. **Landing / Photo (hero flow)** — the app opens directly into the photo-capture screen; there is no separate landing menu or button to tap first — opening the app *is* starting a report. A close ("×") control sits in the top-right corner of this screen; since nothing has been captured yet, tapping it exits immediately with no confirmation prompt and takes the user to the public feed (Section 7) — the same destination as a completed submission (Step 9).
2. **Photo** *(same screen as Step 1)* — user takes or uploads a photo of the pothole.
3. **Location capture** — app automatically requests the device's GPS location (browser permission prompt).
4. **Area confirmation** — because a GPS point can sit near the edge of more than one administrative area, the app doesn't just silently pick one. It shows the user a short list (2–4) of candidate area/district names for that location, and the user picks the correct one. If none of the suggestions are right, the user can type the area name themselves.
5. **Reporter type** — user selects whether they are a **passer-by** or a **resident** of that area.
6. **Log or escalate** — user chooses:
   - **Just log it** → report is saved and immediately visible on the public feed. Flow ends here.
   - **Email the authorities** → continue to step 7.
7. **Contact details** *(only if emailing)* — user provides name, mobile number, and email address.
8. **Submit.**
   - If the app has an authority email on file for the selected area, it sends the complaint email immediately (photo, location, reporter details) and the report is saved with that outcome recorded.
   - If the app does **not** have an authority email on file for that area yet, the user is told so and offered three choices:
     a. **Provide the email themselves** — the complaint is sent immediately to the address they type.
     b. **Cancel** — the email is not sent; the report is still saved as a logged (non-emailed) report.
     c. **Queue it** — the report is saved and marked to be emailed automatically, the moment an admin uploads a mapping that covers this area (no further action needed from the user).
9. **Confirmation** — in every case, the user lands on the public feed/log, where their new report appears.

## 6. Core User Flow — Admin

1. **Login** — admin signs in (email + password). There is no self-serve signup; accounts are created for trusted individuals directly by whoever operates the app.
2. **Dashboard**, with:
   - **Upload mapping** — admin uploads a CSV file with two columns: district/area name, authority email address. Uploading a new file **replaces** the current mapping in full (not a merge) — this is the single source of truth for where complaint emails go.
     - Uploading a mapping that newly covers an area with reports sitting in the "queued" state (from step 8c above) automatically triggers those queued emails to send, with no extra step for the admin.
   - **View current mapping** — a read-only table of the area → email pairs currently in effect.
   - **View reports** — a table of all submitted reports, including fields not shown on the public feed: reporter name/mobile/email, and email delivery status (sent / failed / queued / not applicable / error detail).

## 7. Public Feed

Anyone (no login) can browse a feed of all submitted reports showing: photo, area/district, reporter type (passer-by/resident), and submission time. Reporter contact details and email delivery details are never shown publicly. Each report card also carries its own share options (Section 13.4) — a visitor can share any report straight from the feed without opening its permalink page first.

This feed is also the exit destination when a citizen taps the close ("×") control on the hero photo-capture screen before capturing anything (Section 5, Step 1).

## 8. Functional Requirements Summary

- **FR1**: Report submission requires a photo and a captured/confirmed location; all other fields are guided by the step flow above.
- **FR2**: Location is captured via device GPS; the system must resolve it to a human-readable area name and let the user confirm/correct it before submitting.
- **FR3**: A submitted report is always saved, regardless of which path the user takes through the email-related choices — nothing is ever silently discarded.
- **FR4**: Email delivery status is tracked per report (not applicable / sent / failed / queued for later) and is visible to admins only.
- **FR5**: The district → authority-email mapping is fully admin-controlled via CSV upload; citizens never see or edit it directly.
- **FR6**: A CSV upload that contains invalid rows (e.g. malformed email) is rejected in full with a clear explanation — no partial/corrupted mapping state.
- **FR7**: Only accounts explicitly designated as admins can reach the admin dashboard; this check happens on every request, not just at login.
- **FR8**: The public feed never exposes reporter contact details or email-send diagnostics.
- **FR9**: The app is installable to a phone home screen (PWA) and its basic shell loads even with a flaky connection; actual data submission requires connectivity.
- **FR10**: Each report has a public permalink page showing the same fields as the public feed, carrying Open Graph metadata for link unfurling, and offering Twitter and native-share options — never reporter contact details (extends FR8).
- **FR11**: The app's hero screen is the photo-capture step itself, with no intermediate landing menu; a close ("×") control on that screen exits to the public feed with no confirmation required.

## 9. Success Criteria (initial, informal)

- A citizen can go from "opening the app" to "report visible in the public feed" in well under a minute on a typical phone.
- An admin can update the authority-email mapping for their whole coverage area with a single file upload, with no developer involvement.
- No report is ever lost due to a missing authority-email mapping — it's always either logged, sent, or queued.

## 10. Open Questions / Assumptions Going Into Design

- Assumption: one authority email per district is sufficient (no multiple recipients or CC chains) for v1.
- Assumption: admins are a small, manually-managed set of trusted individuals; no need for self-service admin invites in v1.
- Open: what happens if two different admins upload conflicting CSVs around the same time — v1 assumes low enough admin activity that last-write-wins is acceptable.
- Open: whether photo storage/bandwidth limits need attention if usage grows significantly — not a v1 concern at expected initial scale.

## 11. Out of Scope for v1 (explicitly deferred)

- Admin deletion/moderation of individual reports.
- Enforcement of photo size/type limits beyond sane defaults.
- Resolution-status tracking after an email is sent to an authority.
- Duplicate-report detection.
- Native mobile apps.

## 12. Architecture & Implementation Decisions (Design Review — 2026-09-01)

Resolves the open questions in Sections 10–11 and fixes the technical approach for v1.

### 12.1 Stack & Hosting

- **Framework/hosting**: Next.js deployed on Vercel.
- **Backend**: Supabase (Postgres, Auth, Storage) — satisfies Goal 5 (no ops team, no manual server maintenance) end to end.
- **Geographic scope**: India only for v1.
- **Location granularity**: locality (fine-grained), always nested inside a district. The admin mapping in Section 6 remains district → authority email (two columns), unchanged — locality is used for area confirmation and public feed display; the app resolves each locality to its parent district for email routing.

### 12.2 Location Resolution

- **Reverse geocoding provider**: LocationIQ, supplemented by a secondary query (e.g. Overpass) to build the 2–4 candidate locality list required by Step 4 of the citizen flow.
- **GPS denied/unavailable**: falls back to manual locality search via LocationIQ autocomplete rather than blocking the citizen.
- **Manual locality entry**: when a citizen types a custom locality instead of picking a suggested candidate, they also select the district from a dropdown (backed by the canonical district table below) rather than the app inferring it from free text.
- **Canonical district list**: a static table maintained by hand (not sourced live from an external API), used both to validate admin CSV uploads (12.3) and to populate the manual-entry district dropdown. Designed so an optional external sync could be added later without becoming a hard dependency — the app always falls back to the last-known static list and never blocks reporting or CSV validation if an external source is absent or unreachable.

### 12.3 Admin

- **Admin account creation**: manual row insert in the Supabase dashboard — no self-serve tooling (extends the assumption in Section 10).
- **CSV validation (extends FR6)**: an uploaded mapping is validated both for email format and for district names, checked against the canonical district table (12.2); any invalid row rejects the whole file with a clear explanation.
- **Admin dashboard scope**: remains read-only as specified in Section 6 — no manual "retry send" action.

### 12.4 Email Delivery

- **Provider**: Resend, launching on its shared sandbox sending domain for v1 (a dedicated verified domain is deferred until one is available).
- **Failed sends**: retried automatically with backoff (a few attempts); a send that fails permanently (e.g. a bad authority address) stays "failed" and visible to admins per FR4 — recovery is via the admin updating the mapping through the normal CSV workflow, not a dashboard action.
- **Queued-email confirmation**: when a queued report's email is triggered by a later CSV upload (Step 6.2), the original reporter receives a short confirmation email, since their address was already captured in Step 7.

### 12.5 Public Feed & Storage

- **Photo storage**: a public Supabase Storage bucket, directly linkable — consistent with the feed's visibility/accountability purpose (no confidentiality need for photos).
- **Feed display (extends Section 7)**: each report shows locality and district together, not district alone.
- **Abuse throttling**: basic IP/device rate-limiting on report submissions, distinct from the content-moderation non-goal in Section 3.

### 12.6 Client Resilience

- **Offline resilience (extends FR9)**: in-progress report data (photo, GPS point, selections) is persisted locally (IndexedDB) as the citizen moves through the flow, and cleared on successful submit — so a dropped connection immediately before submitting doesn't lose their work.

## 13. Social Sharing (Design Addition — 2026-09-03)

Extends Section 5 Step 9 and Section 7.

### 13.1 Where it appears

Immediately after a report is submitted — at the confirmation moment where the citizen lands on the public feed (Section 5, Step 9) — the app also offers to share the report just created. This appears regardless of which path was taken through the email-related choices (just logged, emailed, cancelled email, queued email).

Share options are not limited to that confirmation moment: every report card on the public feed (Section 7) carries the same share options directly, for any report, to any visitor. Opening a report's permalink page (13.3) is never required to share it — the feed card itself is sufficient.

### 13.2 What is shared

A link to the report's public permalink page (13.3), with short pre-filled text (e.g. "I just reported a pothole in {locality}, {district}"). Sharing never includes reporter name, mobile number, or email — same privacy boundary as the public feed (extends FR8).

### 13.3 Report permalink page

A new public, no-login route (e.g. `/reports/[id]`) shows a single report: photo, locality + district, reporter type, and submission time — the same fields already shown on the public feed (Section 7). It carries Open Graph / Twitter Card meta tags (image = the report's photo from the public Supabase Storage bucket per 12.5; title/description built from locality/district) so the link unfurls with the photo when pasted into Twitter, WhatsApp, etc.

### 13.4 Share options

- **Twitter/X** — always the first, top-most option. Opens Twitter's web intent (`twitter.com/intent/tweet`) pre-filled with text and the permalink. No API keys or app registration needed.
- **Native share** — a second "Share..." option invoking the Web Share API (`navigator.share`) where supported, surfacing the device's own share sheet (WhatsApp, Facebook, Telegram, SMS, etc.) as a catch-all.
- **Fallback** — where Web Share isn't supported (mainly desktop browsers), the native option falls back to copy-link-to-clipboard.

### 13.5 Non-goals

- No share-count analytics or tracking of shares in v1.
- No auto-posting to an official/organizational social account.
- No social login or connected account — sharing always goes through the platform's own share/intent flow in the citizen's current browser session.

## 14. Visual Design Language (Design Addition — 2026-09-03)

Reference: a photo-forward, minimal mobile app mockup supplied during design review (not a live product). This section adopts the reusable *visual* language only — patterns that assume a logged-in, personalized account (avatar, personalized greeting, favorites, ratings/reviews, pricing, booking CTAs) are explicitly excluded, since none have an equivalent in this app's no-login citizen model (Section 3 Non-Goals).

### 14.1 Palette & type

- Near-monochrome UI: an off-white/light-grey background with near-black (charcoal, not pure black) used for primary chrome — buttons, active pills, the bottom nav.
- Color comes primarily from photography (pothole photos, map imagery), not from UI paint — no bright brand accent color is introduced beyond this monochrome base for v1.
- Bold, high-contrast headings paired with smaller, lighter-grey secondary/body text — a clear two-tier hierarchy.

### 14.2 Shape & surface

- Fully rounded corners throughout: cards, buttons, chips/pills, and the bottom navigation bar itself is a floating rounded pill rather than a flush-edge bar.
- Photo-led cards: each report card is dominated by its photo, with minimal overlaid chrome — translucent circular icon buttons (e.g. close, share) sit directly on top of the image rather than in a separate toolbar strip.

### 14.3 Components to reuse

- **Translucent circular icon button over a photo** — used for the close ("×") control on the hero photo-capture screen (Section 5, Step 1) and the share icon on feed/permalink cards (Section 13).
- **Pill filter/segmented chips** — e.g. district/area filters on the public feed, or a segmented-tab pattern for the admin dashboard's mapping/reports views (Section 6.2).
- **Floating pill bottom nav** — a persistent nav across the two citizen-facing destinations that exist without login: Feed and Report (no favorites/profile tab, since neither exists in this app).
- **Full-width rounded black CTA button** — used for primary actions (e.g. "Submit report", "Send complaint").

### 14.4 Excluded patterns

- Profile avatar / personalized greeting — no accounts for citizens.
- Heart/favorite icons, star ratings, review counts, pricing, and booking CTAs — no equivalents in this domain.
