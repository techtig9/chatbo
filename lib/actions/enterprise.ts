"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getOrganizationForWorkspace } from "@/lib/enterprise";
import { requireWorkspaceAction } from "@/lib/authz/rbac";
import { logAuditEvent } from "@/lib/audit/log";

const ORG_ROLES = ["owner","admin","security_admin","billing_admin","developer","analyst","member","viewer"] as const;

async function context() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");
  requireWorkspaceAction(workspace.role, "member:invite");
  const org = await getOrganizationForWorkspace(workspace.workspaceId);
  if (!org) redirect("/dashboard/settings?error=Enterprise+organization+is+not+configured");
  return { user, workspace, org };
}

export async function createTeam(formData: FormData) {
  const { user, workspace, org } = await context();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || name.length > 80) redirect("/dashboard/organization?error=Team+name+must+be+1-80+characters");
  const supabase = createClient();
  const { error } = await supabase.from("teams").insert({ organization_id: org.id, name, description: description || null });
  if (error) redirect(`/dashboard/organization?error=${encodeURIComponent(error.message)}`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: "team.created", targetType: "team", targetId: name, metadata: { organizationId: org.id } });
  revalidatePath("/dashboard/organization");
  redirect("/dashboard/organization?success=Team+created");
}

export async function deleteTeam(teamId: string) {
  const { user, workspace, org } = await context();
  const supabase = createClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId).eq("organization_id", org.id);
  if (error) redirect(`/dashboard/organization?error=${encodeURIComponent(error.message)}`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: "team.deleted", targetType: "team", targetId: teamId, metadata: { organizationId: org.id } });
  revalidatePath("/dashboard/organization");
  redirect("/dashboard/organization?success=Team+deleted");
}

export async function changeOrganizationMemberRole(memberId: string, formData: FormData) {
  const { user, workspace, org } = await context();
  const role = String(formData.get("role") ?? "");
  if (!ORG_ROLES.includes(role as (typeof ORG_ROLES)[number]) || role === "owner") redirect("/dashboard/organization?error=Invalid+organization+role");
  const supabase = createClient();
  const { data: target } = await supabase.from("organization_members").select("role,user_id").eq("id", memberId).eq("organization_id", org.id).maybeSingle();
  if (!target || target.role === "owner") redirect("/dashboard/organization?error=Owner+role+cannot+be+changed");
  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId).eq("organization_id", org.id);
  if (error) redirect(`/dashboard/organization?error=${encodeURIComponent(error.message)}`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: "organization.member_role_changed", targetType: "organization_member", targetId: memberId, metadata: { fromRole: target.role, toRole: role } });
  revalidatePath("/dashboard/organization");
  redirect("/dashboard/organization?success=Organization+role+updated");
}
