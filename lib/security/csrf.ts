/**
 * Verifies a state-changing request actually originated from this
 * app's own frontend, not a form on some other site silently POSTing
 * to this endpoint using the browser's ambient session cookie — the
 * classic CSRF attack. Next.js Server Actions get this check
 * automatically; plain Route Handlers (like the two cookie-session-
 * authenticated ones in this app) do not, so they need it explicitly.
 *
 * Public, unauthenticated routes (the widget, the public API) never
 * call this — they're not cookie-authenticated, so CSRF doesn't apply
 * to them the same way (there's no ambient session to forge a request
 * with).
 */
export function isSameOriginRequest(
  originHeader: string | null,
  hostHeader: string | null
): boolean {
  if (!originHeader || !hostHeader) return false;

  let originHost: string;
  try {
    originHost = new URL(originHeader).host;
  } catch {
    return false;
  }

  return originHost === hostHeader;
}
