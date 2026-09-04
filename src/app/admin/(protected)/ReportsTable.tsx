import { listAdminReports } from "@/lib/admin/reports";
import { ReportsTableClient } from "./ReportsTableClient";

// PRD Section 6 Step 2 ("View reports") — includes fields never shown on
// the public feed (ticket 11): reporter contact details and delivery
// diagnostics (FR4). A plain Server Component data read reached only
// through the (protected) layout's render tree — not a Server Action, so
// the layout's admin check already covers it. Selection/delete (a later
// revision — reverses ticket 16's original "no moderation/deletion
// controls" non-goal, per explicit request) needs interactivity, so
// that part is a client component below.
export async function ReportsTable() {
  const reports = await listAdminReports();
  return <ReportsTableClient reports={reports} />;
}
