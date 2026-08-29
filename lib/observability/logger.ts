export interface LogFields {
  requestId: string;
  route: string;
  method: string;
  workspaceId?: string | null;
  latencyMs: number;
  outcome: "success" | "error";
  status: number;
  errorMessage?: string;
}

/**
 * Single structured log line per request — request id, workspace id,
 * latency, outcome, per the spec. Plain console.log with a JSON blob
 * rather than a logging library: this is meant to be piped into
 * whatever log aggregation the deploy target already provides (Vercel
 * Logs, etc.), not to own that infrastructure itself.
 */
export function logRequest(fields: LogFields): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...fields });
  if (fields.outcome === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * The spec's explicit Definition of Done for Phase 1.18: "p95 widget
 * first-token latency measured and logged." A dedicated function rather
 * than shoehorning this into logRequest's LogFields — first-token
 * latency isn't itself an HTTP request/response, it's a measurement
 * taken partway through streaming one. Structured the same way (JSON
 * line) so it's queryable the same way once real log aggregation
 * exists — p95 itself is computed by whatever's consuming these lines,
 * not by this function.
 */
export function logFirstTokenLatency(fields: {
  botId: string;
  channel: string;
  latencyMs: number;
  cacheHit: boolean;
}): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      metric: "widget_first_token_latency",
      ...fields,
    })
  );
}
