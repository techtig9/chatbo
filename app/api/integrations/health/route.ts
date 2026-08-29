import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data, error } = await supabase.from("integration_connections").select("id,provider,status,account_id,expires_at,scopes,last_used_at,last_error,created_at,updated_at").eq("workspace_id", workspace.workspaceId).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}
