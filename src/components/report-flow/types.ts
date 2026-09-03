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

// The flow/wizard shell ticket 06-08 add steps to. Ticket 05 implements
// "photo" and "location" for real; "next" is a placeholder that later
// tickets replace with locality confirmation (ticket 06).
export type FlowState =
  | { step: "photo" }
  | { step: "location"; photo: CapturedPhoto }
  | { step: "next"; photo: CapturedPhoto; location: LocationResult };
