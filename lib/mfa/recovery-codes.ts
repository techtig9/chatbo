import { randomBytes, createHash } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids visual ambiguity
const CODE_LENGTH = 10;
export const RECOVERY_CODE_COUNT = 8;

/**
 * One recovery code, formatted like XXXXX-XXXXX for readability. These
 * are shown to the user exactly once at enrollment time — only the hash
 * is ever persisted (see hashRecoveryCode below).
 */
function generateOneCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, generateOneCode);
}

/**
 * Recovery codes are compared by hash, never stored or logged in
 * plaintext — same principle as a password. Normalizes case/whitespace
 * first so a user pasting a code with a stray space or different case
 * still matches.
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}
