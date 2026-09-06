import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.fn();
const trackMock = vi.fn();

vi.mock("mixpanel-browser", () => ({
  default: {
    init: initMock,
    track: trackMock,
  },
}));

const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

describe("trackEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    else process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = ORIGINAL_TOKEN;
  });

  it("does nothing when no Mixpanel token is configured", async () => {
    delete process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    const { trackEvent } = await import("@/lib/analytics/mixpanel");

    trackEvent("flow_started");

    expect(initMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("initializes once and tracks the named event when a token is configured", async () => {
    process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = "test-token";
    const { trackEvent } = await import("@/lib/analytics/mixpanel");

    trackEvent("photo_captured");
    trackEvent("location_confirmed");

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith("test-token", expect.objectContaining({ ip: false }));
    expect(trackMock).toHaveBeenNthCalledWith(1, "photo_captured");
    expect(trackMock).toHaveBeenNthCalledWith(2, "location_confirmed");
  });

  it("never throws even if the underlying Mixpanel call fails", async () => {
    process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = "test-token";
    trackMock.mockImplementationOnce(() => {
      throw new Error("network blocked");
    });
    const { trackEvent } = await import("@/lib/analytics/mixpanel");

    expect(() => trackEvent("report_logged")).not.toThrow();
  });
});
