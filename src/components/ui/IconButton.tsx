import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  /** Accessible name — required since the button carries no visible text. */
  label: string;
};

// Translucent circular icon button (PRD 14.3) — meant to sit directly on
// top of a photo (e.g. inside PhotoCard's overlay slot), but works on a
// plain surface too.
export function IconButton({ icon, label, className = "", ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-pill bg-overlay text-ink-foreground backdrop-blur-sm transition-colors hover:bg-ink/60 ${className}`}
      {...props}
    >
      <span className="h-5 w-5">{icon}</span>
    </button>
  );
}
