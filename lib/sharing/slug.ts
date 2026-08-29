import { randomBytes } from "crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a short, URL-safe, hard-to-guess slug for a bot's hosted
 * share page (chatbo.ai/chat/<slug>). Not cryptographically meant to be
 * a secret — the share page is deliberately public — just long enough
 * that someone can't casually enumerate other customers' bots by
 * guessing slugs.
 */
export function generateShareSlug(length: number = 10): string {
  const bytes = randomBytes(length);
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return slug;
}
