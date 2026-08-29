"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getOrganizationForWorkspace } from "@/lib/enterprise";
import { logAuditEvent } from "@/lib/audit/log";

async function context() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");
  const org = await getOrganizationForWorkspace(workspace.workspaceId);
  if (!org) redirect("/dashboard/settings?error=Organization+not+configured");
  return { user, workspace, org };
}

export async function updatePrivacySettings(formData: FormData) {
  const { user, workspace, org } = await context();
  const supabase = createClient();
  const residency = String(formData.get("data_residency") ?? "global");
  if (!["global", "us", "eu"].includes(residency)) redirect("/dashboard/organization/privacy?error=Invalid+data+residency");
  const payload = {
    organization_id: org.id,
    pii_detection_enabled: formData.get("pii_detection_enabled") === "on",
    redact_sensitive_logs: formData.get("redact_sensitive_logs") === "on",
    consent_required_for_training: formData.get("consent_required_for_training") === "on",
    data_residency: residency,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("organization_privacy_settings").upsert(payload);
  if (error) redirect(`/dashboard/organization/privacy?error=${encodeURIComponent(error.message)}`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: "privacy.settings_updated", targetType: "organization", targetId: org.id, metadata: { dataResidency: residency } });
  revalidatePath("/dashboard/organization/privacy");
  redirect("/dashboard/organization/privacy?success=Privacy+settings+updated");
}

export async function createDataSubjectRequest(formData: FormData) {
  const { user, workspace, org } = await context();
  const type = String(formData.get("request_type") ?? "export");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  if (!["export", "deletion", "access", "rectification", "restriction"].includes(type)) redirect("/dashboard/organization/privacy?error=Invalid+request+type");
  const supabase = createClient();
  const { error } = await supabase.from("organization_data_subject_requests").insert({ organization_id: org.id, requested_by_user_id: user.id, subject_user_id: user.id, request_type: type, reason: reason || null });
  if (error) redirect(`/dashboard/organization/privacy?error=${encodeURIComponent(error.message)}`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: `privacy.dsr_${type}`, targetType: "data_subject_request", metadata: { organizationId: org.id } });
  revalidatePath("/dashboard/organization/privacy");
  redirect("/dashboard/organization/privacy?success=Privacy+request+submitted");
}

export async function updateDataSubjectRequest(requestId: string, formData: FormData) {
  const { user, workspace, org } = await context();
  const supabase = createClient();
  const { data: membership } = await supabase.from("organization_members").select("role").eq("organization_id", org.id).eq("user_id", user.id).maybeSingle();
  if (!membership || !["owner", "admin", "security_admin"].includes(membership.role)) redirect("/dashboard/organization/privacy?error=Security+admin+permission+required");
  const status = String(formData.get("status") ?? "");
  if (!["processing", "completed", "rejected", "cancelled"].includes(status)) redirect("/dashboard/organization/privacy?error=Invalid+request+status");
  const { error } = await supabase.from("organization_data_subject_requests").update({ status, completed_by_user_id: ["completed","rejected","cancelled"].includes(status) ? user.id : null, completed_at: ["completed","rejected","cancelled"].includes(status) ? new Date().toISOString() : null }).eq("id", requestId).eq("organization_id", org.id);
  if (error) redirect(`/dashboard/organization/privacy?error=${encodeURIComponent(error.message)}`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: `privacy.dsr_${status}`, targetType: "data_subject_request", targetId: requestId, metadata: { organizationId: org.id } });
  revalidatePath("/dashboard/organization/privacy");
  redirect("/dashboard/organization/privacy?success=Request+status+updated");
}
