import type { ButtonHTMLAttributes } from "react";

type PillChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

// Pill filter/segmented chip (PRD 14.3) — active vs. inactive state.
// Used by feed filters (ticket 11) and admin dashboard tabs (ticket 16).
export function PillChip({ active = false, className = "", children, ...props }: PillChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-pill px-4 py-2 text-body font-medium transition-colors ${
        active
          ? "bg-ink text-ink-foreground"
          : "border border-hairline bg-surface text-muted hover:text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
