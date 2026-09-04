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
//
// Picking a file and committing it are two separate steps (Upload/
// Re-upload vs. Save) — a replace-the-entire-mapping upload is
// consequential enough that an admin should be able to pick a file,
// see which one they picked, and only then confirm the send, rather
// than triggering the backend call the instant the file picker closes.
export function UploadMappingSection() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UploadMappingResult | null>(null);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setResult(null);
    // Reset so picking the same file again still fires this handler —
    // the browser won't otherwise treat an unchanged value as a change.
    event.target.value = "";
  }

  async function handleSave() {
    if (!selectedFile) return;

    setSubmitting(true);
    setResult(null);
    try {
      const csvText = await selectedFile.text();
      const outcome = await uploadMappingAction(csvText);
      setResult(outcome);
      if (outcome.outcome === "replaced") {
        router.refresh();
      }
    } catch {
      setResult({ outcome: "invalid", errors: ["Something went wrong uploading the file — please try again."] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <div>
        <h2 className="text-body font-semibold text-ink">Upload mapping</h2>
        <p className="text-caption text-muted">
          A CSV with state name, then one or more authority emails — extra columns and semicolons (;) both work
          for multiple emails. Choose a file, then Save to replace the current mapping — every district in a
          state routes to that state&apos;s address(es).
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        disabled={submitting}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={submitting}
          className="rounded-pill border border-hairline bg-surface px-4 py-2 text-caption font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {selectedFile ? "Re-upload" : "Upload"}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedFile || submitting}
          className="rounded-pill bg-ink px-4 py-2 text-caption font-medium text-ink-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save"}
        </button>

        {selectedFile ? <span className="text-caption text-muted">{selectedFile.name}</span> : null}
      </div>

      {result?.outcome === "replaced" ? (
        <p className="text-caption text-ink">
          Mapping replaced — {result.stateCount} state{result.stateCount === 1 ? "" : "s"}.
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
