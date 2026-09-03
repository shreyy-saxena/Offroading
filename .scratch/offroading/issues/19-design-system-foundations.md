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

- [x] Tokens (colors, type scale, radius scale) are defined once and consumed by components rather than hardcoded per screen.
- [x] Each base component listed above exists, is documented (e.g. a style-guide/storybook page or equivalent), and is used by at least a placeholder screen to confirm it renders correctly in both an image-overlay context and a plain-background context.
- [x] No avatar/favorite/rating/pricing/booking components exist in the library.

## Out of scope for this ticket

- Wiring these components into actual feature screens — that happens in tickets 05, 11, 12, 13, 16, which depend on this one.

## Testing

- Visual/snapshot test or style-guide page per component is sufficient; no business logic to test here.

## Comments

- **Pulled ahead of ticket 05** (2026-09-03): ticket 05 lists this as a blocker; since 19 is only blocked by 01 (done), it was the actual next unblocked ticket per the tracker's own dependency order.
- **Tokens**: Tailwind v4 `@theme` block in `src/app/globals.css` — `--color-*` (canvas/surface/ink/ink-foreground/muted/hairline/overlay), `--text-*` (heading/subheading/body/caption, each with a paired line-height), `--radius-*` (card/pill). Deliberately **no** `@media (prefers-color-scheme: dark)` branch, unlike the Next.js starter template it replaced: PRD 14.1 specifies one fixed near-monochrome look, and swapping to an OS dark theme would invert contrast (e.g. near-black chrome buttons vanishing into a near-black background), not just recolor it. Kept the starter's Geist font rather than introducing a new one — nothing in PRD 14 calls for a specific typeface, and it already fit "minimal."
- **Components**: `src/components/ui/{IconButton,PillChip,CtaButton,PhotoCard,BottomNav}.tsx`, plus a small `icons.tsx` (inline SVGs — close/share/feed/report; no icon library dependency for four glyphs). `PhotoCard` uses a plain `<img>` rather than `next/image`, since it needs to serve remote Supabase Storage URLs, local `blob:` capture previews (ticket 05), and the style guide's own inline data-URI placeholder — `next/image`'s remote-pattern allowlist and `blob:`/`data:` handling don't fit that variety. `BottomNav` hardcodes its two destinations (`/`, `/feed`) since those are fixed by PRD 3/14.3, not screen-specific wiring.
- **Style guide**: `/style-guide` route (`noindex`, not linked from real nav) — verified live with a headless-browser screenshot (Playwright, installed transiently for this check only, not added as a project dependency) confirming the palette, type scale, radius scale, and all five components render correctly, including IconButton in both a plain-background and photo-overlay context, and the bottom nav genuinely pinned to the viewport bottom. Zero console errors.
- `tsc` and `eslint` both pass clean.
