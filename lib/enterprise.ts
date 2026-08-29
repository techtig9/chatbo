import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OrganizationRole = "owner" | "admin" | "security_admin" | "billing_admin" | "developer" | "analyst" | "member" | "viewer";
export type OrganizationPermission = "agents.manage" | "knowledge.manage" | "workflows.manage" | "approvals.manage" | "channels.manage" | "api.manage" | "billing.manage" | "analytics.read" | "audit.read" | "security.manage" | "members.manage" | "teams.manage";

export async function getOrganizationForWorkspace(workspaceId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("organization_workspaces").select("organization_id, organizations(id, name, owner_id)").eq("workspace_id", workspaceId).maybeSingle();
  const rel = data?.organizations as unknown;
  return Array.isArray(rel) ? rel[0] ?? null : rel ?? null;
}

export async function listTeams(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("teams").select("id,name,description,created_at").eq("organization_id", organizationId).order("name");
  return data ?? [];
}

export async function listOrganizationMembers(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("organization_members").select("id,user_id,role,created_at").eq("organization_id", organizationId).order("created_at");
  if (!data?.length) return [];
  const { data: users } = await supabase.from("users").select("id,email,name").in("id", data.map(x => x.user_id));
  const byId = new Map((users ?? []).map(u => [u.id, u]));
  return data.map(m => ({ ...m, email: byId.get(m.user_id)?.email ?? "Unknown", name: byId.get(m.user_id)?.name ?? null }));
}
