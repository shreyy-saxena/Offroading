"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LocalityStep } from "./LocalityStep";
import { LocationStep } from "./LocationStep";
import { NextStepPlaceholder } from "./NextStepPlaceholder";
import { PhotoStep } from "./PhotoStep";
import type { FlowState } from "./types";

// Wizard shell (ticket 05) — ticket 07 adds steps after "next".
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
        onConfirmed={(localityInfo) => setState({ step: "next", photo, location, localityInfo })}
      />
    );
  }

  return <NextStepPlaceholder photo={state.photo} localityInfo={state.localityInfo} />;
}
