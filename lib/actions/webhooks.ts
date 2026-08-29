"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { generateWebhookSecret } from "@/lib/webhooks/secret";
import { logAuditEvent } from "@/lib/audit/log";
import { z } from "zod";

const VALID_EVENTS = ["conversation.started", "message.created", "feedback.submitted"] as const;

const createEndpointSchema = z.object({
  url: z.string().trim().url(),
  events: z.array(z.enum(VALID_EVENTS)).min(1, "Pick at least one event"),
});

function redirectWithError(message: string): never {
  redirect(`/dashboard/settings/webhooks?error=${encodeURIComponent(message)}`);
}

export async function createWebhookEndpoint(formData: FormData): Promise<{ success: boolean; error?: string; secret?: string }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "webhook:manage");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      return { success: false, error: "Your role doesn't allow managing webhooks." };
    }
    throw err;
  }

  if (!PLAN_LIMITS[workspace.plan].features.outboundWebhooks) {
    return { success: false, error: "Outbound webhooks are available on the Business plan." };
  }

  const events = formData.getAll("events") as string[];
  const parsed = createEndpointSchema.safeParse({
    url: formData.get("url"),
    events,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const secret = generateWebhookSecret();
  const supabase = createClient();
  const { data: endpoint, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      workspace_id: workspace.workspaceId,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
    })
    .select("id")
    .single();

  if (error || !endpoint) {
    return { success: false, error: "Couldn't create the webhook endpoint." };
  }

  revalidatePath("/dashboard/settings/webhooks");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "webhook_endpoint.created",
    targetType: "webhook_endpoint",
    targetId: endpoint.id,
    metadata: { url: parsed.data.url, events: parsed.data.events },
  });
  // The secret is only ever returned here, at creation — never re-readable
  // afterward (the endpoints list below only selects id/url/events/status),
  // matching the same "shown once" security pattern as API keys.
  return { success: true, secret };
}

export async function deleteWebhookEndpoint(endpointId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "webhook:manage");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirectWithError("Your role doesn't allow managing webhooks.");
    }
    throw err;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", endpointId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) redirectWithError("Couldn't delete the webhook endpoint.");

  revalidatePath("/dashboard/settings/webhooks");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: "webhook_endpoint.deleted",
    targetType: "webhook_endpoint",
    targetId: endpointId,
  });
}
