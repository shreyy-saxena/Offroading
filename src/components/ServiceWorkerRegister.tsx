"use client";

import { useEffect } from "react";

// Ticket 18 — registers public/sw.js once the app has mounted. A plain
// side-effect component (renders nothing) rather than route-level
// wiring, since installability/offline resilience should apply to every
// page uniformly.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure (unsupported browser, blocked, etc.) just
      // means no offline fallback shell — the app still works online.
    });
  }, []);

  return null;
}
