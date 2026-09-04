import type { Metadata } from "next";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "Admin dashboard — Offroading",
  robots: { index: false, follow: false },
};

// Shell only — this ticket (14) proves a seeded admin can reach it.
// Ticket 15 (CSV mapping upload) and ticket 16 (mapping + reports views)
// fill in the actual content.
export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-heading text-ink">Admin dashboard</h1>
          <p className="text-body text-muted">Offroading</p>
        </div>
        <LogoutButton />
      </header>
    </div>
  );
}
