"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactDetailsStep } from "./ContactDetailsStep";
import { LocalityStep } from "./LocalityStep";
import { LocationStep } from "./LocationStep";
import { LogOrEmailStep } from "./LogOrEmailStep";
import { MissingMappingStep } from "./MissingMappingStep";
import { PhotoStep } from "./PhotoStep";
import { ReporterTypeStep } from "./ReporterTypeStep";
import { toBaseReportInput } from "./types";
import type { FlowState } from "./types";

// Wizard shell. Every terminal step (ticket 08's three submission
// actions) redirects to the public feed itself — nothing in FlowState
// exists past "contact"/"missingMapping". In-progress state lives in
// memory only; IndexedDB persistence is ticket 10.
export function ReportFlow() {
  const router = useRouter();
  const [state, setState] = useState<FlowState>({ step: "photo" });

  const handleClose = useCallback(() => {
    router.push("/feed");
  }, [router]);

  if (state.step === "photo") {
    return (
      <PhotoStep onClose={handleClose} onCaptured={(photo) => setState({ step: "location", photo })} />
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
        onNeedsMappingResolution={(contact) => setState({ ...state, step: "missingMapping", contact })}
      />
    );
  }

  return <MissingMappingStep reportInput={toBaseReportInput(state)} contact={state.contact} />;
}
