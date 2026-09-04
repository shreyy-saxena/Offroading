"use client";

import { useState } from "react";
import { IconButton } from "./IconButton";
import { ShareIcon, XLogoIcon } from "./icons";

type ShareButtonsProps = {
  // The report's absolute permalink URL — computed server-side by the
  // caller (src/lib/site-url.ts) and passed in, never derived from
  // window.location here: that would render an origin-less relative URL
  // during SSR (a real bug caught via live testing — the value differs
  // between server and client render, and Twitter needs an absolute
  // URL regardless of when the link is used).
  url: string;
  locality: string;
  district: string;
  className?: string;
};

function shareText(locality: string, district: string): string {
  return `I just reported a pothole in ${locality}, ${district}`;
}

// PRD 13.1/13.4 — mounted on every feed card (ticket 11) and the
// permalink page (ticket 12); the post-submit "confirmation" is just the
// feed itself (PRD 13.1), so mounting on feed cards already covers it —
// no separate confirmation surface needed.
export function ShareButtons({ url, locality, district, className = "" }: ShareButtonsProps) {
  const [justCopied, setJustCopied] = useState(false);

  const text = shareText(locality, district);
  const twitterHref = `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url }).toString()}`;

  async function handleShareClick() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: text, text, url });
      } catch {
        // Citizen cancelled the native share sheet — not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconButton
        href={twitterHref}
        target="_blank"
        rel="noopener noreferrer"
        icon={<XLogoIcon />}
        label="Share on X (Twitter)"
      />
      <IconButton icon={<ShareIcon />} label="Share…" onClick={handleShareClick} />
      {justCopied ? (
        <span role="status" className="rounded-pill bg-overlay px-3 py-1.5 text-caption text-ink-foreground">
          Link copied
        </span>
      ) : null}
    </div>
  );
}
