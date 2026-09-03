const RESEND_API_URL = "https://api.resend.com/emails";

// permanent = true means retrying won't help (bad request/address/etc,
// any 4xx except 429 rate-limiting); false means it's worth another
// attempt (429, 5xx, network failure).
export class ResendError extends Error {
  constructor(
    message: string,
    public readonly permanent: boolean,
  ) {
    super(message);
  }
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

// No NEXT_PUBLIC_ prefix on RESEND_API_KEY (ticket 01's env scaffold) —
// server-only, same boundary as LocationIQ and the Supabase service role.
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new ResendError("RESEND_API_KEY is not configured.", true);
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // Resend's shared sandbox sending domain for v1 (PRD 12.4) — no
    // dedicated verified domain yet.
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Offroading <onboarding@resend.dev>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (response.ok) return;

  const body: unknown = await response.json().catch(() => ({}));
  const message =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : `Resend request failed with status ${response.status}`;

  const permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
  throw new ResendError(message, permanent);
}
