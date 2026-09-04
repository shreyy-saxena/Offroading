import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { PhotoCard } from "@/components/ui/PhotoCard";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { formatSubmittedAt } from "@/lib/reports/format";
import { getPublicReportById } from "@/lib/reports/public-feed";
import { getReportPermalinkUrl } from "@/lib/site-url";

type ReportPageProps = { params: Promise<{ id: string }> };

function reportTitle(report: { locality: string; district: string }): string {
  return `Pothole reported in ${report.locality}, ${report.district}`;
}

function reporterLabel(reporterType: string): string {
  return reporterType === "resident" ? "Resident" : "Passer-by";
}

// PRD Section 13.3 / FR10 — public permalink, same fields and privacy
// boundary as the feed (ticket 11), plus OG/Twitter Card metadata so the
// link unfurls with the photo (Section 13.4, ticket 13's share targets).
export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getPublicReportById(id);
  if (!report) return {};

  const title = reportTitle(report);
  const description = `Reported by a ${reporterLabel(report.reporterType).toLowerCase()} · ${formatSubmittedAt(report.createdAt)}`;
  const url = await getReportPermalinkUrl(report.id);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: report.photoUrl }],
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [report.photoUrl],
    },
  };
}

export default async function ReportPermalinkPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getPublicReportById(id);
  if (!report) notFound();
  const permalinkUrl = await getReportPermalinkUrl(report.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8 pb-28">
      <PhotoCard
        src={report.photoUrl}
        alt=""
        overlay={
          <div className="flex justify-end">
            <ShareButtons url={permalinkUrl} locality={report.locality} district={report.district} />
          </div>
        }
        footer={
          <div>
            <p className="text-body text-ink">
              {report.locality}, {report.district}
            </p>
            <p className="text-caption text-muted">
              {reporterLabel(report.reporterType)} · {formatSubmittedAt(report.createdAt)}
            </p>
          </div>
        }
      />
      <BottomNav />
    </div>
  );
}
