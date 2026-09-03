"use client";

import { useRef, useState } from "react";
import { uploadReportPhotoAction } from "@/app/actions/report-photo";
import { CtaButton } from "@/components/ui/CtaButton";
import { IconButton } from "@/components/ui/IconButton";
import { CloseIcon } from "@/components/ui/icons";
import type { CapturedPhoto } from "./types";

type PhotoStepProps = {
  onCaptured: (photo: CapturedPhoto) => void;
  onClose: () => void;
  // ticket 10: an abandoned draft is offered, never forced — the normal
  // capture buttons below stay fully usable either way, so a stale draft
  // never blocks starting a fresh report from this screen.
  hasResumableDraft?: boolean;
  onResume?: () => void;
};

// Hero screen (PRD Section 5, Steps 1-2 / FR11): opening the app *is*
// this screen — no landing menu precedes it. Dark background on purpose:
// the ticket describes the close button as sitting "over the photo/camera
// view," i.e. this is meant to read as a camera viewfinder, not a form.
export function PhotoStep({ onCaptured, onClose, hasResumableDraft, onResume }: PhotoStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError(null);
    setStatus("uploading");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadReportPhotoAction(formData);

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("idle");
    onCaptured({
      file,
      previewUrl: localPreviewUrl,
      publicUrl: result.publicUrl,
      path: result.path,
    });
  }

  const uploading = status === "uploading";

  return (
    <div className="relative flex min-h-svh flex-col bg-ink">
      <div className="absolute top-4 right-4 z-10">
        <IconButton icon={<CloseIcon />} label="Close" onClick={onClose} />
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a next/image-eligible source
          <img src={previewUrl} alt="" className="max-h-[60vh] w-full rounded-card object-cover" />
        ) : (
          <p className="max-w-xs text-center text-body text-ink-foreground/70">
            Photograph the pothole to start your report.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 p-6">
        {error ? <p className="text-body text-red-400">{error}</p> : null}
        <CtaButton onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Take photo"}
        </CtaButton>
        <button
          type="button"
          onClick={() => libraryInputRef.current?.click()}
          disabled={uploading}
          className="text-body font-medium text-ink-foreground/80 underline-offset-4 hover:underline disabled:opacity-40"
        >
          Upload from library
        </button>
        {hasResumableDraft ? (
          <button
            type="button"
            onClick={onResume}
            disabled={uploading}
            className="text-body font-medium text-ink-foreground/80 underline-offset-4 hover:underline disabled:opacity-40"
          >
            Continue your last report
          </button>
        ) : null}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take photo"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload from library"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
