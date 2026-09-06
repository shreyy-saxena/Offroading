// @vitest-environment jsdom
import "./support/react-testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingCarousel } from "@/components/report-flow/OnboardingCarousel";
import { ReportFlow } from "@/components/report-flow/ReportFlow";
import { hasSeenOnboarding, markOnboardingSeen } from "@/components/report-flow/onboarding-store";
import { samplePhotoFile } from "./support/sample-file";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/actions/report-photo", () => ({
  uploadReportPhotoAction: vi.fn().mockResolvedValue({
    ok: true,
    publicUrl: "https://example.com/photo.jpg",
    path: "photo.jpg",
  }),
}));

vi.mock("@/app/actions/locality", () => ({
  resolveLocalityCandidatesAction: vi.fn().mockResolvedValue({ ok: true, candidates: [] }),
}));

function stubGeolocation(
  impl: (success: PositionCallback, error?: PositionErrorCallback) => void,
) {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) },
  });
}

describe("OnboardingCarousel", () => {
  it("shows the second slide's heading after tapping Next once", () => {
    render(<OnboardingCarousel onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("How it works")).toBeInTheDocument();
  });

  it("only calls onComplete after the final slide's CTA, not before", () => {
    const onComplete = vi.fn();
    render(<OnboardingCarousel onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Let's Go" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("ReportFlow — onboarding gate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows onboarding instead of the camera on a first visit", () => {
    render(<ReportFlow />);

    expect(screen.getByText("Click & report potholes near you")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("skips straight to the camera when onboarding was already seen", () => {
    markOnboardingSeen();

    render(<ReportFlow />);

    expect(screen.queryByText("Click & report potholes near you")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("persists the onboarding flag after completing the carousel, reaching the camera", () => {
    render(<ReportFlow />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Let's Go" }));

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(hasSeenOnboarding()).toBe(true);
  });
});

describe("ReportFlow — logo placement", () => {
  beforeEach(() => {
    localStorage.clear();
    markOnboardingSeen();
  });

  it("does not show the app logo on the camera hero screen", () => {
    render(<ReportFlow />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByAltText("Offroading")).not.toBeInTheDocument();
  });

  it("shows the app logo once the flow advances past the camera step", async () => {
    stubGeolocation(() => {
      /* left pending — LocationStep renders its own "Getting your location…" screen either way */
    });

    render(<ReportFlow />);
    fireEvent.change(screen.getByLabelText("Upload from library"), {
      target: { files: [samplePhotoFile()] },
    });

    expect(await screen.findByAltText("Offroading")).toBeInTheDocument();
  });
});
