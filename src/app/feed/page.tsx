import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { PhotoCard } from "@/components/ui/PhotoCard";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { formatSubmittedAt } from "@/lib/reports/format";
import { listPublicReports } from "@/lib/reports/public-feed";
import { getSiteOrigin } from "@/lib/site-url";

// Uncached: report submissions (ticket 08) should show up on the very
// next feed load, not after a stale-fetch window.
export const dynamic = "force-dynamic";

// PRD Section 7 — no-login feed of all reports. This is also the exit
// destination from the hero screen's close button (ticket 05), the
// landing page after every submission (ticket 08) — which is also PRD
// 13.1's "post-submit confirmation," since there's no separate
// confirmation screen — and each card carries its own share options
// (ticket 13) without requiring the permalink (ticket 12) to be opened
// first.
export default async function FeedPage() {
  const [reports, siteOrigin] = await Promise.all([listPublicReports(), getSiteOrigin()]);

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
            // "Stretched link" pattern, not PhotoCard-wrapped-in-Link:
            // ShareButtons renders real interactive elements (an <a> and
            // a <button>) in the overlay, and a button/anchor nested
            // inside another anchor is invalid HTML. Both this Link and
            // the overlay's z-10 share the same explicit z-index on
            // purpose — position:relative descendants without their own
            // z-index (PhotoCard's internal wrappers) still compete in
            // this tier, and ties break by DOM order, so anything not
            // explicitly stacked here would otherwise win by being
            // rendered later. At equal z-10, the share buttons (rendered
            // after this Link, deeper in PhotoCard) win that tiebreak —
            // exactly what's needed: clicks land on the buttons where
            // they are, and on this Link everywhere else on the card.
            <div key={report.id} className="relative">
              <Link
                href={`/reports/${report.id}`}
                aria-label={`View report: ${report.locality}, ${report.district}`}
                className="absolute inset-0 z-10"
              />
              <PhotoCard
                src={report.photoUrl}
                alt=""
                overlay={
                  <div className="relative z-10 flex justify-end">
                    <ShareButtons
                      url={`${siteOrigin}/reports/${report.id}`}
                      locality={report.locality}
                      district={report.district}
                    />
                  </div>
                }
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
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
