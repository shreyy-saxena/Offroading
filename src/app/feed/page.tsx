// Stub for ticket 11 (public feed). Exists now so the hero screen's close
// button (ticket 05) has a real route to navigate to, per that ticket's
// explicit allowance to route to a placeholder rather than block on 11.
export default function FeedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-subheading text-ink">Public feed</p>
      <p className="text-body text-muted">Coming in ticket 11.</p>
    </div>
  );
}
