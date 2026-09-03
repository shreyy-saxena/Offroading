# 19: Visual design system foundations

Status: ready-for-agent
Blocked by: 01

## Spec references

- PRD Section 14 (Visual Design Language, all subsections)
- Spec Implementation Decisions — "Visual design"

## Scope

Build the shared visual/component layer other UI tickets draw from, so those tickets are internally consistent without each re-deriving style decisions:

- Design tokens: near-monochrome palette (off-white/light-grey background, near-black charcoal for primary chrome), type scale (bold high-contrast headings vs. lighter-grey secondary/body text), consistent rounded-corner radius scale.
- Base components:
  - Translucent circular icon button (for overlaying on photos — used by the close control in ticket 05 and the share icon in ticket 13).
  - Pill filter/segmented chip (active vs. inactive state) — used by feed filters (ticket 11) and admin dashboard tabs (ticket 16).
  - Floating pill bottom nav (Feed / Report only — no favorites/profile tab, since neither exists in this app).
  - Full-width rounded black CTA button — used for primary actions across the app.
  - Photo-led card shell (rounded corners, image-dominant, minimal overlaid chrome) — used by feed cards (ticket 11) and the permalink page (ticket 12).
- Explicitly do **not** build: avatar/profile components, favorite/heart icons, star rating displays, pricing displays, or booking-style CTAs — these have no equivalent in this app (Section 14.4) and shouldn't exist in the component library even as unused scaffolding.

## Acceptance Criteria

- [ ] Tokens (colors, type scale, radius scale) are defined once and consumed by components rather than hardcoded per screen.
- [ ] Each base component listed above exists, is documented (e.g. a style-guide/storybook page or equivalent), and is used by at least a placeholder screen to confirm it renders correctly in both an image-overlay context and a plain-background context.
- [ ] No avatar/favorite/rating/pricing/booking components exist in the library.

## Out of scope for this ticket

- Wiring these components into actual feature screens — that happens in tickets 05, 11, 12, 13, 16, which depend on this one.

## Testing

- Visual/snapshot test or style-guide page per component is sufficient; no business logic to test here.
