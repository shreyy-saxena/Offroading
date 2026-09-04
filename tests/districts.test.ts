import { describe, expect, it } from "vitest";
import { DISTRICTS, findCanonicalDistrict, isKnownDistrict } from "@/lib/data/districts";

// The canonical district table was expanded from a ~104-entry hand-picked
// seed to the full ~788-district list (all 28 states + 8 UTs) — this test
// guards against silently regressing back to a tiny seed, and locks in
// the state-disambiguation fix that expansion required (a handful of
// district names are genuinely shared by two different states, invisible
// with the old small seed but a real mis-routing risk with the full one).
describe("DISTRICTS", () => {
  it("covers the full canonical list, not a small hand-picked seed", () => {
    expect(DISTRICTS.length).toBeGreaterThan(700);
  });

  it("includes the officially-renamed current name, not a stale pre-2014 one", () => {
    // Confirmed live against the real Google Maps API earlier — Google
    // returns "Bengaluru Urban", not "Bangalore Urban".
    expect(isKnownDistrict("Bengaluru Urban")).toBe(true);
    expect(findCanonicalDistrict("Bengaluru Urban")?.state).toBe("Karnataka");
  });
});

describe("findCanonicalDistrict", () => {
  it("resolves an unambiguous name with no state hint needed", () => {
    expect(findCanonicalDistrict("Raipur")?.state).toBe("Chhattisgarh");
  });

  it("returns null for a locality that isn't itself a district", () => {
    expect(findCanonicalDistrict("Koramangala")).toBeNull();
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(findCanonicalDistrict("  raipur ")?.name).toBe("Raipur");
  });

  it("returns null for an ambiguous name with no state hint, rather than guessing", () => {
    // Bilaspur exists in both Chhattisgarh and Himachal Pradesh.
    expect(findCanonicalDistrict("Bilaspur")).toBeNull();
  });

  it("disambiguates an ambiguous name using a state hint", () => {
    expect(findCanonicalDistrict("Bilaspur", "Chhattisgarh")?.state).toBe("Chhattisgarh");
    expect(findCanonicalDistrict("Bilaspur", "Himachal Pradesh")?.state).toBe("Himachal Pradesh");
  });

  it("returns null when the state hint doesn't match either ambiguous candidate", () => {
    expect(findCanonicalDistrict("Bilaspur", "Karnataka")).toBeNull();
  });

  it("returns null for an unrecognized district name", () => {
    expect(findCanonicalDistrict("Not A Real District")).toBeNull();
  });
});
