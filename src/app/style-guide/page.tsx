import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { CtaButton } from "@/components/ui/CtaButton";
import { IconButton } from "@/components/ui/IconButton";
import { PhotoCard } from "@/components/ui/PhotoCard";
import { PillChip } from "@/components/ui/PillChip";
import { CloseIcon, ShareIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Style guide — Offroading",
  robots: { index: false, follow: false },
};

// Internal reference page (ticket 19) — not linked from the app's real
// navigation. Shows each base component in both an image-overlay and a
// plain-background context, per the ticket's acceptance criteria.
const PLACEHOLDER_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>` +
      `<rect width='400' height='400' fill='#d4d4d8'/>` +
      `<circle cx='200' cy='165' r='65' fill='#a1a1aa'/>` +
      `<rect x='55' y='250' width='290' height='95' rx='20' fill='#a1a1aa'/>` +
      `</svg>`,
  );

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-subheading text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 w-full rounded-card border border-hairline ${className}`} />
      <span className="text-caption text-muted">{name}</span>
    </div>
  );
}

export default function StyleGuidePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-12 px-6 py-12 pb-32">
      <header>
        <h1 className="text-heading text-ink">Offroading style guide</h1>
        <p className="text-body text-muted">
          Design tokens and base components (ticket 19) — internal reference, not part of the
          citizen/admin app itself.
        </p>
      </header>

      <Section title="Palette">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          <Swatch name="canvas" className="bg-canvas" />
          <Swatch name="surface" className="bg-surface" />
          <Swatch name="ink" className="bg-ink" />
          <Swatch name="muted" className="bg-muted" />
          <Swatch name="hairline" className="bg-hairline" />
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-2">
          <p className="text-heading text-ink">Heading — bold, high-contrast</p>
          <p className="text-subheading text-ink">Subheading</p>
          <p className="text-body text-ink">Body — primary content</p>
          <p className="text-body text-muted">Body — secondary/muted</p>
          <p className="text-caption text-muted">Caption — timestamps, metadata</p>
        </div>
      </Section>

      <Section title="Radius scale">
        <div className="flex items-end gap-4">
          <div className="h-16 w-16 rounded-card bg-ink" />
          <span className="text-caption text-muted">rounded-card</span>
          <div className="h-10 w-24 rounded-pill bg-ink" />
          <span className="text-caption text-muted">rounded-pill</span>
        </div>
      </Section>

      <Section title="IconButton — plain background">
        <div className="flex gap-3 rounded-card bg-surface p-4">
          <IconButton icon={<CloseIcon />} label="Close" />
          <IconButton icon={<ShareIcon />} label="Share" />
        </div>
      </Section>

      <Section title="IconButton — over a photo">
        <PhotoCard
          src={PLACEHOLDER_PHOTO}
          alt=""
          className="max-w-xs"
          overlay={
            <div className="flex justify-end">
              <IconButton icon={<CloseIcon />} label="Close" />
            </div>
          }
        />
      </Section>

      <Section title="PillChip">
        <div className="flex flex-wrap gap-2 rounded-card bg-surface p-4">
          <PillChip active>All districts</PillChip>
          <PillChip>Verify District</PillChip>
          <PillChip>Verify District 2</PillChip>
        </div>
      </Section>

      <Section title="CtaButton">
        <div className="max-w-xs rounded-card bg-surface p-4">
          <CtaButton>Submit report</CtaButton>
        </div>
      </Section>

      <Section title="Photo-led card shell">
        <PhotoCard
          src={PLACEHOLDER_PHOTO}
          alt="Sample report photo"
          className="max-w-xs"
          overlay={
            <div className="flex justify-end">
              <IconButton icon={<ShareIcon />} label="Share" />
            </div>
          }
          footer={
            <div>
              <p className="text-body text-ink">Sample Locality, Sample District</p>
              <p className="text-caption text-muted">Reported by a passer-by · just now</p>
            </div>
          }
        />
      </Section>

      <Section title="Floating pill bottom nav">
        <p className="text-caption text-muted">
          Rendered live at the bottom of this page (it&apos;s fixed-position).
        </p>
      </Section>

      <BottomNav />
    </div>
  );
}
