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
- ~~No admin moderation/deletion of individual reports (revisit if spam becomes a problem).~~ **Reversed 2026-09-04**: admin deletion (single or multi-select) was added to the reports view — see ticket 20.
- No native mobile app — a mobile-friendly installable web app (PWA) only.
- No automatic detection of duplicate reports of the same pothole.

## 4. Users

| User | Access | What they do |
|---|---|---|
| **Citizen reporter** | No login | Photographs a pothole, submits a report, optionally emails the authority |
| **Admin** | Login required (invite-only, no public signup) | Uploads/maintains the district → authority-email mapping; views submitted reports and email delivery status |

## 5. Core User Flow — Citizen Report

1. **Landing / Photo (hero flow)** — the app opens directly into the photo-capture screen; there is no separate landing menu or button to tap first — opening the app *is* starting a report. **Changed 2026-09-06** — see Section 15: a first-visit-only onboarding carousel now precedes this screen for a citizen who has never opened the app before; every return visit (and every visit after the carousel is dismissed) goes straight to the photo-capture screen as originally described here. A close ("×") control sits in the top-right corner of this screen; since nothing has been captured yet, tapping it exits immediately with no confirmation prompt and takes the user to the public feed (Section 7) — the same destination as a completed submission (Step 9).
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
   - **Upload mapping** — admin uploads a CSV file with two columns: state name, authority email address(es). **Changed 2026-09-04** — see Section 12.7: collecting a distinct email per district turned out not to be logistically possible, so the mapping is keyed by state instead, and a cell may hold more than one address. Uploading a new file **replaces** the current mapping in full (not a merge) — this is the single source of truth for where complaint emails go.
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
- **FR5**: The state → authority-email mapping is fully admin-controlled via CSV upload; citizens never see or edit it directly. (Changed 2026-09-04 from district → authority-email — see Section 12.7.)
- **FR6**: A CSV upload that contains invalid rows (e.g. malformed email) is rejected in full with a clear explanation — no partial/corrupted mapping state.
- **FR7**: Only accounts explicitly designated as admins can reach the admin dashboard; this check happens on every request, not just at login.
- **FR8**: The public feed never exposes reporter contact details or email-send diagnostics.
- **FR9**: The app is installable to a phone home screen (PWA) and its basic shell loads even with a flaky connection; actual data submission requires connectivity.
- **FR10**: Each report has a public permalink page showing the same fields as the public feed, carrying Open Graph metadata for link unfurling, and offering Twitter and native-share options — never reporter contact details (extends FR8).
- **FR11**: The app's hero screen is the photo-capture step itself, with no intermediate landing menu; a close ("×") control on that screen exits to the public feed with no confirmation required. (Amended 2026-09-06 — see Section 15: a first-visit-only onboarding carousel precedes this screen for a citizen's very first visit only; FR11 holds unchanged for every visit after that.)
- **FR12**: The app tracks anonymous, property-free funnel events (no PII, GPS, or report content) for the citizen report flow, to measure step-by-step drop-off — see Section 16.

## 9. Success Criteria (initial, informal)

- A citizen can go from "opening the app" to "report visible in the public feed" in well under a minute on a typical phone.
- An admin can update the authority-email mapping for their whole coverage area with a single file upload, with no developer involvement.
- No report is ever lost due to a missing authority-email mapping — it's always either logged, sent, or queued.

## 10. Open Questions / Assumptions Going Into Design

- Assumption: one authority email per district is sufficient (no multiple recipients or CC chains) for v1. **Superseded 2026-09-04** — see Section 12.7: the mapping is per-state, and a state may list multiple recipient addresses.
- Assumption: admins are a small, manually-managed set of trusted individuals; no need for self-service admin invites in v1.
- Open: what happens if two different admins upload conflicting CSVs around the same time — v1 assumes low enough admin activity that last-write-wins is acceptable.
- Open: whether photo storage/bandwidth limits need attention if usage grows significantly — not a v1 concern at expected initial scale.

## 11. Out of Scope for v1 (explicitly deferred)

- ~~Admin deletion/moderation of individual reports.~~ **Reversed 2026-09-04** — see Section 3 and ticket 20.
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
- **Location granularity**: locality (fine-grained), always nested inside a district, itself nested inside a state. Locality is used for area confirmation and public feed display; the app resolves each locality to its parent district, and that district to its parent state, for email routing (Section 12.7).

