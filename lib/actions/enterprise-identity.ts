"use server";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getOrganizationForWorkspace } from "@/lib/enterprise";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { generateScimToken, hashScimToken } from "@/lib/enterprise-identity";

async function context() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");
  if (!authorizeWorkspaceAction(workspace.role, "organization:security")) redirect("/dashboard/organization?error=Security+admin+permission+required");
  const org = await getOrganizationForWorkspace(workspace.workspaceId);
  if (!org) redirect("/dashboard/settings?error=Organization+not+configured");
  return { user, workspace, org };
}

export async function addDomain(formData: FormData) {
  const { org } = await context();
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) redirect("/dashboard/organization/security?error=Enter+a+valid+domain");
  const token = crypto.randomBytes(18).toString("hex");
  const supabase = createClient();
  const { error } = await supabase.from("organization_domains").insert({ organization_id: org.id, domain, verification_token: token });
  if (error) redirect(`/dashboard/organization/security?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/organization/security");
  redirect("/dashboard/organization/security?success=Domain+added");
}

export async function updateSecuritySettings(formData: FormData) {
  const { org } = await context();
  const requireMfa = formData.get("requireMfa") === "on";
  const enforceSso = formData.get("enforceSso") === "on";
  const restrict = formData.get("restrictDomains") === "on";
  const timeout = Math.min(10080, Math.max(15, Number(formData.get("sessionTimeout") || 480)));
  const ips = String(formData.get("ipAllowlist") ?? "").split(/\s+/).map(x => x.trim()).filter(Boolean);
  const supabase = createClient();
  const { error } = await supabase.from("organization_security_settings").upsert({ organization_id: org.id, require_mfa: requireMfa, enforce_sso: enforceSso, restrict_to_verified_domains: restrict, session_timeout_minutes: timeout, ip_allowlist: ips });
  if (error) redirect(`/dashboard/organization/security?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/organization/security");
  redirect("/dashboard/organization/security?success=Security+settings+saved");
}

export async function createScimToken(formData: FormData) {
  const { org } = await context();
  const name = String(formData.get("name") ?? "SCIM Provisioning").trim().slice(0, 80) || "SCIM Provisioning";
  const raw = generateScimToken();
  const supabase = createClient();
  const { error } = await supabase.from("organization_scim_tokens").insert({ organization_id: org.id, name, token_hash: hashScimToken(raw) });
  if (error) redirect(`/dashboard/organization/security?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/organization/security");
  redirect(`/dashboard/organization/security?scimToken=${encodeURIComponent(raw)}`);
}

export async function revokeScimToken(tokenId: string) {
  const { org } = await context();
  const supabase = createAdminClient();
  await supabase.from("organization_scim_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", tokenId).eq("organization_id", org.id);
  revalidatePath("/dashboard/organization/security");
  redirect("/dashboard/organization/security?success=SCIM+token+revoked");
}
