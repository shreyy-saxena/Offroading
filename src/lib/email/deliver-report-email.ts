import { ResendError, sendEmail } from "./resend-client";

export type DeliveryOutcome = { status: "sent" } | { status: "failed"; error: string };

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries a transient failure (429/5xx/network) a bounded number of times
// with backoff; a permanent failure (4xx address/validation errors)
// settles to "failed" immediately, no retry. No DB access here — this is
// a pure send capability. Callers own persisting the outcome onto
// whichever report row it belongs to (ticket 08 for the immediate-send
// path, ticket 15 for the later-triggered queued path) — see this
// ticket's Comments for why.
async function sendWithRetry(input: { to: string | string[]; subject: string; html: string }): Promise<DeliveryOutcome> {
  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await sendEmail(input);
      return { status: "sent" };
    } catch (error) {
      if (!(error instanceof ResendError)) throw error;

      lastError = error.message;
      if (error.permanent || attempt === MAX_ATTEMPTS) {
        return { status: "failed", error: error.message };
      }
      await delay(BACKOFF_BASE_MS * attempt);
    }
  }

  return { status: "failed", error: lastError };
}

export type ReportEmailDetails = {
  photoUrl: string;
  locality: string;
  district: string;
  // Null when the citizen went through ticket 06's manual-locality path
  // (no device GPS reading) — never faked as 0,0.
  latitude: number | null;
  longitude: number | null;
  reporterType: "passerby" | "resident";
  reporterName: string;
  reporterMobile: string;
  reporterEmail: string;
};

function renderComplaintEmailHtml(details: ReportEmailDetails): string {
  const locationLine =
    details.latitude !== null && details.longitude !== null
      ? `<p>Location: ${details.latitude.toFixed(5)}, ${details.longitude.toFixed(5)}</p>`
      : "";

  return `
    <p>A pothole has been reported near <strong>${details.locality}, ${details.district}</strong>.</p>
    ${locationLine}
    <p><img src="${details.photoUrl}" alt="Reported pothole" style="max-width: 480px;" /></p>
    <p>
      Reported by a ${details.reporterType === "resident" ? "resident" : "passer-by"}:<br />
      ${details.reporterName}<br />
      ${details.reporterMobile}<br />
      ${details.reporterEmail}
    </p>
  `.trim();
}

export async function sendComplaintEmail(
  details: ReportEmailDetails,
  authorityEmails: string[],
): Promise<DeliveryOutcome> {
  return sendWithRetry({
    to: authorityEmails,
    subject: `Pothole reported in ${details.locality}, ${details.district}`,
    html: renderComplaintEmailHtml(details),
  });
}

// PRD 12.4 / spec "Queued reports": a distinct, callable path — ticket 15
// calls this once a later CSV upload newly covers a queued report's
// district, separate from the original complaint send above.
export async function sendQueuedReportConfirmation(input: {
  to: string;
  locality: string;
  district: string;
}): Promise<DeliveryOutcome> {
  return sendWithRetry({
    to: input.to,
    subject: "Your pothole report has been sent to the authorities",
    html: `<p>Your report near <strong>${input.locality}, ${input.district}</strong> has now been emailed to the local authority. Thank you for reporting it.</p>`,
  });
}
