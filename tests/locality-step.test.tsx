// @vitest-environment jsdom
import "./support/react-testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocalityStep } from "@/components/report-flow/LocalityStep";

const resolveLocalityCandidatesAction = vi.fn();
const searchLocalitiesAction = vi.fn();
vi.mock("@/app/actions/locality", () => ({
  resolveLocalityCandidatesAction: (...args: unknown[]) => resolveLocalityCandidatesAction(...args),
  searchLocalitiesAction: (...args: unknown[]) => searchLocalitiesAction(...args),
}));

describe("LocalityStep (ticket 06)", () => {
  beforeEach(() => {
    resolveLocalityCandidatesAction.mockReset();
    searchLocalitiesAction.mockReset();
  });

  it("selecting a candidate carries both locality and district forward", async () => {
    resolveLocalityCandidatesAction.mockResolvedValue({
      ok: true,
      candidates: [{ locality: "Indiranagar", district: "Bengaluru Urban" }],
    });
    const onConfirmed = vi.fn();

    render(
      <LocalityStep location={{ status: "granted", latitude: 12.97, longitude: 77.59 }} onConfirmed={onConfirmed} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Indiranagar" }));

    expect(onConfirmed).toHaveBeenCalledWith({ locality: "Indiranagar", district: "Bengaluru Urban" });
  });

  it("GPS-denied reaches a working manual search with no dead end, and requires a district before continuing", () => {
    const onConfirmed = vi.fn();

    render(<LocalityStep location={{ status: "denied" }} onConfirmed={onConfirmed} />);

    expect(screen.getByText("We couldn't get your location — search for it below.")).toBeInTheDocument();
    // No candidate-fetch call at all when GPS wasn't granted.
    expect(resolveLocalityCandidatesAction).not.toHaveBeenCalled();

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Search for your locality"), {
      target: { value: "Jayanagar" },
    });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("District"), { target: { value: "Bengaluru Urban" } });
    expect(continueButton).not.toBeDisabled();

    fireEvent.click(continueButton);
    expect(onConfirmed).toHaveBeenCalledWith({ locality: "Jayanagar", district: "Bengaluru Urban" });
  });
});
