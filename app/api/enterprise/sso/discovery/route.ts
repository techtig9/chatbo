import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const email = String(request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const domain = email.split("@")[1];
  if (!domain) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  const admin = createAdminClient();
  const { data: domains } = await admin.from("organization_domains").select("organization_id,domain,status,enforce_sso").eq("domain", domain).eq("status", "verified");
  if (!domains?.length) return NextResponse.json({ configured: false, domain });
  const orgIds = domains.map(d => d.organization_id);
  const { data: providers } = await admin.from("organization_sso_configs").select("organization_id,provider_type,name,issuer,authorization_url,metadata_url,entity_id,sso_url,enabled,enforce").in("organization_id", orgIds).eq("enabled", true);
  return NextResponse.json({ configured: true, domain, organizations: domains, providers: providers ?? [] });
}
