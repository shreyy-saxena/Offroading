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

- [ ] Visiting `/reports/[id]` for a real report shows the same fields as its feed card, no login required.
- [ ] Page source includes correct OG/Twitter Card meta tags pointing at the report's actual photo URL.
- [ ] Reporter contact details and delivery diagnostics are absent from both the rendered page and the page's HTML/meta (same boundary as ticket 11).
- [ ] Unknown id → 404.

## Out of scope for this ticket

- Share buttons themselves (ticket 13) — this ticket only builds the page they link to.

## Testing

- Test that meta tags render with expected values for a seeded report; test the privacy boundary the same way as ticket 11's test, applied to this route.
