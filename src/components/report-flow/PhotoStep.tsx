"use client";

import { useEffect, useRef, useState } from "react";
import { uploadReportPhotoAction } from "@/app/actions/report-photo";
import { CtaButton } from "@/components/ui/CtaButton";
import { IconButton } from "@/components/ui/IconButton";
import { CloseIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics/mixpanel";
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

type CameraState = "starting" | "live" | "unavailable";

// Hero screen (PRD Section 5, Steps 1-2 / FR11): opening the app *is*
// this screen — no landing menu precedes it. An inline live camera
// viewfinder (getUserMedia), not a handoff to the OS camera app — closer
// to a QR-scanner feel, and the actual reason this screen has always had
// a dark background (see the close button's own styling). Gracefully
// falls back to the OS camera app / gallery picker whenever getUserMedia
// isn't available (desktop with no camera, permission denied,
// unsupported browser — or, in every automated test, jsdom, which has no
// mediaDevices at all, so the fallback path is what those tests exercise).
export function PhotoStep({ onCaptured, onClose, hasResumableDraft, onResume }: PhotoStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Always starts as "starting" on both server and client, on purpose —
  // this is SSR'd (it's the app's root page), and Node has its own
  // built-in `navigator` global during SSR (no `mediaDevices` on it,
  // unlike a real browser's), so branching the *initial* render on
  // `navigator.mediaDevices` caused a real hydration mismatch (confirmed
  // live: server rendered the "unavailable" placeholder text, client's
  // first render computed "starting" instead). Only the client-only
  // effect below may branch on it, after hydration has already happened.
  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("flow_started");
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices) {
      // Synchronous setState in an effect is normally worth avoiding
      // (react-hooks/set-state-in-effect), but this one specifically
      // *is* the client-only capability check that a useState initializer
      // can't safely do (see the comment above) — not a value knowable
      // up front.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCameraState("unavailable");
      return;
    }
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraState("live");
      })
      .catch(() => {
        if (!cancelled) setCameraState("unavailable");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

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
    trackEvent("photo_captured");
    onCaptured({
      file,
      previewUrl: localPreviewUrl,
      publicUrl: result.publicUrl,
      path: result.path,
    });
  }

  // Grabs the current video frame — the stream itself keeps running
  // (stopped only on unmount), so "Retake" just clears previewUrl and the
  // live feed is instantly back, no re-prompting for camera permission.
  function handleShutterClick() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        handleFile(new File([blob], `pothole-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus("idle");
    setError(null);
  }

  const uploading = status === "uploading";
  const showLiveCamera = cameraState === "live" && !previewUrl;

  return (
    <div className="relative flex min-h-svh flex-col bg-ink">
      <div className="absolute top-4 right-4 z-10">
        <IconButton icon={<CloseIcon />} label="Close" onClick={onClose} />
      </div>

      {/* Live camera fills the frame edge-to-edge, viewfinder-style —
          kept mounted (just hidden behind the static preview) whenever a
          photo has been captured, so retaking never re-requests the
          camera. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover ${showLiveCamera ? "" : "hidden"}`}
      />

      <div className="relative flex flex-1 items-center justify-center p-6">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a next/image-eligible source
          <img src={previewUrl} alt="" className="max-h-[60vh] w-full rounded-card object-cover" />
        ) : !showLiveCamera ? (
          <p className="max-w-xs text-center text-body text-ink-foreground/70">
            {cameraState === "starting"
              ? "Starting camera…"
              : "Photograph the pothole to start your report."}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 p-6">
        {error ? <p className="text-body text-red-400">{error}</p> : null}

        {previewUrl ? (
          <CtaButton onClick={handleRetake} disabled={uploading} className="max-w-xs">
            {uploading ? "Uploading…" : "Retake"}
          </CtaButton>
        ) : showLiveCamera ? (
          <button
            type="button"
            onClick={handleShutterClick}
            aria-label="Take photo"
            className="h-16 w-16 rounded-full border-4 border-ink-foreground bg-ink-foreground/20 transition-colors hover:bg-ink-foreground/30"
          />
        ) : cameraState === "unavailable" ? (
          <CtaButton onClick={() => cameraInputRef.current?.click()} disabled={uploading} className="max-w-xs">
            {uploading ? "Uploading…" : "Take photo"}
          </CtaButton>
        ) : null}

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
        aria-label="Take photo (camera app)"
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
