import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceMemberRole } from "@/lib/supabase/types";

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: WorkspaceMemberRole;
  invitedAt: string;
  joinedAt: string | null;
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
  const supabase = createClient();
  const { data: members } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, invited_at, joined_at")
    .eq("workspace_id", workspaceId)
    .order("invited_at", { ascending: true });

  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase.from("users").select("id, email, name").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  return members.map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: userById.get(m.user_id)?.email ?? "Unknown",
    name: userById.get(m.user_id)?.name ?? null,
    role: m.role,
    invitedAt: m.invited_at,
    joinedAt: m.joined_at,
  }));
}

export interface PendingInvite {
  membershipId: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceMemberRole;
  invitedAt: string;
}

/** Invites addressed to the current user that they haven't accepted yet. */
export async function listPendingInvitesForUser(userId: string): Promise<PendingInvite[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, role, invited_at, workspaces(id, name)")
    .eq("user_id", userId)
    .is("joined_at", null)
    .order("invited_at", { ascending: false });

  return (data ?? []).map((row) => {
    const relation = row.workspaces as unknown;
    const workspaceRow = (Array.isArray(relation) ? relation[0] : relation) as
      | { id: string; name: string }
      | null;
    return {
      membershipId: row.id,
      workspaceId: row.workspace_id,
      workspaceName: workspaceRow?.name ?? "Unknown workspace",
      role: row.role,
      invitedAt: row.invited_at,
    };
  });
}

/**
 * Looks up an existing chatbo.ai account by email for the invite flow.
 * Uses the admin client since this legitimately needs to search across
 * all users, not just the caller's own workspace — the invite action
 * that calls this has already done its own RBAC check before reaching
 * here.
 */
export async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data;
}
