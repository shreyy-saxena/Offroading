import { headers } from "next/headers";

// Server-only: derives this deployment's own origin from the incoming
// request's headers, rather than a hardcoded canonical domain — works
// uniformly across local dev, preview, and production with no config.
export async function getSiteOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function getReportPermalinkUrl(reportId: string): Promise<string> {
  const origin = await getSiteOrigin();
  return `${origin}/reports/${reportId}`;
}
