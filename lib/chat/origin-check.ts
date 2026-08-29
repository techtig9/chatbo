/**
 * A bot with no allowlist configured (`allowedDomains` null/empty) is
 * embeddable anywhere. Once set, only those domains (and their
 * subdomains) may embed the widget; the hosted /chat/[slug] page and
 * in-dashboard playground never go through this check, since those
 * aren't embeds.
 */
export function isOriginAllowed(
  origin: string | null,
  allowedDomains: string[] | null
): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  if (!origin) return false;

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  return allowedDomains.some((domain) => {
    const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, "");
    return hostname === normalized || hostname.endsWith(`.${normalized}`);
  });
}
