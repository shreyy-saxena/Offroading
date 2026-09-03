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

// The flow/wizard shell ticket 07 adds steps to. "next" is a placeholder
// that ticket 07 replaces with the reporter-type / log-or-email branch.
export type FlowState =
  | { step: "photo" }
  | { step: "location"; photo: CapturedPhoto }
  | { step: "locality"; photo: CapturedPhoto; location: LocationResult }
  | {
      step: "next";
      photo: CapturedPhoto;
      location: LocationResult;
      localityInfo: ConfirmedLocality;
    };
