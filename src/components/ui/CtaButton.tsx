import type { ButtonHTMLAttributes } from "react";

type CtaButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

// Full-width rounded black CTA button (PRD 14.3) — primary actions across
// the app (e.g. "Submit report", "Send complaint").
export function CtaButton({ className = "", children, type = "button", ...props }: CtaButtonProps) {
  return (
    <button
      type={type}
      className={`w-full rounded-pill bg-ink px-6 py-4 text-body font-semibold text-ink-foreground transition-opacity hover:opacity-90 disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
