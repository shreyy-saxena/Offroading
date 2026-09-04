"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminReport } from "@/lib/admin/reports";
import { formatSubmittedAt } from "@/lib/reports/format";
import { deleteReportsAction } from "./reports-actions";

type ReportsTableClientProps = {
  reports: AdminReport[];
};

function statusLabel(status: string): string {
  switch (status) {
    case "not_applicable":
      return "Not applicable";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "queued":
      return "Queued";
    default:
      return status;
  }
}

// PRD Section 6 Step 2 ("View reports") + a later revision adding
// selection/delete (reverses ticket 16's original "no moderation/deletion
// controls" non-goal, per explicit request). Deletion is irreversible —
// confirmed before the action ever runs, and the action itself
// re-checks admin status independently of this page's layout guard
// (src/app/admin/(protected)/reports-actions.ts).
export function ReportsTableClient({ reports }: ReportsTableClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = reports.length > 0 && selected.size === reports.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(reports.map((r) => r.id)));
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${ids.length} report${ids.length === 1 ? "" : "s"}? This cannot be undone — the report${
        ids.length === 1 ? "" : "s"
      } and photo${ids.length === 1 ? "" : "s"} will be permanently removed.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteReportsAction(ids);
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Something went wrong deleting the selected reports — please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-body font-semibold text-ink">Reports</h2>
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="rounded-pill bg-red-600 px-4 py-2 text-caption font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {deleting ? "Deleting…" : `Delete selected (${selected.size})`}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-caption text-red-600">{error}</p> : null}

      {reports.length === 0 ? (
        <p className="text-caption text-muted">No reports yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-caption">
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-2 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Select all reports"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-1 pr-4 font-medium">Locality / district</th>
                <th className="py-1 pr-4 font-medium">Reporter</th>
                <th className="py-1 pr-4 font-medium">Contact</th>
                <th className="py-1 pr-4 font-medium">Submitted</th>
                <th className="py-1 font-medium">Email status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-hairline align-top">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      aria-label={`Select report in ${report.locality}, ${report.district}`}
                      checked={selected.has(report.id)}
                      onChange={() => toggleOne(report.id)}
                    />
                  </td>
                  <td className="py-2 pr-4 text-ink">
                    {report.locality}, {report.district}
                  </td>
                  <td className="py-2 pr-4 text-ink">
                    {report.reporterType === "resident" ? "Resident" : "Passer-by"}
                    {report.reporterName ? <div className="text-muted">{report.reporterName}</div> : null}
                  </td>
                  <td className="py-2 pr-4 text-ink">
                    {report.reporterMobile ? <div>{report.reporterMobile}</div> : null}
                    {report.reporterEmail ? <div>{report.reporterEmail}</div> : null}
                    {!report.reporterMobile && !report.reporterEmail ? <span className="text-muted">—</span> : null}
                  </td>
                  <td className="py-2 pr-4 text-ink">{formatSubmittedAt(report.createdAt)}</td>
                  <td className="py-2 text-ink">
                    {statusLabel(report.emailDeliveryStatus)}
                    {report.emailErrorDetail ? (
                      <div className="text-red-600">{report.emailErrorDetail}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
