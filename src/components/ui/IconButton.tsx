import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonOwnProps = {
  icon: ReactNode;
  /** Accessible name — required since the button carries no visible text. */
  label: string;
};

type IconButtonAsButton = IconButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type IconButtonAsLink = IconButtonOwnProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type IconButtonProps = IconButtonAsButton | IconButtonAsLink;

// pointer-events-auto: PhotoCard's overlay wrapper is pointer-events-none
// (so its empty space doesn't block clicks on whatever's behind the
// photo) — this re-enables clicks on the button itself unconditionally,
// harmless in every other context this component is used in.
const baseClassName =
  "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-pill bg-overlay text-ink-foreground backdrop-blur-sm transition-colors hover:bg-ink/60";

// Translucent circular icon button (PRD 14.3) — meant to sit directly on
// top of a photo (e.g. inside PhotoCard's overlay slot), but works on a
// plain surface too. Renders as a real <a> when `href` is given (e.g. a
// share-to-Twitter link) rather than a <button> nested inside one, which
// isn't valid interactive-content nesting.
export function IconButton({ icon, label, className = "", ...props }: IconButtonProps) {
  if (props.href !== undefined) {
    const { href, ...anchorProps } = props;
    return (
      <a href={href} aria-label={label} className={`${baseClassName} ${className}`} {...anchorProps}>
        <span className="h-5 w-5">{icon}</span>
      </a>
    );
  }

  return (
    <button type="button" aria-label={label} className={`${baseClassName} ${className}`} {...props}>
      <span className="h-5 w-5">{icon}</span>
    </button>
  );
}
