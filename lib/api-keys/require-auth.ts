import "server-only";
import { NextRequest } from "next/server";
import { authenticateApiKey, type AuthenticatedApiKey } from "@/lib/api-keys/authenticate";
import { scopeAllows, type ApiKeyScope } from "@/lib/api-keys/keys";
import { publicChatRateLimiter } from "@/lib/chat/rate-limit";

export interface ApiAuthResult {
  auth: AuthenticatedApiKey | null;
  errorResponse: Response | null;
  rateLimit?: { remaining: number; limit: number };
}

/**
 * Authenticates the request, checks the required scope, and applies a
 * per-key rate limit — every v1 route calls this first and bails out on
 * a non-null errorResponse. Consolidating this here is what stops each
 * route from silently drifting out of sync on auth/limit behavior.
 */
export async function requireApiAuth(
  request: NextRequest,
  requiredScope: ApiKeyScope
): Promise<ApiAuthResult> {
  const auth = await authenticateApiKey(request.headers.get("authorization"));

  if (!auth) {
    return {
      auth: null,
      errorResponse: Response.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      ),
    };
  }

  if (!scopeAllows(auth.scopes, requiredScope)) {
    return {
      auth: null,
      errorResponse: Response.json(
        { error: `This key doesn't have '${requiredScope}' access` },
        { status: 403 }
      ),
    };
  }

  const rateLimit = await publicChatRateLimiter.checkAndRecord(`apikey:${auth.apiKeyId}`, {
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (!rateLimit.allowed) {
    return {
      auth: null,
      errorResponse: Response.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": "60" } }
      ),
    };
  }

  return { auth, errorResponse: null, rateLimit: { remaining: rateLimit.remaining, limit: 60 } };
}
