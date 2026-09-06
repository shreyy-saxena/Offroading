// @vitest-environment jsdom
import "./support/react-testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportFlow } from "@/components/report-flow/ReportFlow";
import { markOnboardingSeen } from "@/components/report-flow/onboarding-store";
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
const submitEmailReportAction = vi.fn();
vi.mock("@/app/actions/submit-report", () => ({
  submitLoggedReportAction: (...args: unknown[]) => submitLoggedReportAction(...args),
  submitEmailReportAction: (...args: unknown[]) => submitEmailReportAction(...args),
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

async function reachReporterTypeStep() {
  stubGeolocationGranted();
  render(<ReportFlow />);

  fireEvent.change(screen.getByLabelText("Upload from library"), {
    target: { files: [samplePhotoFile()] },
  });

  fireEvent.click(await screen.findByRole("button", { name: "Indiranagar" }));

  expect(await screen.findByText("Are you a passer-by or a resident?")).toBeInTheDocument();
}

describe("ReportFlow — reporter type & log-or-email branch (ticket 07/08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markOnboardingSeen();
  });

  it("'Just log it' saves with the accumulated flow state and redirects to the feed, no contact fields ever shown", async () => {
    submitLoggedReportAction.mockResolvedValue({ outcome: "saved", id: "report-1" });
    await reachReporterTypeStep();

    fireEvent.click(screen.getByRole("button", { name: "Resident of this area" }));
    fireEvent.click(await screen.findByRole("button", { name: "Just log it" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/feed"));
    expect(submitLoggedReportAction).toHaveBeenCalledWith({
      photoUrl: "https://example.com/photo.jpg",
      latitude: 12.9716,
      longitude: 77.5946,
      locality: "Indiranagar",
      district: "Bengaluru Urban",
      reporterType: "resident",
    });

    // Contact-detail fields never appeared anywhere in this run.
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mobile number")).not.toBeInTheDocument();
  });

  it("'Email the authorities' reaches the contact-details step with prior state intact", async () => {
    await reachReporterTypeStep();

    fireEvent.click(screen.getByRole("button", { name: "Passer-by" }));
    fireEvent.click(await screen.findByRole("button", { name: "Email the authorities" }));

    expect(await screen.findByText("Your contact details")).toBeInTheDocument();

    submitEmailReportAction.mockResolvedValue({ outcome: "saved", id: "report-2" });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9999999999" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await vi.waitFor(() => expect(submitEmailReportAction).toHaveBeenCalled());
    expect(submitEmailReportAction).toHaveBeenCalledWith(
      {
        photoUrl: "https://example.com/photo.jpg",
        latitude: 12.9716,
        longitude: 77.5946,
        locality: "Indiranagar",
        district: "Bengaluru Urban",
        reporterType: "passerby",
      },
      { name: "Test User", mobile: "9999999999", email: "test@example.com" },
    );
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/feed"));
  });
});

// Ticket 18 — a clear "you're offline" message for an in-page submission
// attempt, distinct from the service worker's navigation-only fallback.
describe("ReportFlow — offline submission handling (ticket 18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markOnboardingSeen();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  it("'Just log it' shows an offline message and never calls the action while offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    await reachReporterTypeStep();

    fireEvent.click(screen.getByRole("button", { name: "Resident of this area" }));
    fireEvent.click(await screen.findByRole("button", { name: "Just log it" }));

    expect(await screen.findByText(/you're offline/i)).toBeInTheDocument();
    expect(submitLoggedReportAction).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
