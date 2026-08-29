import "server-only";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SsoProviderType = "saml" | "oidc";

export function generateScimToken() {
  return `cb_scim_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashScimToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function listIdentityConfig(organizationId: string) {
  const supabase = createClient();
  const [{ data: domains }, { data: sso }, { data: security }] = await Promise.all([
    supabase.from("organization_domains").select("id,domain,status,enforce_sso,created_at,verified_at,verification_token").eq("organization_id", organizationId).order("domain"),
    supabase.from("organization_sso_configs").select("id,provider_type,name,issuer,client_id,authorization_url,token_url,metadata_url,entity_id,sso_url,enabled,enforce,created_at,updated_at").eq("organization_id", organizationId).order("name"),
    supabase.from("organization_security_settings").select("organization_id,require_mfa,enforce_sso,restrict_to_verified_domains,ip_allowlist,session_timeout_minutes,updated_at").eq("organization_id", organizationId).maybeSingle(),
  ]);
  return { domains: domains ?? [], sso: sso ?? [], security: security ?? null };
}

export async function findScimOrganization(token: string) {
  const hash = hashScimToken(token);
  const admin = createAdminClient();
  const { data } = await admin.from("organization_scim_tokens").select("id,organization_id,expires_at,revoked_at").eq("token_hash", hash).maybeSingle();
  if (!data || data.revoked_at || (data.expires_at && new Date(data.expires_at) <= new Date())) return null;
  await admin.from("organization_scim_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.organization_id;
}

export function scimUser(user: { id: string; email: string; name?: string | null; active?: boolean }) {
  const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    active: user.active ?? true,
    name: { givenName: parts[0] ?? "", familyName: parts.slice(1).join(" ") },
    emails: [{ value: user.email, primary: true, type: "work" }],
    meta: { resourceType: "User" },
  };
}
