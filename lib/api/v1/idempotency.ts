import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

export async function getIdempotentResponse(args: {
  workspaceId: string;
  apiKeyId: string;
  key: string;
  requestHash: string;
}) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("api_idempotency_keys")
    .select("request_hash, response_status, response_body")
    .eq("workspace_id", args.workspaceId)
    .eq("api_key_id", args.apiKeyId)
    .eq("idempotency_key", args.key)
    .maybeSingle();
  if (!data) return null;
  if (data.request_hash !== args.requestHash) {
    return { conflict: true as const };
  }
  return {
    conflict: false as const,
    response: Response.json(data.response_body ?? {}, { status: data.response_status }),
  };
}

export async function saveIdempotentResponse(args: {
  workspaceId: string;
  apiKeyId: string;
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
}) {
  const supabase = createAdminClient();
  await supabase.from("api_idempotency_keys").insert({
    workspace_id: args.workspaceId,
    api_key_id: args.apiKeyId,
    idempotency_key: args.key,
    request_hash: args.requestHash,
    response_status: args.responseStatus,
    response_body: args.responseBody as any,
  });
}
