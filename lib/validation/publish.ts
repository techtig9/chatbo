import { z } from "zod";

const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

const singleDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((d) => !d.startsWith("http://") && !d.startsWith("https://"), {
    message: "Enter a bare domain, not a full URL (no https://)",
  })
  .refine((d) => HOSTNAME_PATTERN.test(d), {
    message: "Doesn't look like a valid domain",
  });

export const allowedDomainsListSchema = z
  .array(singleDomainSchema)
  .max(50, "50 domains max");

/**
 * Parses the newline-separated textarea input into a validated domain
 * list. Returns either the clean array or the first validation error
 * message — the caller decides how to surface that.
 */
export function parseAllowedDomains(
  raw: string
): { success: true; domains: string[] } | { success: false; error: string } {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result = allowedDomainsListSchema.safeParse(lines);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid domain list" };
  }

  return { success: true, domains: result.data };
}
