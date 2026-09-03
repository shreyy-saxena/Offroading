"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitEmailReportAction } from "@/app/actions/submit-report";
import { CtaButton } from "@/components/ui/CtaButton";
import type { BaseReportInput, ContactDetails } from "./types";

type ContactDetailsStepProps = {
  reportInput: BaseReportInput;
  onNeedsMappingResolution: (contact: ContactDetails) => void;
};

const inputClassName = "rounded-card border border-hairline bg-surface px-4 py-3 text-body text-ink";

// PRD Section 5, Step 7 — only reached via the "Email the authorities"
// branch (ticket 07). District-mapping resolution and the actual send
// happen server-side (submitEmailReportAction); this step only collects
// the three fields and reacts to the result.
export function ContactDetailsStep({ reportInput, onNeedsMappingResolution }: ContactDetailsStepProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const contact = { name: name.trim(), mobile: mobile.trim(), email: email.trim() };
    try {
      const result = await submitEmailReportAction(reportInput, contact);
      if (result.outcome === "needs-mapping-resolution") {
        onNeedsMappingResolution(contact);
        return;
      }
      router.push("/feed");
    } catch {
      setError("Something went wrong saving your report — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-svh flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-heading text-ink">Your contact details</h1>
        <p className="text-body text-muted">
          Shared with the district authority alongside your report — never shown publicly.
        </p>
      </header>

      {error ? <p className="text-body text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Name</span>
          <input
            required
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Mobile number</span>
          <input
            required
            type="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Email address</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      <CtaButton type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Submit"}
      </CtaButton>
    </form>
  );
}
