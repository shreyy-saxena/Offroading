"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadMappingAction, type UploadMappingResult } from "./mapping-actions";

// PRD Section 6 Step 2 ("Upload mapping") — this ticket's own
// success/error UI. MappingTable/ReportsTable (ticket 16) are separate
// Server Components rendered once at page load; router.refresh() below
// is what makes ticket 15's "the read-only view reflects it immediately"
// acceptance criterion literally true, rather than needing a manual
// reload after a successful upload.
export function UploadMappingSection() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UploadMappingResult | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setResult(null);
    try {
      const csvText = await file.text();
      const outcome = await uploadMappingAction(csvText);
      setResult(outcome);
      if (outcome.outcome === "replaced") {
        router.refresh();
      }
    } catch {
      setResult({ outcome: "invalid", errors: ["Something went wrong uploading the file — please try again."] });
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <div>
        <h2 className="text-body font-semibold text-ink">Upload mapping</h2>
        <p className="text-caption text-muted">
          A two-column CSV (district, authority email). Replaces the entire current mapping.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        disabled={submitting}
        className="text-body text-ink"
      />

      {submitting ? <p className="text-caption text-muted">Uploading…</p> : null}

      {result?.outcome === "replaced" ? (
        <p className="text-caption text-ink">
          Mapping replaced — {result.districtCount} district{result.districtCount === 1 ? "" : "s"}.
          {result.triggeredSends > 0
            ? ` ${result.triggeredSends} previously queued report${result.triggeredSends === 1 ? "" : "s"} sent.`
            : ""}
        </p>
      ) : null}

      {result?.outcome === "invalid" ? (
        <ul className="flex flex-col gap-1 text-caption text-red-600">
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
