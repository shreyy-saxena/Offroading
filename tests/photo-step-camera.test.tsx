// @vitest-environment jsdom
import "./support/react-testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PhotoStep } from "@/components/report-flow/PhotoStep";

const uploadReportPhotoAction = vi.fn();
vi.mock("@/app/actions/report-photo", () => ({
  uploadReportPhotoAction: (...args: unknown[]) => uploadReportPhotoAction(...args),
}));

const stopTrack = vi.fn();
function fakeStream() {
  return { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
}

// Live-camera-specific plumbing that jsdom doesn't implement at all:
// video element dimensions, and canvas 2D context/toBlob (jsdom has no
// canvas backend without the optional `canvas` package, which this
// project doesn't depend on).
function stubVideoAndCanvas() {
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, value: 640 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, value: 480 });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    callback?.(new Blob(["fake-jpeg-bytes"], { type: "image/jpeg" }));
  });
}

describe("PhotoStep — inline live camera (offroading follow-up)", () => {
  beforeEach(() => {
    uploadReportPhotoAction.mockReset();
    stopTrack.mockClear();
    stubVideoAndCanvas();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("shows a live camera viewfinder and shutter button when getUserMedia succeeds, not the old file-input button", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });

    render(<PhotoStep onCaptured={vi.fn()} onClose={vi.fn()} />);

    const shutter = await screen.findByRole("button", { name: "Take photo" });
    expect(shutter).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
    // Requests the back camera, inline — never the OS camera app handoff.
    expect(screen.queryByLabelText("Take photo (camera app)")).toBeInTheDocument(); // present but hidden, as a fallback input
  });

  it("capturing a frame via the shutter uploads it exactly like a chosen file", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    uploadReportPhotoAction.mockResolvedValue({ ok: true, publicUrl: "https://example.com/p.jpg", path: "p.jpg" });
    const onCaptured = vi.fn();

    render(<PhotoStep onCaptured={onCaptured} onClose={vi.fn()} />);

    const shutter = await screen.findByRole("button", { name: "Take photo" });
    fireEvent.click(shutter);

    await waitFor(() => expect(onCaptured).toHaveBeenCalled());
    expect(uploadReportPhotoAction).toHaveBeenCalledTimes(1);
    const formData = uploadReportPhotoAction.mock.calls[0][0] as FormData;
    const uploadedFile = formData.get("photo") as File;
    expect(uploadedFile.type).toBe("image/jpeg");
  });

  it("Retake clears the captured preview without re-requesting camera permission", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    uploadReportPhotoAction.mockResolvedValue({ ok: true, publicUrl: "https://example.com/p.jpg", path: "p.jpg" });

    render(<PhotoStep onCaptured={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    const retakeButton = await screen.findByRole("button", { name: "Retake" });

    fireEvent.click(retakeButton);

    expect(await screen.findByRole("button", { name: "Take photo" })).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1); // still just the one, original grant
  });

  it("falls back to the OS-camera-app button when getUserMedia is rejected (permission denied)", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });

    render(<PhotoStep onCaptured={vi.fn()} onClose={vi.fn()} />);

    // The visible CTA reuses the same accessible name as the old
    // component design ("Take photo"), but is now the fallback button
    // triggering the hidden capture="environment" input, not a shutter.
    await waitFor(() => expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument());
    expect(screen.getByLabelText("Upload from library")).toBeInTheDocument();
  });

  it("falls back immediately (no camera API at all) — the existing jsdom/no-mediaDevices path", () => {
    render(<PhotoStep onCaptured={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
  });
});
