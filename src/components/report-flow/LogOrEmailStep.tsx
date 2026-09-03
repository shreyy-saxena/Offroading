"use client";

import { CtaButton } from "@/components/ui/CtaButton";
import type { EmailChoice } from "./types";

type LogOrEmailStepProps = {
  onChoice: (choice: EmailChoice) => void;
};

// PRD Section 5, Step 6 — the report is saved either way (FR3); "log"
// never asks for contact details, "email" continues into ticket 08.
export function LogOrEmailStep({ onChoice }: LogOrEmailStepProps) {
  return (
    <div className="flex min-h-svh flex-col justify-center gap-6 px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-heading text-ink">Log it, or email the authorities too?</h1>
        <p className="text-body text-muted">
          Your report is saved either way — emailing sends it directly to the district authority
          as well.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        <CtaButton onClick={() => onChoice("log")}>Just log it</CtaButton>
        <CtaButton onClick={() => onChoice("email")}>Email the authorities</CtaButton>
      </div>
    </div>
  );
}
