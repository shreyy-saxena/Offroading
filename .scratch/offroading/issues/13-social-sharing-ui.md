# 13: Social sharing UI

Status: ready-for-agent
Blocked by: 08, 11, 12, 19

## Spec references

- PRD Section 13 (13.1, 13.2, 13.4); Section 7
- Spec User Stories 17a, 17b, 17d; Implementation Decisions — "Social sharing"

## Scope

A shared component used in three places — build it once, mount it three times:

1. Post-submit confirmation (ticket 08's landing on the feed) — regardless of which path was taken through the email-related choices.
2. Every report card on the public feed (ticket 11) — sharing must work directly from the card, no click-through to the permalink required.
3. (Implicitly covered by using the same component) — the permalink page (ticket 12) itself can also host it, though the requirement is satisfied as long as feed cards don't require opening it first.

Component behavior:

- **Twitter/X** button always listed first — opens `twitter.com/intent/tweet` with pre-filled text (e.g. "I just reported a pothole in {locality}, {district}") and the report's permalink URL (ticket 12). No API keys/app registration.
- **"Share..."** button — invokes `navigator.share()` where supported (native OS share sheet: WhatsApp, Facebook, Telegram, SMS, etc.).
- **Fallback** — where `navigator.share` is unsupported (mainly desktop), falls back to copy-link-to-clipboard with a visible confirmation (e.g. toast).
- Never includes reporter name, mobile, or email in shared text or the permalink page it points to (already enforced by ticket 12, but double-check the share text template itself doesn't accidentally pull in contact fields).

## Acceptance Criteria

- [x] Twitter intent opens with correct pre-filled text + permalink for a given report.
- [x] On a browser/device supporting Web Share, "Share..." opens the native sheet with the same link.
- [x] On a browser without Web Share support, "Share..." falls back to copy-link with visible confirmation.
- [x] The same component renders correctly both on the confirmation screen and on a feed card, with no dependency on the permalink page having been opened first.
- [x] Share text/links never contain reporter contact details.

## Out of scope for this ticket

- Share-count analytics/tracking (explicit non-goal).
- Auto-posting to an official social account (explicit non-goal).

## Testing

- Component test: assert the Twitter intent URL is correctly formed for a fixture report; assert Web Share is called when available and falls back to clipboard copy when `navigator.share` is undefined.

## Comments

- **"Post-submit confirmation" collapsed into "every feed card"**: PRD 13.1 says the share offer appears "at the confirmation moment where the citizen lands on the public feed" — since ticket 08 already redirects straight to `/feed` with no separate confirmation screen, and the feed reloads fresh (uncached) on every visit, mounting `ShareButtons` on every feed card automatically covers the just-submitted report too (it's simply the newest card). No special-casing needed for scope bullet 1 — built once, mounted on feed cards (11) and the permalink page (12), matching the ticket's own "implicitly covered" framing.
- **Two real bugs found only by clicking the buttons live, not by screenshotting**:
  1. Feed cards are wrapped in a Link (to the permalink) and now also carry real interactive share buttons in an overlay — nesting a button/anchor inside another anchor is invalid HTML. Fixed with a "stretched link" pattern: an invisible full-card `<Link>` behind the visible content, share buttons layered above it, both as siblings rather than nested. `IconButton` (ticket 19) gained a polymorphic `href` mode so the Twitter button renders as a real `<a>`, not a `<button>` faking one.
  2. Getting the stretched-link *and* the overlay buttons to both correctly intercept the right clicks took two more fixes, both real gaps in existing ticket-19 code, not new bugs: (a) `PhotoCard`'s overlay wrapper spans the whole photo for corner-positioning purposes, but its *empty* space was blocking clicks meant for whatever's underneath — fixed with `pointer-events-none` on the wrapper and `pointer-events-auto` on `IconButton` itself. (b) `position:relative` elements without their own `z-index` still compete in the ancestor's "z-index:auto" stacking tier and break ties by DOM order — `PhotoCard`'s internal wrapper divs (relative, no z-index) were silently outranking the stretched link at "z-0" purely because they render later in the tree. Fixed by giving the link and the overlay the *same* explicit z-index (10) and relying on the (correct, intentional) DOM-order tiebreak to favor the later-rendered buttons.
  3. A third bug, found via checking raw served HTML rather than a screenshot: the Twitter share URL was built client-side from `window.location.origin`, which is empty during server-side rendering — the initial (and briefly clickable-before-hydration) href was a broken relative URL. Fixed by computing the permalink URL server-side (new `src/lib/site-url.ts`, deriving the origin from the request's own headers rather than a hardcoded domain — works the same in dev/preview/prod) and passing it into `ShareButtons` as a plain `url` prop; the component no longer touches `window.location` at all. Also set `openGraph.url` on the permalink page while fixing this, since it needed the same helper and was a related gap (unset before).
  - All three were confirmed via real interaction/raw-HTML checks in a live browser, not just visual screenshots — worth remembering for any future ticket mixing an overlay with a card-level link.
- `tsc`, `eslint`, and `pnpm test` (45/45) all pass clean.
