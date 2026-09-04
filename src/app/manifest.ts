import type { MetadataRoute } from "next";

// Ticket 18 / PRD FR9 — installable to a phone home screen. Colors match
// the design system's tokens (globals.css: --color-canvas, --color-ink).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Offroading",
    short_name: "Offroading",
    description: "Report potholes, route complaints to the right district authority.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f3",
    theme_color: "#18181b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
