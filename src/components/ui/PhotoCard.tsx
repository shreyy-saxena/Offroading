import type { ReactNode } from "react";

type PhotoCardProps = {
  src: string;
  alt: string;
  /** Chrome positioned directly on top of the photo (e.g. IconButtons). */
  overlay?: ReactNode;
  /** Content below the photo (e.g. locality/district, timestamp). */
  footer?: ReactNode;
  className?: string;
};

// Photo-led card shell (PRD 14.2/14.3) — rounded corners, image-dominant,
// minimal overlaid chrome. Used by feed cards (ticket 11) and the
// permalink page (ticket 12).
//
// Plain <img>, not next/image: sources span remote Supabase Storage URLs,
// local blob: preview URLs during capture (ticket 05), and this file's
// own inline data-URI placeholder — next/image's remote-pattern allowlist
// and blob:/data: handling don't fit that variety well.
export function PhotoCard({ src, alt, overlay, footer, className = "" }: PhotoCardProps) {
  return (
    <div className={`overflow-hidden rounded-card bg-surface ${className}`}>
      <div className="relative aspect-square w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
        {overlay ? <div className="absolute inset-0 p-3">{overlay}</div> : null}
      </div>
      {footer ? <div className="p-4">{footer}</div> : null}
    </div>
  );
}
