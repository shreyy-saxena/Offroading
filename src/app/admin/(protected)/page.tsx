import type { Metadata } from "next";
import { LogoutButton } from "./LogoutButton";
import { UploadMappingSection } from "./UploadMappingSection";

export const metadata: Metadata = {
  title: "Admin dashboard — Offroading",
  robots: { index: false, follow: false },
};

// PRD Section 6 Step 2 — one dashboard, three sections: upload mapping
// (ticket 15, below), view current mapping + view reports (ticket 16,
// not yet built).
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

      <UploadMappingSection />
    </div>
  );
}
