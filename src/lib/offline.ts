// Ticket 18 — distinct from the service worker's navigation-only offline
// fallback (public/sw.js): this is what the report-submission flow uses
// to show a clear "you're offline" message for an in-page action (a
// Server Action POST), which the service worker deliberately never
// intercepts.
export const OFFLINE_MESSAGE = "You're offline. Reconnect and try again to submit your report.";

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine;
}
