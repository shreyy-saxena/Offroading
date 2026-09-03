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

- [ ] Twitter intent opens with correct pre-filled text + permalink for a given report.
- [ ] On a browser/device supporting Web Share, "Share..." opens the native sheet with the same link.
- [ ] On a browser without Web Share support, "Share..." falls back to copy-link with visible confirmation.
- [ ] The same component renders correctly both on the confirmation screen and on a feed card, with no dependency on the permalink page having been opened first.
- [ ] Share text/links never contain reporter contact details.

## Out of scope for this ticket

- Share-count analytics/tracking (explicit non-goal).
- Auto-posting to an official social account (explicit non-goal).

## Testing

- Component test: assert the Twitter intent URL is correctly formed for a fixture report; assert Web Share is called when available and falls back to clipboard copy when `navigator.share` is undefined.
