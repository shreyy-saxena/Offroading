// @vitest-environment jsdom
import "./support/react-testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MissingMappingStep } from "@/components/report-flow/MissingMappingStep";
import type { BaseReportInput, ContactDetails } from "@/components/report-flow/types";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("mixpanel-browser", () => ({ default: { init: vi.fn(), track: trackMock } }));

const resolveMissingMappingAction = vi.fn();
vi.mock("@/app/actions/submit-report", () => ({
  resolveMissingMappingAction: (...args: unknown[]) => resolveMissingMappingAction(...args),
}));

const REPORT_INPUT: BaseReportInput = {
  photoUrl: "https://example.com/photo.jpg",
  latitude: 12.9716,
  longitude: 77.5946,
  locality: "Indiranagar",
  district: "Bengaluru Urban",
  reporterType: "resident",
};

const CONTACT: ContactDetails = { name: "Test User", mobile: "9999999999", email: "test@example.com" };

describe("MissingMappingStep — analytics (PRD Section 5, Step 8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = "test-token";
    resolveMissingMappingAction.mockResolvedValue({ outcome: "saved", id: "report-1" });
  });

  it("tracks report_logged when the citizen cancels the email (same DB outcome as 'just log it')", async () => {
    render(<MissingMappingStep reportInput={REPORT_INPUT} contact={CONTACT} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel the email, just log the report" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/feed"));
    expect(trackMock).toHaveBeenCalledWith("report_logged");
    expect(trackMock).not.toHaveBeenCalledWith("report_emailed");
  });

  it("tracks report_emailed when the citizen queues the email", async () => {
    render(<MissingMappingStep reportInput={REPORT_INPUT} contact={CONTACT} />);

    fireEvent.click(screen.getByRole("button", { name: "Queue it — email automatically once it's covered" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/feed"));
    expect(trackMock).toHaveBeenCalledWith("report_emailed");
    expect(trackMock).not.toHaveBeenCalledWith("report_logged");
  });

  it("tracks report_emailed when the citizen provides a replacement email address", async () => {
    render(<MissingMappingStep reportInput={REPORT_INPUT} contact={CONTACT} />);

    fireEvent.change(screen.getByLabelText("Send it to this email address instead"), {
      target: { value: "authority@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send to this address" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/feed"));
    expect(trackMock).toHaveBeenCalledWith("report_emailed");
  });
});
