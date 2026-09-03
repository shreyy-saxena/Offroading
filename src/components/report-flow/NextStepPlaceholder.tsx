import type { CapturedPhoto, ConfirmedLocality, EmailChoice, ReporterType } from "./types";

type NextStepPlaceholderProps = {
  photo: CapturedPhoto;
  localityInfo: ConfirmedLocality;
  reporterType: ReporterType;
  emailChoice: EmailChoice;
};

// Stand-in for ticket 08 (contact details / submission) — exists so this
// ticket's wizard shell has somewhere to hand off to, carrying every
// prior step's state forward.
export function NextStepPlaceholder({
  photo,
  localityInfo,
  reporterType,
  emailChoice,
}: NextStepPlaceholderProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview carried over from the photo step */}
      <img src={photo.previewUrl} alt="" className="h-40 w-40 rounded-card object-cover" />
      <p className="text-body text-ink">
        {localityInfo.locality}, {localityInfo.district}
      </p>
      <p className="text-body text-muted">
        {reporterType === "resident" ? "Resident" : "Passer-by"} ·{" "}
        {emailChoice === "email" ? "Emailing the authorities" : "Just logging it"}
      </p>
      <p className="text-caption text-muted">
        {emailChoice === "email"
          ? "Contact details coming in ticket 08."
          : "Submission coming in ticket 08."}
      </p>
    </div>
  );
}
