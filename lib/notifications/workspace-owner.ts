import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface WorkspaceOwnerInfo {
  userId: string;
  email: string;
  name: string | null;
  workspaceName: string;
}

/**
 * Billing notifications (low credits, payment failure) go to the
 * workspace owner specifically — they're the one who can act on it
 * (billing:manage is owner-only per the RBAC model), not every member.
 */
export async function getWorkspaceOwner(workspaceId: string): Promise<WorkspaceOwnerInfo | null> {
  const supabase = createAdminClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) return null;

  const { data: owner } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", workspace.owner_id)
    .maybeSingle();

  if (!owner) return null;

  return {
    userId: owner.id,
    email: owner.email,
    name: owner.name,
    workspaceName: workspace.name,
  };
}
