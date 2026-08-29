import { createHmac } from "crypto";

/**
 * Signs an outbound webhook payload so the receiving customer's server
 * can verify it actually came from chatbo.ai — the same principle as
 * the Paddle signature we verify on the way in (lib/billing/paddle-webhook.ts),
 * just the opposite direction. Timestamp is included in the signed
 * string so a replayed-later delivery is detectable by the receiver.
 */
export function signWebhookPayload(
  payload: string,
  timestamp: string,
  secret: string
): string {
  return createHmac("sha256", secret).update(`${timestamp}:${payload}`).digest("hex");
}

export function buildWebhookSignatureHeader(payload: string, secret: string): {
  header: string;
  timestamp: string;
} {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signWebhookPayload(payload, timestamp, secret);
  return { header: `ts=${timestamp};h1=${signature}`, timestamp };
}
