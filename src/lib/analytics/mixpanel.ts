import mixpanel from "mixpanel-browser";

export type AnalyticsEvent =
  | "flow_started"
  | "photo_captured"
  | "location_confirmed"
  | "report_logged"
  | "report_emailed"
  | "shared_on_x"
  | "shared_generic";

let initialized = false;

function ensureInitialized(token: string): void {
  if (initialized) return;
  // ip: false — this app deliberately avoids location tracking (PRD's
  // no-login/minimal-data stance), so skip Mixpanel's own IP-based
  // city/country enrichment too, not just app-level GPS.
  mixpanel.init(token, { ip: false, persistence: "localStorage" });
  initialized = true;
}

// Fires a bare, property-less funnel event — no PII, no location, no
// report content, just "did this citizen reach this point." Silently
// no-ops with no token configured, and never throws: analytics must
// never be able to break the report flow it's observing.
export function trackEvent(event: AnalyticsEvent): void {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return;

  try {
    ensureInitialized(token);
    mixpanel.track(event);
  } catch {
    // See above — a broken/blocked analytics call is never worth
    // surfacing to the citizen mid-report.
  }
}
