import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { mswServer } from "./support/msw-server";
import {
  GOOGLE_AUTOCOMPLETE_FIXTURE,
  GOOGLE_GEOCODE_DIVISION_LAYER_FIXTURE,
  googleAutocompleteErrorHandler,
  googleAutocompleteMatchHandler,
  googleGeocodeCenterAndDistinctNearbyHandler,
  googleGeocodeCenterMatchesNearbyUnmatchedHandler,
  googleGeocodeErrorHandler,
  googleGeocodeUnmatchedHandler,
  googlePlaceDetailsErrorHandler,
  googlePlaceDetailsHandler,
} from "./support/fakes/google-maps";
import { resolveLocalityCandidates, searchLocalities } from "@/lib/locality/resolve-candidates";

const CENTER_LAT = 12.9716;
const CENTER_LNG = 77.5946;

// Ticket 06's three required scenarios: happy path, zero/low-confidence
// candidates, and an API-error fallback — using Google Maps' fakes,
// never the real API. nearbyPlaces is built entirely on the Geocoding
// endpoint (verified live: Places' Nearby Search can't search for
// administrative localities at all), so "nearby" scenarios here are
// expressed as reverse-geocode fixtures that vary by which coordinates
// were queried, not a separate endpoint.
describe("resolveLocalityCandidates", () => {
  it("builds candidates from the primary point plus distinct nearby samples, deduping repeats", async () => {
    mswServer.use(googleGeocodeCenterAndDistinctNearbyHandler(CENTER_LAT, CENTER_LNG));

    const result = await resolveLocalityCandidates(CENTER_LAT, CENTER_LNG);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    // Center (Indiranagar) + every one of the 4 sampled nearby points
    // resolving to the same real place (Koramangala) — deduped to 2.
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        { locality: "Indiranagar", district: "Bengaluru Urban" },
        { locality: "Koramangala", district: "Bengaluru Urban" },
      ]),
    );
    expect(result.candidates).toHaveLength(2);
  });

  it("drops nearby samples with no canonical district match, keeping the primary point", async () => {
    mswServer.use(googleGeocodeCenterMatchesNearbyUnmatchedHandler(CENTER_LAT, CENTER_LNG));

    const result = await resolveLocalityCandidates(CENTER_LAT, CENTER_LNG);

    expect(result).toEqual({ ok: true, candidates: [{ locality: "Indiranagar", district: "Bengaluru Urban" }] });
  });

  it("returns an empty (not blocked) result when nothing matches a canonical district", async () => {
    mswServer.use(googleGeocodeUnmatchedHandler);

    const result = await resolveLocalityCandidates(0, 0);

    expect(result).toEqual({ ok: true, candidates: [] });
  });

  it("falls back with a clear error when the Geocoding API fails entirely", async () => {
    mswServer.use(googleGeocodeErrorHandler);

    const result = await resolveLocalityCandidates(0, 0);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected an error result");
    expect(result.error).toBeTruthy();
  });

  // Regression test for a real bug found against the live API: Google
  // interposes an extra "division" admin layer for some Indian states
  // (Karnataka's "Bangalore Division"), so the real district ("Bengaluru
  // Urban") isn't always at a fixed administrative_area_level_N.
  it("finds the canonical district even when Google places it behind an extra admin layer", async () => {
    mswServer.use(
      http.get("https://maps.googleapis.com/maps/api/geocode/json", () =>
        HttpResponse.json(GOOGLE_GEOCODE_DIVISION_LAYER_FIXTURE),
      ),
    );

    const result = await resolveLocalityCandidates(CENTER_LAT, CENTER_LNG);

    expect(result).toEqual({ ok: true, candidates: [{ locality: "Jayanagar", district: "Bengaluru Urban" }] });
  });
});

describe("searchLocalities", () => {
  it("returns matching candidates for a query", async () => {
    mswServer.use(googleAutocompleteMatchHandler, googlePlaceDetailsHandler);

    const result = await searchLocalities("Jayanagar");

    expect(result).toEqual({
      ok: true,
      candidates: [{ locality: "Jayanagar", district: "Bengaluru Urban" }],
    });
    expect(GOOGLE_AUTOCOMPLETE_FIXTURE.suggestions).toHaveLength(1);
  });

  it("falls back with a clear error, not a throw, when the search API fails", async () => {
    mswServer.use(googleAutocompleteErrorHandler);

    const result = await searchLocalities("anything");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected an error result");
    expect(result.error).toBeTruthy();
  });

  // No LocationIQ analogue: each Autocomplete (New) prediction needs a
  // follow-up Place Details call to get a district, since predictions
  // alone carry no address components. That call failing for a
  // prediction should just drop it, not the whole search.
  it("drops a prediction whose Place Details lookup fails, without throwing", async () => {
    mswServer.use(googleAutocompleteMatchHandler, googlePlaceDetailsErrorHandler);

    const result = await searchLocalities("Jayanagar");

    expect(result).toEqual({ ok: true, candidates: [] });
  });
});
