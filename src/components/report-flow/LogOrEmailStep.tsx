"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitLoggedReportAction } from "@/app/actions/submit-report";
import { CtaButton } from "@/components/ui/CtaButton";
import { trackEvent } from "@/lib/analytics/mixpanel";
import { isOffline, OFFLINE_MESSAGE } from "@/lib/offline";
import { clearDraft } from "./draft-store";
import type { BaseReportInput } from "./types";

type LogOrEmailStepProps = {
  reportInput: BaseReportInput;
  onChooseEmail: () => void;
};

// PRD Section 5, Step 6. "Just log it" is terminal here (FR3: always
// saved, `email_delivery_status = 'not_applicable'`, no contact fields
// ever touched) — "Email the authorities" hands off into ticket 08's
// contact-details step instead.
export function LogOrEmailStep({ reportInput, onChooseEmail }: LogOrEmailStepProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJustLogIt() {
    if (isOffline()) {
      setError(OFFLINE_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitLoggedReportAction(reportInput);
      if (result.outcome === "rate-limited") {
        setError(result.message);
        setSubmitting(false);
        return;
      }
      trackEvent("report_logged");
      await clearDraft();
      router.push("/feed");
    } catch {
      setError(isOffline() ? OFFLINE_MESSAGE : "Something went wrong saving your report — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col justify-center gap-6 px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-heading text-ink">Log it, or email the authorities too?</h1>
        <p className="text-body text-muted">
          Your report is saved either way — emailing sends it directly to the district authority
          as well.
        </p>
      </header>
      {error ? <p className="text-body text-red-600">{error}</p> : null}
      <div className="flex flex-col gap-3">
        <CtaButton onClick={handleJustLogIt} disabled={submitting}>
          {submitting ? "Saving…" : "Just log it"}
        </CtaButton>
        <CtaButton onClick={onChooseEmail} disabled={submitting}>
          Email the authorities
        </CtaButton>
      </div>
    </div>
  );
}
