import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paddle signs webhooks with a header like `ts=<timestamp>;h1=<hex hmac>`
 * where the HMAC-SHA256 is computed over `${ts}:${rawBody}` using the
 * webhook secret. Verifying this BEFORE parsing the body as JSON is
 * what stops someone from posting a forged "subscription upgraded" event
 * straight at this endpoint — the one function in the whole billing
 * system that exists purely to stop free upgrades via a fake webhook,
 * so it gets its own focused test coverage.
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => {
      const [key, value] = kv.split("=");
      return [key, value];
    })
  );

  const timestamp = parts.ts;
  const receivedHash = parts.h1;
  if (!timestamp || !receivedHash) return false;

  const expectedHash = createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest("hex");

  // Constant-time comparison — a naive === here would let an attacker
  // recover the correct signature one byte at a time via timing.
  const expected = Buffer.from(expectedHash, "hex");
  const received = Buffer.from(receivedHash, "hex");
  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}
