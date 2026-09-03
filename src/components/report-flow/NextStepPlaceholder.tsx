import type { CapturedPhoto, ConfirmedLocality } from "./types";

type NextStepPlaceholderProps = {
  photo: CapturedPhoto;
  localityInfo: ConfirmedLocality;
};

// Stand-in for ticket 07 (reporter type / log-or-email branch) — exists
// so this ticket's wizard shell has somewhere to hand off to, carrying
// the confirmed locality/district state ticket 07 will pick up.
export function NextStepPlaceholder({ photo, localityInfo }: NextStepPlaceholderProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview carried over from the photo step */}
      <img src={photo.previewUrl} alt="" className="h-40 w-40 rounded-card object-cover" />
      <p className="text-body text-ink">
        {localityInfo.locality}, {localityInfo.district}
      </p>
      <p className="text-caption text-muted">Reporter type &amp; submission coming in ticket 07.</p>
    </div>
  );
}
