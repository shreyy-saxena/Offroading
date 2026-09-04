// Ticket 18 / PRD FR9 — installable PWA shell resilience. Deliberately
// minimal: this precaches and serves one static offline fallback page for
// failed navigations, rather than attempting to precache the actual
// dynamic app (Next's static asset filenames are content-hashed and
// change every build, making that fragile and out of scope for "basic
// shell resilience" — full offline data sync/queueing is an explicit
// non-goal, per the ticket). Real pages and data still require
// connectivity; the app's own client code (src/lib/offline.ts) is what
// surfaces a clear "you're offline" message for in-page actions like
// submitting a report, which this service worker doesn't touch.

const CACHE_NAME = "offroading-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Only intercepts full-page navigations (address-bar loads, link clicks,
// reloads) — never data fetches or Server Action POSTs, which must keep
// failing normally so the app's own offline handling can respond to them.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error())),
  );
});
