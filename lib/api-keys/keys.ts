import { randomBytes, createHash } from "crypto";

/**
 * API keys look like `cb_live_<40 random chars>` — the prefix makes a
 * leaked key recognizable at a glance (in a git history scan, a Slack
 * message, etc.) the way Stripe/GitHub keys are. Only the hash is ever
 * stored; the plaintext key is shown exactly once at creation time,
 * same principle as the MFA recovery codes in Phase 1.11.
 */
const KEY_PREFIX = "cb_live_";
const KEY_RANDOM_LENGTH = 40;
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateApiKey(): string {
  const bytes = randomBytes(KEY_RANDOM_LENGTH);
  let random = "";
  for (let i = 0; i < KEY_RANDOM_LENGTH; i++) {
    random += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `${KEY_PREFIX}${random}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

/** A short, non-secret fragment shown in the UI so an admin can tell
 * keys apart without ever displaying the full secret again. */
export function apiKeyLastFour(key: string): string {
  return key.slice(-4);
}

export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length === KEY_PREFIX.length + KEY_RANDOM_LENGTH;
}

export type ApiKeyScope = "read" | "write";

/**
 * Whether a key's granted scopes include the required capability.
 * Matches the `api_keys.scopes text[]` column directly — a Pro-plan key
 * gets `['read']`, a Business-plan key gets `['read', 'write']`, per
 * the pricing table.
 */
export function scopeAllows(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  return scopes.includes(required);
}
