import { describe, expect, it } from "vitest";
import { mswServer } from "./support/msw-server";
import {
  LOCATIONIQ_AUTOCOMPLETE_FIXTURE,
  locationIqAutocompleteErrorHandler,
  locationIqAutocompleteHandler,
  locationIqNearbyEmptyHandler,
  locationIqNearbyErrorHandler,
  locationIqNearbyMatchHandler,
  locationIqReverseErrorHandler,
  locationIqReverseMatchHandler,
} from "./support/fakes/locationiq";
import { resolveLocalityCandidates, searchLocalities } from "@/lib/locality/resolve-candidates";

// Ticket 06's three required scenarios: happy path, zero/low-confidence
// candidates, and an API-error fallback — using ticket 03's LocationIQ
// fake, never the real API.
describe("resolveLocalityCandidates", () => {
  it("builds 2-4 candidates from reverse + nearby, dropping places with no canonical district match", async () => {
    mswServer.use(locationIqReverseMatchHandler, locationIqNearbyMatchHandler);

    const result = await resolveLocalityCandidates(12.9716, 77.5946);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    // Reverse (Indiranagar) + Nearby (Koramangala, HSR Layout; "Some
    // Place" has no real district match and must be dropped) = 3.
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.every((c) => c.district === "Bengaluru Urban")).toBe(true);
    expect(result.candidates.map((c) => c.locality)).toEqual(
      expect.arrayContaining(["Indiranagar", "Koramangala", "HSR Layout"]),
    );
    expect(result.candidates.some((c) => c.locality === "Some Place")).toBe(false);
  });

  it("returns an empty (not blocked) result when nothing matches a canonical district", async () => {
    mswServer.use(locationIqReverseErrorHandler, locationIqNearbyEmptyHandler);
    // Reverse fails but Nearby succeeds with zero results — still ok:true.

    const result = await resolveLocalityCandidates(0, 0);

    expect(result).toEqual({ ok: true, candidates: [] });
  });

  it("falls back with a clear error when both LocationIQ calls fail", async () => {
    mswServer.use(locationIqReverseErrorHandler, locationIqNearbyErrorHandler);

    const result = await resolveLocalityCandidates(0, 0);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected an error result");
    expect(result.error).toBeTruthy();
  });
});

describe("searchLocalities", () => {
  it("returns matching candidates for a query", async () => {
    mswServer.use(locationIqAutocompleteHandler);

    const result = await searchLocalities("Jayanagar");

    expect(result).toEqual({
      ok: true,
      candidates: [{ locality: "Jayanagar", district: "Bengaluru Urban" }],
    });
    expect(LOCATIONIQ_AUTOCOMPLETE_FIXTURE).toHaveLength(1);
  });

  it("falls back with a clear error, not a throw, when the search API fails", async () => {
    mswServer.use(locationIqAutocompleteErrorHandler);

    const result = await searchLocalities("anything");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected an error result");
    expect(result.error).toBeTruthy();
  });
});
