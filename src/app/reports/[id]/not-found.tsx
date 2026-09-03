import Link from "next/link";

// Ticket 12: an unknown or malformed report id renders this instead of
// Next's generic default — still a clean 404, no internals leaked.
// A plain styled <a> (via Link), not a <button> nested inside it — a
// button-inside-anchor isn't valid nested interactive content.
export default function ReportNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-subheading text-ink">Report not found</p>
      <p className="text-body text-muted">
        This report doesn&apos;t exist, or the link is incorrect.
      </p>
      <Link
        href="/feed"
        className="w-full max-w-xs rounded-pill bg-ink px-6 py-4 text-body font-semibold text-ink-foreground transition-opacity hover:opacity-90"
      >
        Back to the feed
      </Link>
    </div>
  );
}
