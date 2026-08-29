import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, type ApiKeyScope } from "./keys";

export interface AuthenticatedApiKey {
  apiKeyId: string;
  workspaceId: string;
  scopes: ApiKeyScope[];
}

/**
 * Extracts and validates the `Authorization: Bearer cb_live_...` header
 * against the hashed keys table. Returns null for anything invalid —
 * callers respond 401, this function doesn't know about HTTP.
 */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<AuthenticatedApiKey | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.slice("Bearer ".length).trim();
  if (!key) return null;

  const supabase = createAdminClient();
  const keyHash = hashApiKey(key);

  const { data: row } = await supabase
    .from("api_keys")
    .select("id, workspace_id, scopes, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!row || row.revoked_at) return null;

  // Fire-and-forget — a failed last_used_at update shouldn't block the
  // actual API request it's just bookkeeping for.
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return {
    apiKeyId: row.id,
    workspaceId: row.workspace_id,
    scopes: row.scopes as ApiKeyScope[],
  };
}
