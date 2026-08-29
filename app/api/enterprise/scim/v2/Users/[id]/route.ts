import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findScimOrganization, scimUser } from "@/lib/enterprise-identity";

async function orgFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? findScimOrganization(auth.slice(7).trim()) : null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = await orgFromRequest(request);
  if (!organizationId) return NextResponse.json({ detail: "Invalid SCIM credentials", status: "401" }, { status: 401 });
  const admin = createAdminClient();
  const { data: member } = await admin.from("organization_members").select("user_id").eq("organization_id", organizationId).eq("user_id", params.id).maybeSingle();
  if (!member) return NextResponse.json({ detail: "User not found", status: "404" }, { status: 404 });
  const { data: user } = await admin.from("users").select("id,email,name").eq("id", params.id).maybeSingle();
  if (!user) return NextResponse.json({ detail: "User not found", status: "404" }, { status: 404 });
  return NextResponse.json(scimUser(user));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = await orgFromRequest(request);
  if (!organizationId) return NextResponse.json({ detail: "Invalid SCIM credentials", status: "401" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const active = body?.active;
  const admin = createAdminClient();
  const { data: member } = await admin.from("organization_members").select("user_id").eq("organization_id", organizationId).eq("user_id", params.id).maybeSingle();
  if (!member) return NextResponse.json({ detail: "User not found", status: "404" }, { status: 404 });
  const name = body?.name ? [body.name.givenName, body.name.familyName].filter(Boolean).join(" ") : undefined;
  if (name !== undefined) await admin.from("users").update({ name }).eq("id", params.id);
  if (typeof active === "boolean") await admin.auth.admin.updateUserById(params.id, { ban_duration: active ? "none" : "876000h" });
  const { data: user } = await admin.from("users").select("id,email,name").eq("id", params.id).maybeSingle();
  return NextResponse.json(scimUser({ ...user!, active: active ?? true }));
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = await orgFromRequest(request);
  if (!organizationId) return NextResponse.json({ detail: "Invalid SCIM credentials", status: "401" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin.from("organization_members").delete().eq("organization_id", organizationId).eq("user_id", params.id);
  if (error) return NextResponse.json({ detail: error.message, status: "500" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
