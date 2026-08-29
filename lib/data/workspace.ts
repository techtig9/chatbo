import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Plan, WorkspaceMemberRole } from "@/lib/supabase/types";

export type CurrentWorkspace = {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceMemberRole;
  plan: Plan;
  creditsRemaining: number;
  requireMfa: boolean;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  isPlatformAdmin: boolean;
};

export const ACTIVE_WORKSPACE_COOKIE = "chatbo_active_workspace";

/**
 * Loads the signed-in user plus their active workspace.
 *
 * "Active" is resolved as: the workspace named by the
 * `chatbo_active_workspace` cookie, if the user is actually an
 * *accepted* member of it; otherwise their oldest accepted membership.
 *
 * Filtering on `joined_at is not null` matters more than it looks: a
 * pending invite (Phase 1.10) is a `workspace_members` row that exists
 * before the invitee has accepted it. Without this filter, an invited
 * user would silently gain access to the workspace's bots, billing, and
 * conversations the moment an admin invited them — before they'd ever
 * clicked "Accept."
 */
export async function getCurrentUserAndWorkspace(): Promise<{
  user: CurrentUser | null;
  workspace: CurrentWorkspace | null;
}> {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { user: null, workspace: null };
  }

  const user: CurrentUser = {
    id: authUser.id,
    email: authUser.email ?? "",
    name: (authUser.user_metadata?.name as string | undefined) ?? null,
    isPlatformAdmin: false,
  };

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle();
  user.isPlatformAdmin = userRow?.role === "admin";

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, joined_at, workspaces(id, name, require_mfa)")
    .eq("user_id", authUser.id)
    .not("joined_at", "is", null)
    .order("joined_at", { ascending: true });

  if (!memberships || memberships.length === 0) {
    return { user, workspace: null };
  }

  const preferredWorkspaceId = cookies().get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const activeMembership =
    memberships.find((m) => m.workspace_id === preferredWorkspaceId) ?? memberships[0]!;

  const workspacesRelation = activeMembership.workspaces as unknown;
  const workspaceRow = (Array.isArray(workspacesRelation)
    ? workspacesRelation[0]
    : workspacesRelation) as { id: string; name: string; require_mfa: boolean } | null;

  if (!workspaceRow) {
    return { user, workspace: null };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, credits_remaining")
    .eq("workspace_id", activeMembership.workspace_id)
    .maybeSingle();

  return {
    user,
    workspace: {
      workspaceId: activeMembership.workspace_id,
      workspaceName: workspaceRow.name,
      role: activeMembership.role,
      plan: subscription?.plan ?? "free",
      creditsRemaining: subscription?.credits_remaining ?? 0,
      requireMfa: workspaceRow.require_mfa,
    },
  };
}

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceMemberRole;
}

/** All workspaces the user is an accepted member of — for the switcher. */
export async function listWorkspacesForUser(userId: string): Promise<WorkspaceMembership[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name)")
    .eq("user_id", userId)
    .not("joined_at", "is", null)
    .order("joined_at", { ascending: true });

  return (data ?? []).map((m) => {
    const relation = m.workspaces as unknown;
    const workspaceRow = (Array.isArray(relation) ? relation[0] : relation) as
      | { id: string; name: string }
      | null;
    return {
      workspaceId: m.workspace_id,
      workspaceName: workspaceRow?.name ?? "Unknown workspace",
      role: m.role,
    };
  });
}
