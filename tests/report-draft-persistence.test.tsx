// @vitest-environment jsdom
import "./support/react-testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportFlow } from "@/components/report-flow/ReportFlow";
import { samplePhotoFile } from "./support/sample-file";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/app/actions/report-photo", () => ({
  uploadReportPhotoAction: vi.fn().mockResolvedValue({
    ok: true,
    publicUrl: "https://example.com/photo.jpg",
    path: "photo.jpg",
  }),
}));

vi.mock("@/app/actions/locality", () => ({
  resolveLocalityCandidatesAction: vi.fn().mockResolvedValue({
    ok: true,
    candidates: [{ locality: "Indiranagar", district: "Bengaluru Urban" }],
  }),
}));

const submitLoggedReportAction = vi.fn();
vi.mock("@/app/actions/submit-report", () => ({
  submitLoggedReportAction: (...args: unknown[]) => submitLoggedReportAction(...args),
}));

function stubGeolocationGranted() {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 12.9716, longitude: 77.5946 } } as GeolocationPosition),
      ),
    },
  });
}

// Advances a fresh ReportFlow instance through to the reporter-type
// choice (leaving a draft persisted at "logOrEmail"), without submitting.
async function buildInProgressDraft() {
  stubGeolocationGranted();
  const { unmount } = render(<ReportFlow />);

  fireEvent.change(screen.getByLabelText("Upload from library"), {
    target: { files: [samplePhotoFile()] },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Indiranagar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Resident of this area" }));
  await screen.findByText("Log it, or email the authorities too?");

  // Draft persistence is async (IndexedDB) — give the write time to land
  // before simulating the reload by unmounting.
  await new Promise((resolve) => setTimeout(resolve, 50));
  unmount();
}

describe("Report draft persistence (ticket 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers to resume mid-flow state after a simulated reload, with prior selections intact", async () => {
    await buildInProgressDraft();

    // Simulates a reload: a brand-new ReportFlow mount, same underlying
    // IndexedDB (fake-indexeddb persists across this in-process remount,
    // same as a real browser's IndexedDB persists across a page reload).
    render(<ReportFlow />);

    const resumeButton = await screen.findByRole("button", { name: "Continue your last report" });

    // Criterion: an abandoned draft doesn't block starting fresh — the
    // normal capture buttons stay right there alongside the offer.
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Upload from library")).toBeInTheDocument();

    fireEvent.click(resumeButton);

    expect(await screen.findByText("Log it, or email the authorities too?")).toBeInTheDocument();
  });

  it("a successful submission clears the draft — a fresh flow afterward starts empty", async () => {
    submitLoggedReportAction.mockResolvedValue({ outcome: "saved", id: "report-1" });
    await buildInProgressDraft();

    render(<ReportFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue your last report" }));
    await screen.findByText("Log it, or email the authorities too?");

    fireEvent.click(screen.getByRole("button", { name: "Just log it" }));
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/feed"));

    render(<ReportFlow />);
    // No resume offer this time — nothing to restore into, straight back
    // to a blank hero screen.
    await screen.findByText("Photograph the pothole to start your report.");
    expect(screen.queryByRole("button", { name: "Continue your last report" })).not.toBeInTheDocument();
  });
});
