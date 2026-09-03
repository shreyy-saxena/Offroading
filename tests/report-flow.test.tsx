// @vitest-environment jsdom
import "./support/react-testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportFlow } from "@/components/report-flow/ReportFlow";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// The real action hits Supabase Storage (already covered by ticket 04's
// integration test) — this suite is about flow/UI orchestration, so it's
// faked at the module boundary rather than re-verified here.
vi.mock("@/app/actions/report-photo", () => ({
  uploadReportPhotoAction: vi.fn().mockResolvedValue({
    ok: true,
    publicUrl: "https://example.com/photo.jpg",
    path: "photo.jpg",
  }),
}));

// Ticket 06's candidate-resolution logic has its own dedicated tests
// (locality-resolution.test.ts, locality-step.test.tsx) — this suite is
// only about ticket 05's hand-off into that step, not what it does next.
vi.mock("@/app/actions/locality", () => ({
  resolveLocalityCandidatesAction: vi.fn().mockResolvedValue({ ok: true, candidates: [] }),
}));

function samplePhotoFile() {
  return new File([new Uint8Array([1, 2, 3])], "pothole.jpg", { type: "image/jpeg" });
}

function stubGeolocation(
  impl: (
    success: PositionCallback,
    error?: PositionErrorCallback,
  ) => void,
) {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) },
  });
}

describe("ReportFlow — hero screen (ticket 05)", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("navigates to the feed with no confirmation when close is tapped, before anything is captured", () => {
    render(<ReportFlow />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(pushMock).toHaveBeenCalledWith("/feed");
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("requests GPS right after the photo step, and advances the flow on grant", async () => {
    stubGeolocation((success) => {
      success({
        coords: { latitude: 12.34, longitude: 56.78 },
      } as GeolocationPosition);
    });

    render(<ReportFlow />);
    fireEvent.change(screen.getByLabelText("Upload from library"), {
      target: { files: [samplePhotoFile()] },
    });

    // Ticket 06's LocalityStep is next in the flow — reaching its heading
    // proves GPS resolved and the flow advanced past this ticket's steps.
    expect(await screen.findByText("Where's this?")).toBeInTheDocument();
  });

  it("hands off to manual locality search when GPS is denied, instead of dead-ending", async () => {
    stubGeolocation((_success, error) => {
      error?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    });

    render(<ReportFlow />);
    fireEvent.change(screen.getByLabelText("Upload from library"), {
      target: { files: [samplePhotoFile()] },
    });

    expect(
      await screen.findByText("We couldn't get your location — search for it below."),
    ).toBeInTheDocument();
  });
});
