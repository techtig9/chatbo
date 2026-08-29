"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { generateApiKey, hashApiKey, type ApiKeyScope } from "@/lib/api-keys/keys";
import { logAuditEvent } from "@/lib/audit/log";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Give this key a name").max(100),
});

function redirectWithError(message: string): never {
  redirect(`/dashboard/settings/api-keys?error=${encodeURIComponent(message)}`);
}

/**
 * Returns the plaintext key exactly once — the caller (a client
 * component) is responsible for displaying it and never re-fetching it,
 * since only the hash is stored after this call returns.
 */
export async function createApiKey(formData: FormData): Promise<{ key?: string; error?: string }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "apikey:manage");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      return { error: "Your role doesn't allow managing API keys." };
    }
    throw err;
  }

  const planApiAccess = PLAN_LIMITS[workspace.plan].features.publicApi;
  if (planApiAccess === "none") {
    return { error: "The public API is available on Pro and Business plans." };
  }

  const parsed = createApiKeySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }
  const name = parsed.data.name;

  const scopes: ApiKeyScope[] = planApiAccess === "read-write" ? ["read", "write"] : ["read"];

  const key = generateApiKey();
  const supabase = createClient();
  const { error } = await supabase.from("api_keys").insert({
    workspace_id: workspace.workspaceId,
    name,
    key_hash: hashApiKey(key),
    scopes,
  });

  if (error) {
    return { error: "Couldn't create the key. Try again." };
  }

  revalidatePath("/dashboard/settings/api-keys");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "api_key.created",
    targetType: "api_key",
    metadata: { name, scopes },
  });

  return { key };
}

export async function revokeApiKey(keyId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "apikey:manage");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirectWithError("Your role doesn't allow managing API keys.");
    }
    throw err;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) redirectWithError("Couldn't revoke the key.");

  revalidatePath("/dashboard/settings/api-keys");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: keyId,
  });
}
