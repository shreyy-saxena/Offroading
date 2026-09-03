"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LocalityStep } from "./LocalityStep";
import { LocationStep } from "./LocationStep";
import { LogOrEmailStep } from "./LogOrEmailStep";
import { NextStepPlaceholder } from "./NextStepPlaceholder";
import { PhotoStep } from "./PhotoStep";
import { ReporterTypeStep } from "./ReporterTypeStep";
import type { FlowState } from "./types";

// Wizard shell (ticket 05) — ticket 08 adds steps after "next".
// In-progress state lives in memory only; IndexedDB persistence is
// ticket 10.
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
    const { photo, location, localityInfo, reporterType } = state;
    return (
      <LogOrEmailStep
        onChoice={(emailChoice) =>
          setState({ step: "next", photo, location, localityInfo, reporterType, emailChoice })
        }
      />
    );
  }

  return (
    <NextStepPlaceholder
      photo={state.photo}
      localityInfo={state.localityInfo}
      reporterType={state.reporterType}
      emailChoice={state.emailChoice}
    />
  );
}
