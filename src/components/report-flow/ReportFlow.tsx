"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactDetailsStep } from "./ContactDetailsStep";
import { LocalityStep } from "./LocalityStep";
import { LocationStep } from "./LocationStep";
import { LogOrEmailStep } from "./LogOrEmailStep";
import { loadDraft, saveDraft, type PersistableFlowState } from "./draft-store";
import { MissingMappingStep } from "./MissingMappingStep";
import { PhotoStep } from "./PhotoStep";
import { ReporterTypeStep } from "./ReporterTypeStep";
import { toBaseReportInput } from "./types";
import type { FlowState } from "./types";

// Wizard shell. Every terminal step (ticket 08's three submission
// actions) redirects to the public feed itself — nothing in FlowState
// exists past "contact"/"missingMapping". In-progress state beyond the
// initial "photo" step is also persisted to IndexedDB (ticket 10) so a
// dropped connection or accidental reload doesn't lose it; each terminal
// step clears the draft on a successful save.
export function ReportFlow() {
  const router = useRouter();
  const [state, setState] = useState<FlowState>({ step: "photo" });
  const [resumableDraft, setResumableDraft] = useState<PersistableFlowState | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDraft().then((draft) => {
      if (!cancelled && draft) setResumableDraft(draft);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.step === "photo") return;
    saveDraft(state);
  }, [state]);

  const handleClose = useCallback(() => {
    router.push("/feed");
  }, [router]);

  const handleResume = useCallback(() => {
    if (!resumableDraft) return;
    setState(resumableDraft);
    setResumableDraft(null);
  }, [resumableDraft]);

  if (state.step === "photo") {
    return (
      <PhotoStep
        onClose={handleClose}
        onCaptured={(photo) => setState({ step: "location", photo })}
        hasResumableDraft={resumableDraft !== null}
        onResume={handleResume}
      />
    );
  }

  if (state.step === "location") {
    const { photo } = state;
    return (
      <LocationStep onResolved={(location) => setState({ step: "locality", photo, location })} />
    );
  }

  if (state.step === "locality") {
    const { photo, location } = state;
    return (
      <LocalityStep
        location={location}
        onConfirmed={(localityInfo) => setState({ step: "reporterType", photo, location, localityInfo })}
      />
    );
  }

  if (state.step === "reporterType") {
    const { photo, location, localityInfo } = state;
    return (
      <ReporterTypeStep
        onSelected={(reporterType) =>
          setState({ step: "logOrEmail", photo, location, localityInfo, reporterType })
        }
      />
    );
  }

  if (state.step === "logOrEmail") {
    return (
      <LogOrEmailStep
        reportInput={toBaseReportInput(state)}
        onChooseEmail={() => setState({ ...state, step: "contact" })}
      />
    );
  }

  if (state.step === "contact") {
    return (
      <ContactDetailsStep
        reportInput={toBaseReportInput(state)}
        initialContact={state.draftContact}
        onDraftChange={(draftContact) => setState({ ...state, draftContact })}
        onNeedsMappingResolution={(contact) => setState({ ...state, step: "missingMapping", contact })}
      />
    );
  }

  return <MissingMappingStep reportInput={toBaseReportInput(state)} contact={state.contact} />;
}
