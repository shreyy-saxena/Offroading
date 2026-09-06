// @vitest-environment jsdom
import "./support/react-testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShareButtons } from "@/components/ui/ShareButtons";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("mixpanel-browser", () => ({ default: { init: vi.fn(), track: trackMock } }));

const REPORT = {
  url: "https://offroading.example/reports/abc-123",
  locality: "Indiranagar",
  district: "Bengaluru Urban",
};

describe("ShareButtons (ticket 13)", () => {
  beforeEach(() => {
    trackMock.mockClear();
    process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = "test-token";
  });

  it("tracks shared_on_x when the X link is clicked", () => {
    render(<ShareButtons {...REPORT} />);

    fireEvent.click(screen.getByRole("link", { name: "Share on X (Twitter)" }));

    expect(trackMock).toHaveBeenCalledWith("shared_on_x");
  });

  it("forms a correct Twitter/X intent URL with pre-filled text and the permalink", () => {
    render(<ShareButtons {...REPORT} />);

    const twitterLink = screen.getByRole("link", { name: "Share on X (Twitter)" });
    const href = new URL(twitterLink.getAttribute("href")!);

    expect(href.origin).toBe("https://twitter.com");
    expect(href.pathname).toBe("/intent/tweet");
    expect(href.searchParams.get("text")).toBe("I just reported a pothole in Indiranagar, Bengaluru Urban");
    expect(href.searchParams.get("url")).toBe(REPORT.url);

    // Never the reporter's own details — only what ShareButtons was
    // literally given (url/locality/district), but double-checked
    // explicitly per the ticket's own instruction.
    expect(twitterLink.getAttribute("href")).not.toMatch(/@|mobile|email/i);
  });

  it("opens the target in a new tab without granting it access to window.opener", () => {
    render(<ShareButtons {...REPORT} />);
    const twitterLink = screen.getByRole("link", { name: "Share on X (Twitter)" });

    expect(twitterLink).toHaveAttribute("target", "_blank");
    expect(twitterLink.getAttribute("rel")).toContain("noopener");
  });

  describe("the 'Share…' button", () => {
    const originalShare = (navigator as { share?: unknown }).share;
    const originalClipboard = navigator.clipboard;

    afterEach(() => {
      Object.defineProperty(navigator, "share", { value: originalShare, configurable: true });
      Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
    });

    it("invokes navigator.share with the permalink when Web Share is supported", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      render(<ShareButtons {...REPORT} />);
      fireEvent.click(screen.getByRole("button", { name: "Share…" }));

      await vi.waitFor(() => expect(shareMock).toHaveBeenCalled());
      expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ url: REPORT.url }));
      expect(trackMock).toHaveBeenCalledWith("shared_generic");
    });

    it("falls back to copying the link with a visible confirmation when Web Share is unsupported", async () => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

      render(<ShareButtons {...REPORT} />);
      fireEvent.click(screen.getByRole("button", { name: "Share…" }));

      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(REPORT.url));
      expect(await screen.findByRole("status")).toHaveTextContent("Link copied");
    });
  });

  describe("dual mounting (ticket 13 acceptance criteria)", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });

    it("renders correctly with no dependency on any particular parent (feed card vs. permalink page)", () => {
      const { unmount } = render(
        <div>
          {/* Simulates a feed card overlay */}
          <ShareButtons {...REPORT} className="on-a-feed-card" />
        </div>,
      );
      expect(screen.getByRole("link", { name: "Share on X (Twitter)" })).toBeInTheDocument();
      unmount();

      // Simulates the permalink page — same component, freshly mounted,
      // no state or setup carried over from the "feed card" instance.
      render(<ShareButtons {...REPORT} className="on-the-permalink-page" />);
      expect(screen.getByRole("link", { name: "Share on X (Twitter)" })).toBeInTheDocument();
    });
  });
});