### 12.2 Location Resolution

- **Reverse geocoding provider**: LocationIQ, supplemented by a secondary query (e.g. Overpass) to build the 2–4 candidate locality list required by Step 4 of the citizen flow. (Superseded — see Section 12.8.)
- **GPS denied/unavailable**: falls back to manual locality search via LocationIQ autocomplete rather than blocking the citizen. (Superseded — see Section 12.8.)
- **Manual locality entry**: when a citizen types a custom locality instead of picking a suggested candidate, they also select the district from a dropdown (backed by the canonical district table below) rather than the app inferring it from free text.
- **Canonical district list**: a static table maintained by hand (not sourced live from an external API), used both to validate admin CSV uploads (12.3) and to populate the manual-entry district dropdown. Designed so an optional external sync could be added later without becoming a hard dependency — the app always falls back to the last-known static list and never blocks reporting or CSV validation if an external source is absent or unreachable.

### 12.3 Admin

- **Admin account creation**: manual row insert in the Supabase dashboard — no self-serve tooling (extends the assumption in Section 10).
- **CSV validation (extends FR6)**: an uploaded mapping is validated both for email format and for state names, checked against the canonical district table's state list (12.2); any invalid row rejects the whole file with a clear explanation. (Changed 2026-09-04 from district names — see Section 12.7.)
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

### 12.7 State-Level Fallback Mapping (Addendum — 2026-09-04)

