import { BottomNav } from "@/components/ui/BottomNav";
import { PhotoCard } from "@/components/ui/PhotoCard";
import { listPublicReports } from "@/lib/reports/public-feed";

// Uncached: report submissions (ticket 08) should show up on the very
// next feed load, not after a stale-fetch window.
export const dynamic = "force-dynamic";

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// PRD Section 7 — no-login feed of all reports. This is also the exit
// destination from the hero screen's close button (ticket 05) and the
// landing page after every submission (ticket 08).
export default async function FeedPage() {
  const reports = await listPublicReports();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8 pb-28">
      <header>
        <h1 className="text-heading text-ink">Reports</h1>
        <p className="text-body text-muted">Potholes reported by citizens.</p>
      </header>

      {reports.length === 0 ? (
        <p className="text-body text-muted">No reports yet — be the first to report one.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <PhotoCard
              key={report.id}
              src={report.photoUrl}
              alt=""
              footer={
                <div>
                  <p className="text-body text-ink">
                    {report.locality}, {report.district}
                  </p>
                  <p className="text-caption text-muted">
                    {report.reporterType === "resident" ? "Resident" : "Passer-by"} ·{" "}
                    {formatSubmittedAt(report.createdAt)}
                  </p>
                </div>
              }
            />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
