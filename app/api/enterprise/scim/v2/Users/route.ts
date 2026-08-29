import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findScimOrganization, scimUser } from "@/lib/enterprise-identity";

async function orgFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return findScimOrganization(auth.slice(7).trim());
}

export async function GET(request: NextRequest) {
  const organizationId = await orgFromRequest(request);
  if (!organizationId) return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Invalid SCIM credentials", status: "401" }, { status: 401 });
  const admin = createAdminClient();
  const { data: members } = await admin.from("organization_members").select("user_id").eq("organization_id", organizationId);
  const ids = (members ?? []).map(m => m.user_id);
  if (!ids.length) return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"], totalResults: 0, startIndex: 1, itemsPerPage: 0, Resources: [] });
  const { data: users } = await admin.from("users").select("id,email,name").in("id", ids);
  const resources = (users ?? []).map(u => scimUser(u));
  return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"], totalResults: resources.length, startIndex: 1, itemsPerPage: resources.length, Resources: resources });
}

export async function POST(request: NextRequest) {
  const organizationId = await orgFromRequest(request);
  if (!organizationId) return NextResponse.json({ detail: "Invalid SCIM credentials", status: "401" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const email = String(body?.userName ?? body?.emails?.[0]?.value ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ detail: "userName/email is required", status: "400" }, { status: 400 });
  const given = String(body?.name?.givenName ?? "").trim();
  const family = String(body?.name?.familyName ?? "").trim();
  const name = [given, family].filter(Boolean).join(" ") || email.split("@")[0];
  const active = body?.active !== false;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("users").select("id,email,name").eq("email", email).maybeSingle();
  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: false, user_metadata: { name } });
    if (error || !data.user) return NextResponse.json({ detail: error?.message ?? "Unable to provision user", status: "500" }, { status: 500 });
    userId = data.user.id;
  }
  const { data: member } = await admin.from("organization_members").select("id").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  if (!member) await admin.from("organization_members").insert({ organization_id: organizationId, user_id: userId, role: "member" });
  await admin.from("users").update({ name }).eq("id", userId);
  if (!active) await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  return NextResponse.json(scimUser({ id: userId, email, name, active }), { status: 201, headers: { Location: `/api/enterprise/scim/v2/Users/${userId}` } });
}
