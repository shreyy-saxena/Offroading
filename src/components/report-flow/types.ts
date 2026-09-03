import type { LocalityCandidate } from "@/lib/locality/resolve-candidates";
import type { BaseReportInput, ContactDetails, ReporterType } from "@/lib/reports/submit-report";

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

export type { BaseReportInput, ContactDetails, ReporterType };

// Shapes the flow's accumulated per-step state into the flat input every
// submission action (ticket 08) takes.
export function toBaseReportInput(state: {
  photo: CapturedPhoto;
  location: LocationResult;
  localityInfo: ConfirmedLocality;
  reporterType: ReporterType;
}): BaseReportInput {
  return {
    photoUrl: state.photo.publicUrl,
    latitude: state.location.status === "granted" ? state.location.latitude : null,
    longitude: state.location.status === "granted" ? state.location.longitude : null,
    locality: state.localityInfo.locality,
    district: state.localityInfo.district,
    reporterType: state.reporterType,
  };
}

// The flow/wizard shell. Every terminal step (submitLoggedReportAction /
// submitEmailReportAction / resolveMissingMappingAction, ticket 08)
// redirects to the public feed itself rather than transitioning to a
// further FlowState step — there's nothing after submission in-app.
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
      step: "contact";
      photo: CapturedPhoto;
      location: LocationResult;
      localityInfo: ConfirmedLocality;
      reporterType: ReporterType;
      // As-entered contact fields (ticket 10: persisted so a dropped
      // connection mid-typing doesn't lose them) — only ever committed
      // to a real submission via the form's own onSubmit.
      draftContact?: ContactDetails;
    }
  | {
      step: "missingMapping";
      photo: CapturedPhoto;
      location: LocationResult;
      localityInfo: ConfirmedLocality;
      reporterType: ReporterType;
      contact: ContactDetails;
    };