- **Why**: collecting a distinct authority email per district (Section 6, 12.1) turned out not to be logistically possible. The fallback is to collect authority email address(es) per **state** instead.
- **Mapping shape**: the admin CSV (Section 6 Step 2) is still two columns, but the first column is now a state name (validated against the states present in the canonical district table, 12.2) rather than a district/area name. The second column may hold more than one address — multiple recipients in one cell are separated by a semicolon (`;`), and extra comma-separated columns are also tolerated as additional emails (a source spreadsheet's own comma-separated cell, exported to CSV, otherwise reads as extra columns).
- **Routing**: every district within a state routes complaint emails to that state's address(es) — resolved via the district's state on the canonical district table, not stored per-district. A queued report (Step 8c) becomes sendable the moment its district's *state* is covered by an upload, same trigger mechanism as before (Section 6.2), just keyed one level up.
- **Multiple recipients**: when a state lists more than one address, the complaint email is sent once with every listed address as a recipient (not one email per address) — this supersedes the Section 10 assumption of one address per district with no multiple recipients.
- **State-name matching**: tolerant of "&"-for-"and", a canonical name's trailing descriptor word being dropped (e.g. "Andaman & Nicobar" for "Andaman and Nicobar Islands"), and a small set of known non-derivable abbreviations (e.g. "DNH" for "Dadra and Nagar Haveli") — extensible if more real-world variants turn up.

### 12.8 Location Provider Migration (Addendum — 2026-09-04)

- **Why**: moved off LocationIQ to Google Maps Platform for reverse geocoding and locality search.
- **Provider**: Google Maps Platform — Geocoding API (reverse geocoding, legacy REST) plus Places API (New) for Autocomplete and Place Details. The legacy Places API (Nearby Search, Autocomplete, Details) was the original intent but is blocked on newer Google Cloud projects — confirmed live, not assumed — so Autocomplete/Details use Places API (New) instead (POST requests, `X-Goog-Api-Key`/`X-Goog-FieldMask` headers, rather than a `key` query param). Env var `GOOGLE_MAPS_API_KEY` replaces `LOCATIONIQ_API_KEY` (server-only, no `NEXT_PUBLIC_` prefix — same boundary as before).
- **Candidate list (Section 5 Step 4, 12.2's "secondary query")**: Places Nearby Search cannot serve this purpose at all, on either API vintage — confirmed live that it only indexes POI/business establishments, not administrative localities (even "neighborhood" is rejected as a search-filter type). Instead, the candidate list is built by reverse-geocoding a handful of points sampled a short distance (~400m) from the GPS fix in each cardinal direction, reusing the primary reverse-geocode call's own logic — a citizen genuinely near a boundary between two areas gets back distinct localities from different sample points; this replaces the original plan of a Places-based nearby search, and supersedes 12.2's Overpass mention (which, per 12.2's original wording, was only ever offered as a hypothetical example and never actually built — LocationIQ's own Nearby endpoint filled that role instead).
- **Manual search fallback**: now Places Autocomplete (New) (`includedRegionCodes: ["in"]`), replacing LocationIQ's autocomplete — same trigger (GPS denied/unavailable) and same user-facing behavior. Each prediction needs a follow-up Place Details (New) call to resolve its district, since predictions alone carry no address components.
- **District matching**: unchanged in principle — still strict against the static canonical district table (12.2), never inferred or fuzzy-matched — but the *mechanism* changed after a live bug was found: Google does not put a district at a fixed administrative-area level consistently (e.g. Karnataka has an extra "Bangalore Division" layer between state and district), so the client checks every admin-area level against the canonical district table and uses whichever one actually matches, rather than trusting a fixed level number.

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

- ~~No share-count analytics or tracking of shares in v1.~~ **Reversed 2026-09-06** — anonymous share-intent tracking (`shared_on_x`/`shared_generic`) added as part of the broader funnel-tracking work; see Section 16.
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

## 15. Onboarding & Branding (Design Addition — 2026-09-06)

Extends Section 5, Step 1 and FR11. The app opening directly into the camera, then immediately requesting GPS location, read as a privacy red flag to first-time users with no context for why. This section addresses that without adding friction for anyone who has already been through it.

### 15.1 First-visit onboarding carousel

A 3-slide, no-skip carousel shown **only** on a citizen's first-ever visit (tracked via a local, on-device flag — not an account or server-side record): "Click & report potholes near you" (what the app does) → "How it works" (photo → confirm location → log it or email the authority, can also share on social media) → "No login needed" (reassurance + a **Let's Go** call to action). Every visit after the first goes straight to the photo-capture screen (Section 5, Step 1) as originally specified — the carousel exists exactly once per device/browser.

No skip control was a deliberate choice: the three slides are short enough that requiring them costs little, and they're precisely the context (what/how/no-login) meant to resolve the privacy doubt the direct-to-camera opening otherwise raises.

### 15.2 App branding / logo

A car-and-pothole illustrated badge (supplied by the app owner) is used as the PWA's home-screen icon and browser favicon, and appears in the corner of every screen **except** the camera/photo-capture screen (Section 5, Step 1), which stays a full-bleed, chrome-free viewfinder by design. The logo's background is rendered transparent (not carrying its own off-white halo) so it sits naturally on whatever screen background it appears against.

## 16. Analytics (Design Addition — 2026-09-06)

### 16.1 Purpose

Anonymous funnel measurement of the citizen report flow (Section 5) — specifically, how many citizens reach each step, so drop-off/churn between steps is visible. No admin-dashboard analytics in this pass (Section 6).

### 16.2 Events tracked

Seven bare, property-free events, each firing at one specific point in the existing flow:

| Event | Fires when |
|---|---|
| `flow_started` | The photo-capture screen (Section 5, Step 1) is reached |
| `photo_captured` | A photo upload succeeds (Step 2) |
| `location_confirmed` | The citizen confirms an area/district, via GPS candidate or manual search (Step 4) |
| `report_logged` | A report saves via "Just log it" (Step 6), or via the missing-mapping screen's "Cancel" choice (Step 8b) — both end in the same saved, non-emailed outcome |
| `report_emailed` | A report saves via the email path (Step 8, direct-send case), or via the missing-mapping screen's "provide email" or "queue" choices (Step 8a/8c) |
| `shared_on_x` | The citizen taps the "Share on X" option (Section 13.4) |
| `shared_generic` | The citizen taps the generic "Share…" option — native share sheet or copy-link fallback (Section 13.4) |

### 16.3 Privacy stance

No PII, GPS coordinates, photo URLs, locality/district names, or report content are ever sent — only Mixpanel's own anonymous per-browser identifier, consistent with the no-login citizen model (Section 3). IP-based geolocation enrichment is explicitly disabled on the analytics side too, for the same reason FR2's location data itself is never sent along.

### 16.4 Known limitation

`shared_on_x`/`shared_generic` fire when the share action is *initiated* (the X compose window opened, or the native share sheet invoked) — not when a post is confirmed sent. Both can be cancelled by the citizen with no signal visible to the app. These are "intent to share" counts, not confirmed-share counts.
