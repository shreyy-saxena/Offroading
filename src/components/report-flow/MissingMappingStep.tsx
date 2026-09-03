"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { resolveMissingMappingAction, type MissingMappingChoice } from "@/app/actions/submit-report";
import { CtaButton } from "@/components/ui/CtaButton";
import type { BaseReportInput, ContactDetails } from "./types";

type MissingMappingStepProps = {
  reportInput: BaseReportInput;
  contact: ContactDetails;
};

const inputClassName = "rounded-card border border-hairline bg-surface px-4 py-3 text-body text-ink";

// PRD Section 5, Step 8's exactly-three choices when the resolved
// district has no authority email on file yet — the report is saved
// (FR3) no matter which one is picked.
export function MissingMappingStep({ reportInput, contact }: MissingMappingStepProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providedEmail, setProvidedEmail] = useState("");

  async function resolve(choice: MissingMappingChoice) {
    setSubmitting(true);
    setError(null);
    try {
      await resolveMissingMappingAction(reportInput, contact, choice);
      router.push("/feed");
    } catch {
      setError("Something went wrong saving your report — please try again.");
      setSubmitting(false);
    }
  }

  function handleProvideEmail(event: FormEvent) {
    event.preventDefault();
    resolve({ type: "provide-email", email: providedEmail.trim() });
  }

  return (
    <div className="flex min-h-svh flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-heading text-ink">We don&apos;t have an authority email on file yet</h1>
        <p className="text-body text-muted">
          Your report is saved regardless of what you choose here — for{" "}
          <strong>{reportInput.district}</strong>.
        </p>
      </header>

      {error ? <p className="text-body text-red-600">{error}</p> : null}

      <form onSubmit={handleProvideEmail} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Send it to this email address instead</span>
          <input
            required
            type="email"
            value={providedEmail}
            onChange={(event) => setProvidedEmail(event.target.value)}
            className={inputClassName}
          />
        </label>
        <CtaButton type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send to this address"}
        </CtaButton>
      </form>

      <div className="flex flex-col gap-3">
        <CtaButton onClick={() => resolve({ type: "queue" })} disabled={submitting}>
          Queue it — email automatically once it&apos;s covered
        </CtaButton>
        <CtaButton onClick={() => resolve({ type: "cancel" })} disabled={submitting}>
          Cancel the email, just log the report
        </CtaButton>
      </div>
    </div>
  );
}
