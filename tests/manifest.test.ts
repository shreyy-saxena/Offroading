import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

// Ticket 18 acceptance criterion: "manifest + icons present, passes
// basic installability checks" — the concrete shape browsers/Lighthouse
// actually check for (name, short_name, start_url, standalone display,
// a 192px and a 512px icon).
describe("web app manifest", () => {
  it("declares the fields required for basic PWA installability", () => {
    const result = manifest();

    expect(result.name).toBe("Offroading");
    expect(result.short_name).toBeTruthy();
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");

    const sizes = result.icons?.map((icon) => icon.sizes) ?? [];
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(result.icons?.every((icon) => icon.type === "image/png")).toBe(true);
  });
});
