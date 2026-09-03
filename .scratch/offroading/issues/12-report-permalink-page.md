# 12: Report permalink page

Status: ready-for-agent
Blocked by: 11, 19

## Spec references

- PRD Section 13.3; Section 8 FR10
- Spec User Story 17c

## Scope

- New public, no-login route (e.g. `/reports/[id]`) showing a single report: photo, locality + district, reporter type, submission time — same fields and same privacy boundary as the feed (ticket 11).
- Open Graph / Twitter Card meta tags: `og:image` = the report's photo (public Storage URL from ticket 04), `og:title`/`og:description` built from locality/district, so the link unfurls with the photo on Twitter/WhatsApp/etc.
- A non-existent or malformed report id returns a clean 404, not an error page leaking internals.

## Acceptance Criteria

- [x] Visiting `/reports/[id]` for a real report shows the same fields as its feed card, no login required.
- [x] Page source includes correct OG/Twitter Card meta tags pointing at the report's actual photo URL.
- [x] Reporter contact details and delivery diagnostics are absent from both the rendered page and the page's HTML/meta (same boundary as ticket 11).
- [x] Unknown id → 404.

## Out of scope for this ticket

- Share buttons themselves (ticket 13) — this ticket only builds the page they link to.

## Testing

- Test that meta tags render with expected values for a seeded report; test the privacy boundary the same way as ticket 11's test, applied to this route.

## Comments

- **Genuinely unblocked as numbered** — both blockers (11, 19) done, no gap.
- **Shared the privacy boundary and row-mapping with ticket 11**: `getPublicReportById` (new, in `src/lib/reports/public-feed.ts`) reuses the same explicit-column-list `mapRow` helper and the same `public_reports` view/anon-client pattern as `listPublicReports` — one boundary to keep correct, not two. Wrapped in React's `cache()` so `generateMetadata` and the page component (which both need the same report) only hit the DB once per request.
- **Malformed id → 404, not a raw Postgres error**: an invalid-UUID string passed straight to `.eq("id", id)` would surface as a DB-level error, not a clean "not found." Validated with a UUID regex before ever querying — confirmed live that both an unknown well-formed id and a garbage string (`not-a-real-id`) return a real HTTP 404.
- **Custom `not-found.tsx`** under `src/app/reports/[id]/` — small, on-brand (uses the design tokens) rather than Next's generic default page, cheap to add given the design system already exists.
- **Feed cards now link to their permalink** (`src/app/feed/page.tsx` wraps each `PhotoCard` in a `Link`) — ticket 11 called this route "the home base for the permalink," so wiring the link now (rather than leaving cards as dead ends until ticket 13) seemed like the natural completion, not scope creep.
- Verified live: real OG/Twitter meta tags confirmed via curl'd raw HTML (`og:title`/`og:description`/`og:image`/`twitter:*` all correct, pointing at the real photo URL), zero leakage of a seeded report's contact/delivery fields anywhere in the HTML, both 404 cases return real HTTP 404, screenshots of both the report view and the not-found page match the design system.
- `tsc`, `eslint`, and `pnpm test` (40/40) all pass clean.
