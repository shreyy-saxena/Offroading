import type { LocalityCandidate } from "@/lib/locality/resolve-candidates";

export type CapturedPhoto = {
  file: File;
  previewUrl: string;
  publicUrl: string;
  path: string;
};

export type LocationResult =
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "unavailable" };

// Same shape as a suggested candidate — a confirmed locality is either
// a picked candidate or a manually typed one with an explicit district.
export type ConfirmedLocality = LocalityCandidate;

export type ReporterType = "passerby" | "resident";
export type EmailChoice = "log" | "email";

// The flow/wizard shell ticket 08 adds steps to. "next" is a placeholder
// that ticket 08 replaces with the contact-details step (email path) /
// actual submission (both paths converge there).
export type FlowState =
  | { step: "photo" }
  | { step: "location"; photo: CapturedPhoto }
  | { step: "locality"; photo: CapturedPhoto; location: LocationResult }
  | {
      step: "reporterType";
      photo: CapturedPhoto;
      location: LocationResult;
      localityInfo: ConfirmedLocality;
    }
  | {
      step: "logOrEmail";
      photo: CapturedPhoto;
      location: LocationResult;
      localityInfo: ConfirmedLocality;
      reporterType: ReporterType;
    }
  | {
      step: "next";
      photo: CapturedPhoto;
      location: LocationResult;
      localityInfo: ConfirmedLocality;
      reporterType: ReporterType;
      emailChoice: EmailChoice;
    };
