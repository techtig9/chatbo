import "server-only";

/**
 * Chatbo design system — error states (spec section 90): "Errors should
 * explain what happened, why, and what the user can do. Do not expose
 * technical stack traces to customers." Several server actions were
 * catching an exception and passing its raw .message straight through to
 * user-visible UI text — sometimes up to 500 characters of whatever a
 * database driver, fetch(), or third-party SDK happened to throw. This
 * generalizes the pattern lib/ai/gateway.ts's GatewayExhaustedError
 * already used correctly (log the real error server-side, show a safe
 * category-appropriate message to the user) so every catch block doesn't
 * need to reinvent it.
 *
 * `context` is a short, human description of the action that failed
 * (e.g. "index that source", "generate the agent") — used only in the
 * generic fallback branch, so the message stays specific to what the
 * user was actually doing without ever echoing the exception itself.
 */
export function toUserMessage(error: unknown, context: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (/timed?\s*out|timeout|econnreset|econnrefused|network|fetch failed/.test(lower)) {
    return `We couldn't reach the service needed to ${context} — it may be temporarily unavailable. Try again in a moment.`;
  }
  if (/rate limit|429|too many requests|quota/.test(lower)) {
    return `We hit a rate limit trying to ${context}. Wait a minute and try again.`;
  }
  if (/unauthorized|forbidden|401|403|invalid.{0,20}(key|token|credential)/.test(lower)) {
    return `We couldn't authenticate to ${context} — the connected account or credential may need to be reconnected.`;
  }
  if (/not found|404/.test(lower)) {
    return `We couldn't find what was needed to ${context}. Double-check it still exists and try again.`;
  }

  // Anything else is treated as unrecognized rather than shown verbatim
  // — a raw driver/SDK exception is exactly the "stack trace" spec
  // section 90 says never to expose. The real error is still the
  // caller's job to log server-side before calling this.
  return `Something went wrong trying to ${context}. Try again, and contact support if it keeps happening.`;
}
