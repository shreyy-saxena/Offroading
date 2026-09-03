"use client";

import { useEffect, useRef, useState } from "react";
import type { LocationResult } from "./types";

type LocationStepProps = {
  onResolved: (location: LocationResult) => void;
};

// PRD Section 5, Step 3: GPS is requested automatically, immediately
// after the photo step — no button to tap. Denial/unavailability hands
// off to ticket 06's manual search rather than dead-ending here.
export function LocationStep({ onResolved }: LocationStepProps) {
  // Lazy initializer: this step only ever mounts after a client-side flow
  // transition (initial state is always "photo"), so it's safe to read
  // `navigator` here — but computing it lazily rather than at module
  // scope keeps that guarantee local to this component instead of
  // depending on the rest of the file never changing that invariant.
  const [geolocationSupported] = useState(() => "geolocation" in navigator);
  const [message] = useState(
    geolocationSupported ? "Getting your location…" : "Location isn't available in this browser.",
  );
  const onResolvedRef = useRef(onResolved);

  useEffect(() => {
    onResolvedRef.current = onResolved;
  });

  useEffect(() => {
    if (!geolocationSupported) {
      onResolvedRef.current({ status: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onResolvedRef.current({
          status: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        onResolvedRef.current({
          status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        });
      },
    );
    // geolocationSupported is stable for this component's lifetime
    // (lazy-initialized once) — this still only runs once per mount.
  }, [geolocationSupported]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-body text-ink">{message}</p>
    </div>
  );
}
