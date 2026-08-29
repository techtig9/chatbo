import "server-only";
import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "chatbo.ai <notifications@chatbo.ai>";

let cachedClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY. Set it in .env.local to send email.");
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

/**
 * Sends one transactional email. Never throws on failure — email is a
 * nice-to-have notification channel, not something that should take
 * down the credit-deduction or webhook flow that triggered it. Errors
 * are logged for now; worth wiring to Sentry once Phase 1.15 exists.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error(`Failed to send email "${params.subject}" to ${params.to}:`, error.message);
    }
  } catch (err) {
    console.error(`Email send threw for "${params.subject}":`, err);
  }
}
