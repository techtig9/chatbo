import { NextResponse } from "next/server";
import { createOAuthStart } from "@/lib/integrations/oauth";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getIntegrationProvider } from "@/lib/integrations/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.redirect(new URL("/login", request.url));
  const providerKey = new URL(request.url).searchParams.get("provider") ?? "";
  if (!getIntegrationProvider(providerKey)) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  try {
    const callback = new URL("/api/integrations/callback", request.url).toString();
    const url = await createOAuthStart(workspace.workspaceId, providerKey, callback);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start OAuth";
    return NextResponse.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url));
  }
}
