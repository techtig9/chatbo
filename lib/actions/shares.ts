"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { generateShareSlug } from "@/lib/sharing/slug";
import { parseAllowedDomains } from "@/lib/validation/publish";
import { logAuditEvent } from "@/lib/audit/log";

export async function createShareLink(botId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "bot:publish");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirect(
        `/dashboard/bots/${botId}/publish?error=${encodeURIComponent(
          "Your role doesn't allow publishing bots."
        )}`
      );
    }
    throw err;
  }

  const supabase = createClient();
  let newSlug: string | null = null;

  // Retry once on the astronomically unlikely slug collision rather than
  // trusting a single random draw against a unique constraint.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateShareSlug();
    const { error } = await supabase.from("shares").insert({ bot_id: botId, slug });
    if (!error) {
      newSlug = slug;
      break;
    }
    if (attempt === 2) {
      redirect(
        `/dashboard/bots/${botId}/publish?error=${encodeURIComponent(
          "Couldn't generate a share link. Try again."
        )}`
      );
    }
  }

  revalidatePath(`/dashboard/bots/${botId}/publish`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: "share_link.created",
    targetType: "share",
    metadata: { botId, slug: newSlug },
  });
}

export async function updateAllowedDomains(botId: string, formData: FormData) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "bot:edit");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirect(
        `/dashboard/bots/${botId}/publish?error=${encodeURIComponent(
          "Your role doesn't allow editing this bot."
        )}`
      );
    }
    throw err;
  }

  const raw = (formData.get("allowedDomains") as string) ?? "";
  const parsed = parseAllowedDomains(raw);
  if (!parsed.success) {
    redirect(
      `/dashboard/bots/${botId}/publish?error=${encodeURIComponent(parsed.error)}`
    );
  }
  const domains = parsed.domains;

  const supabase = createClient();
  const { error } = await supabase
    .from("bots")
    .update({ allowed_domains: domains.length > 0 ? domains : null })
    .eq("id", botId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    redirect(
      `/dashboard/bots/${botId}/publish?error=${encodeURIComponent("Couldn't save allowed domains.")}`
    );
  }

  revalidatePath(`/dashboard/bots/${botId}/publish`);
  redirect(`/dashboard/bots/${botId}/publish?success=Saved`);
}
