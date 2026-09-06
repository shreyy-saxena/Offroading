"use client";

import { useEffect, useRef, useState } from "react";
import { resolveLocalityCandidatesAction, searchLocalitiesAction } from "@/app/actions/locality";
import { CtaButton } from "@/components/ui/CtaButton";
import { PillChip } from "@/components/ui/PillChip";
import { DISTRICTS } from "@/lib/data/districts";
import { trackEvent } from "@/lib/analytics/mixpanel";
import type { LocalityCandidate } from "@/lib/locality/resolve-candidates";
import type { ConfirmedLocality, LocationResult } from "./types";

type LocalityStepProps = {
  location: LocationResult;
  onConfirmed: (locality: ConfirmedLocality) => void;
};

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;

// PRD Section 5 Step 4 / PRD 12.2: candidates from the GPS point (when
// available) plus an always-available manual search — never a dead end,
// whether GPS was denied or LocationIQ itself is down.
export function LocalityStep({ location, onConfirmed }: LocalityStepProps) {
  const [candidates, setCandidates] = useState<LocalityCandidate[] | null>(() =>
    location.status === "granted" ? null : [],
  );
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  // Single funnel-tracking point for both confirm paths below (a GPS
  // candidate pill, or the manual search + district picker) rather than
  // duplicating the trackEvent call at each call site.
  function confirm(locality: ConfirmedLocality) {
    trackEvent("location_confirmed");
    onConfirmed(locality);
  }

  useEffect(() => {
    if (location.status !== "granted") return;
    let cancelled = false;

    resolveLocalityCandidatesAction(location.latitude, location.longitude).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setCandidates(result.candidates);
      } else {
        setCandidates([]);
        setCandidatesError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [location]);

  const [manualQuery, setManualQuery] = useState("");
  const [manualDistrict, setManualDistrict] = useState("");
  const [suggestions, setSuggestions] = useState<LocalityCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const skipNextSearchRef = useRef(false);

  const trimmedQuery = manualQuery.trim();

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (trimmedQuery.length < MIN_SEARCH_LENGTH) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await searchLocalitiesAction(trimmedQuery);
      if (cancelled) return;
      if (result.ok) {
        setSuggestions(result.candidates);
        setSearchError(null);
      } else {
        setSuggestions([]);
        setSearchError(result.error);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  function pickSuggestion(candidate: LocalityCandidate) {
    skipNextSearchRef.current = true;
    setManualQuery(candidate.locality);
    setManualDistrict(candidate.district);
    setSuggestions([]);
  }

  const visibleSuggestions = trimmedQuery.length >= MIN_SEARCH_LENGTH ? suggestions : [];
  const canContinue = trimmedQuery.length > 0 && manualDistrict.length > 0;

  return (
    <div className="flex min-h-svh flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-heading text-ink">Where&apos;s this?</h1>
        {location.status !== "granted" ? (
          <p className="text-body text-muted">We couldn&apos;t get your location — search for it below.</p>
        ) : null}
      </header>

      {location.status === "granted" ? (
        <section className="flex flex-col gap-3">
          {candidates === null ? (
            <p className="text-body text-muted">Looking for nearby localities…</p>
          ) : candidates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate) => (
                <PillChip
                  key={`${candidate.locality}-${candidate.district}`}
                  onClick={() => confirm(candidate)}
                >
                  {candidate.locality}
                </PillChip>
              ))}
            </div>
          ) : (
            <p className="text-body text-muted">
              {candidatesError ?? "None of the suggestions matched — search for your locality below."}
            </p>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Search for your locality</span>
          <input
            type="text"
            value={manualQuery}
            onChange={(event) => {
              setManualQuery(event.target.value);
              setManualDistrict("");
            }}
            placeholder="Type a locality name"
            className="rounded-card border border-hairline bg-surface px-4 py-3 text-body text-ink"
          />
        </label>

        {visibleSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleSuggestions.map((suggestion) => (
              <PillChip
                key={`${suggestion.locality}-${suggestion.district}`}
                onClick={() => pickSuggestion(suggestion)}
              >
                {suggestion.locality}
              </PillChip>
            ))}
          </div>
        ) : null}
        {searchError ? <p className="text-caption text-muted">{searchError}</p> : null}

        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">District</span>
          <select
            value={manualDistrict}
            onChange={(event) => setManualDistrict(event.target.value)}
            disabled={trimmedQuery.length === 0}
            className="rounded-card border border-hairline bg-surface px-4 py-3 text-body text-ink disabled:opacity-40"
          >
            <option value="">Select a district</option>
            {DISTRICTS.map((district) => (
              <option key={district.name} value={district.name}>
                {district.name} ({district.state})
              </option>
            ))}
          </select>
        </label>

        <CtaButton
          disabled={!canContinue}
          onClick={() => confirm({ locality: trimmedQuery, district: manualDistrict })}
        >
          Continue
        </CtaButton>
      </section>
    </div>
  );
}
