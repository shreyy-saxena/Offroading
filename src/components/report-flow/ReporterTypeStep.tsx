"use client";

import { CtaButton } from "@/components/ui/CtaButton";
import type { ReporterType } from "./types";

type ReporterTypeStepProps = {
  onSelected: (reporterType: ReporterType) => void;
};

// PRD Section 5, Step 5 — shown on the public feed alongside the report.
export function ReporterTypeStep({ onSelected }: ReporterTypeStepProps) {
  return (
    <div className="flex min-h-svh flex-col justify-center gap-6 px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-heading text-ink">Are you a passer-by or a resident?</h1>
        <p className="text-body text-muted">This shows up on your report in the public feed.</p>
      </header>
      <div className="flex flex-col gap-3">
        <CtaButton onClick={() => onSelected("passerby")}>Passer-by</CtaButton>
        <CtaButton onClick={() => onSelected("resident")}>Resident of this area</CtaButton>
      </div>
    </div>
  );
}
