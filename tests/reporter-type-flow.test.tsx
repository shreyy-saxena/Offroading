// @vitest-environment jsdom
import "./support/react-testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportFlow } from "@/components/report-flow/ReportFlow";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

function samplePhotoFile() {
  return new File([new Uint8Array([1, 2, 3])], "pothole.jpg", { type: "image/jpeg" });
}

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

// Drives the flow up through locality confirmation, common setup for
// both branch tests below.
async function reachReporterTypeStep() {
  stubGeolocationGranted();
  render(<ReportFlow />);

  fireEvent.change(screen.getByLabelText("Upload from library"), {
    target: { files: [samplePhotoFile()] },
  });

  fireEvent.click(await screen.findByRole("button", { name: "Indiranagar" }));

  expect(await screen.findByText("Are you a passer-by or a resident?")).toBeInTheDocument();
}

describe("ReportFlow — reporter type & log-or-email branch (ticket 07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("'Just log it' path reaches the end without ever asking for contact details, with prior state intact", async () => {
    await reachReporterTypeStep();

    fireEvent.click(screen.getByRole("button", { name: "Resident of this area" }));
    fireEvent.click(await screen.findByRole("button", { name: "Just log it" }));

    // Prior-step state (photo, locality) survived the branch.
    expect(await screen.findByText("Indiranagar, Bengaluru Urban")).toBeInTheDocument();
    expect(screen.getByText("Resident · Just logging it")).toBeInTheDocument();
    // Decorative alt="" (established pattern from tickets 05/06) means
    // this isn't exposed with role "img" — query by tag instead.
    expect(document.querySelector("img")).toHaveAttribute("src", expect.stringContaining("blob:"));

    // No contact-detail fields ever appeared anywhere in this run.
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mobile/i)).not.toBeInTheDocument();
  });

  it("'Email the authorities' path diverges and still carries prior state forward", async () => {
    await reachReporterTypeStep();

    fireEvent.click(screen.getByRole("button", { name: "Passer-by" }));
    fireEvent.click(await screen.findByRole("button", { name: "Email the authorities" }));

    expect(await screen.findByText("Indiranagar, Bengaluru Urban")).toBeInTheDocument();
    expect(screen.getByText("Passer-by · Emailing the authorities")).toBeInTheDocument();
  });
});
