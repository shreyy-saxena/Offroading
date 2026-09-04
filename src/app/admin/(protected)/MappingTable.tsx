import { listStateMapping } from "@/lib/admin/state-mapping";

// PRD Section 6 Step 2 ("View current mapping") — read-only, reflects
// ticket 15's uploads immediately since this is a fresh Server Component
// read on every request, no caching.
export async function MappingTable() {
  const mapping = await listStateMapping();

  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <h2 className="text-body font-semibold text-ink">Current mapping</h2>

      {mapping.length === 0 ? (
        <p className="text-caption text-muted">No mapping uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-caption">
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-4 font-medium">State</th>
                <th className="py-1 font-medium">Authority email(s)</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((entry) => (
                <tr key={entry.state} className="border-t border-hairline">
                  <td className="py-2 pr-4 text-ink">{entry.state}</td>
                  <td className="py-2 text-ink">{entry.authorityEmails.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
