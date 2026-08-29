import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logRequest, generateRequestId } from "./logger";

/** Handlers set ctx.workspaceId once they know it (usually right after
 * authenticating) — the wrapper reads it back after the handler
 * returns, so the final log line includes it without every route
 * needing its own logging call. */
export interface RequestLogContext {
  workspaceId?: string | null;
}

export function withRequestLogging<Args extends unknown[]>(
  routeName: string,
  handler: (request: NextRequest, ctx: RequestLogContext, ...args: Args) => Promise<Response>
) {
  return async (request: NextRequest, ...args: Args): Promise<Response> => {
    const requestId = generateRequestId();
    const start = Date.now();
    const ctx: RequestLogContext = {};

    try {
      const response = await handler(request, ctx, ...args);
      logRequest({
        requestId,
        route: routeName,
        method: request.method,
        workspaceId: ctx.workspaceId,
        latencyMs: Date.now() - start,
        outcome: response.status < 400 ? "success" : "error",
        status: response.status,
      });
      response.headers.set("X-Request-Id", requestId);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Sentry.captureException(err, { tags: { route: routeName, requestId } });
      logRequest({
        requestId,
        route: routeName,
        method: request.method,
        workspaceId: ctx.workspaceId,
        latencyMs: Date.now() - start,
        outcome: "error",
        status: 500,
        errorMessage: message,
      });
      return Response.json(
        { error: "Internal server error", requestId },
        { status: 500, headers: { "X-Request-Id": requestId } }
      );
    }
  };
}
