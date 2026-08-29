import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

export async function POST(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.provider !== "string") return NextResponse.json({ error: "provider is required" }, { status: 400 });
  const supabase = createClient();
  const { error } = await supabase.from("integration_connections").update({ status: "disconnected", encrypted_access_token: null, encrypted_refresh_token: null }).eq("workspace_id", workspace.workspaceId).eq("provider", body.provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
