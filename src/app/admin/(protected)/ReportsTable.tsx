import { listAdminReports } from "@/lib/admin/reports";
import { formatSubmittedAt } from "@/lib/reports/format";

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

// PRD Section 6 Step 2 ("View reports") — includes fields never shown on
// the public feed (ticket 11): reporter contact details and email
// delivery status/error detail (FR4). No retry, edit, or delete control
// anywhere here — explicit non-goal (ticket 16 scope).
export async function ReportsTable() {
  const reports = await listAdminReports();

  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <h2 className="text-body font-semibold text-ink">Reports</h2>

      {reports.length === 0 ? (
        <p className="text-caption text-muted">No reports yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-caption">
            <thead>
              <tr className="text-muted">
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
