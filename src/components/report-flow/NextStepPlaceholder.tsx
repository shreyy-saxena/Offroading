import type { CapturedPhoto, LocationResult } from "./types";

type NextStepPlaceholderProps = {
  photo: CapturedPhoto;
  location: LocationResult;
};

// Stand-in for ticket 06 (locality confirmation) — exists so this ticket's
// wizard shell has somewhere to hand off to, carrying the photo/location
// state ticket 06 will pick up.
export function NextStepPlaceholder({ photo, location }: NextStepPlaceholderProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview carried over from the photo step */}
      <img src={photo.previewUrl} alt="" className="h-40 w-40 rounded-card object-cover" />
      <p className="text-body text-ink">
        {location.status === "granted"
          ? `Location captured (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
          : "We'll ask you to search for your locality manually."}
      </p>
      <p className="text-caption text-muted">Locality confirmation coming in ticket 06.</p>
    </div>
  );
}
