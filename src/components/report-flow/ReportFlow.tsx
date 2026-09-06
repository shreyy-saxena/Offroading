"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactDetailsStep } from "./ContactDetailsStep";
import { LocalityStep } from "./LocalityStep";
import { LocationStep } from "./LocationStep";
import { LogOrEmailStep } from "./LogOrEmailStep";
import { loadDraft, saveDraft, type PersistableFlowState } from "./draft-store";
import { MissingMappingStep } from "./MissingMappingStep";
import { Logo } from "@/components/ui/Logo";
import { hasSeenOnboarding, markOnboardingSeen } from "./onboarding-store";
import { OnboardingCarousel } from "./OnboardingCarousel";
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
  // Starts "checking" on both server and client (localStorage doesn't exist
  // during SSR) — same hydration-mismatch avoidance as PhotoStep's
  // cameraState. The effect below resolves it right after mount.
  const [onboardingState, setOnboardingState] = useState<"checking" | "show" | "done">("checking");

  useEffect(() => {
    // Same justified exception as PhotoStep's cameraState: this *is* the
    // client-only check (localStorage) that a useState initializer can't
    // safely do during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnboardingState(hasSeenOnboarding() ? "done" : "show");
  }, []);

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

  if (onboardingState !== "done") {
    if (onboardingState === "show") {
      return (
        <OnboardingCarousel
          onComplete={() => {
            markOnboardingSeen();
            setOnboardingState("done");
          }}
        />
      );
    }
    return null;
  }

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

  let stepContent: React.ReactNode;

  if (state.step === "location") {
    const { photo } = state;
    stepContent = (
      <LocationStep onResolved={(location) => setState({ step: "locality", photo, location })} />
    );
  } else if (state.step === "locality") {
    const { photo, location } = state;
    stepContent = (
      <LocalityStep
        location={location}
        onConfirmed={(localityInfo) => setState({ step: "reporterType", photo, location, localityInfo })}
      />
    );
  } else if (state.step === "reporterType") {
    const { photo, location, localityInfo } = state;
    stepContent = (
      <ReporterTypeStep
        onSelected={(reporterType) =>
          setState({ step: "logOrEmail", photo, location, localityInfo, reporterType })
        }
      />
    );
  } else if (state.step === "logOrEmail") {
    stepContent = (
      <LogOrEmailStep
        reportInput={toBaseReportInput(state)}
        onChooseEmail={() => setState({ ...state, step: "contact" })}
      />
    );
  } else if (state.step === "contact") {
    stepContent = (
      <ContactDetailsStep
        reportInput={toBaseReportInput(state)}
        initialContact={state.draftContact}
        onDraftChange={(draftContact) => setState({ ...state, draftContact })}
        onNeedsMappingResolution={(contact) => setState({ ...state, step: "missingMapping", contact })}
      />
    );
  } else {
    stepContent = <MissingMappingStep reportInput={toBaseReportInput(state)} contact={state.contact} />;
  }

  // Every step past the camera gets the brand mark in the corner — the
  // camera (PhotoStep, returned above) is the one screen it's deliberately
  // left off, per product decision (it's a full-bleed viewfinder).
  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <Logo />
      </div>
      {stepContent}
    </div>
  );
}
