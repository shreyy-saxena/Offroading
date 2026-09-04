import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { formatSubmittedAt } from "@/lib/reports/format";
import { listPublicReports } from "@/lib/reports/public-feed";
import { getSiteOrigin } from "@/lib/site-url";

// Uncached: report submissions (ticket 08) should show up on the very
// next feed load, not after a stale-fetch window.
export const dynamic = "force-dynamic";

function formatCoordinates(latitude: number | null, longitude: number | null): string {
  // Null for reports reached via ticket 06's manual-locality path (no
  // device GPS reading exists) — never faked as 0,0.
  if (latitude === null || longitude === null) return "—";
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

// PRD Section 7 — no-login feed of all reports. This is also the exit
// destination from the hero screen's close button (ticket 05), the
// landing page after every submission (ticket 08) — which is also PRD
// 13.1's "post-submit confirmation," since there's no separate
// confirmation screen — and each row carries its own share options
// (ticket 13) without requiring the permalink (ticket 12) to be opened
// first. A list/table, not photo-led tiles, per a later revision — the
// photo itself is one tap away via "View", not shown inline.
export default async function FeedPage() {
  const [reports, siteOrigin] = await Promise.all([listPublicReports(), getSiteOrigin()]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 pb-28">
      <header>
        <h1 className="text-heading text-ink">Reports</h1>
        <p className="text-body text-muted">Potholes reported by citizens.</p>
      </header>

      {reports.length === 0 ? (
        <p className="text-body text-muted">No reports yet — be the first to report one.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
          <table className="w-full min-w-[48rem] text-left text-caption">
            <thead>
              <tr className="text-muted">
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Coordinates</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-hairline align-top">
                  <td className="px-4 py-3 text-ink">
                    <Link href={`/reports/${report.id}`} className="font-medium underline-offset-4 hover:underline">
                      {report.locality}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{report.district}</td>
                  <td className="px-4 py-3 text-ink">{formatCoordinates(report.latitude, report.longitude)}</td>
                  <td className="px-4 py-3 text-ink">
                    {report.reporterType === "resident" ? "Resident" : "Passer-by"}
                  </td>
                  <td className="px-4 py-3 text-ink">{formatSubmittedAt(report.createdAt)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={report.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline-offset-4 hover:underline"
                    >
                      View
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <ShareButtons
                      url={`${siteOrigin}/reports/${report.id}`}
                      locality={report.locality}
                      district={report.district}
                      showLabels
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
