import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

const schema = z.object({ listingId: z.string().uuid(), versionId: z.string().uuid().optional() });

export async function POST(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid install request" }, { status: 400 });
  const supabase = createClient();
  const { data: listing } = await (supabase as any).from("marketplace_listings").select("id,status,visibility,price_cents,pricing_type").eq("id", parsed.data.listingId).maybeSingle();
  if (!listing || listing.status !== "published" || !["public", "unlisted"].includes(listing.visibility)) return NextResponse.json({ error: "Marketplace listing is not available" }, { status: 404 });
  if (listing.pricing_type === "paid" && listing.price_cents > 0) return NextResponse.json({ error: "Paid marketplace checkout is not enabled in this phase" }, { status: 402 });
  const { data: version } = await (supabase as any).from("marketplace_versions").select("id,manifest").eq("listing_id", listing.id).eq(parsed.data.versionId ? "id" : "version", parsed.data.versionId ?? "1.0.0").maybeSingle();
  if (!version) return NextResponse.json({ error: "Marketplace version not found" }, { status: 404 });
  const manifest = version.manifest as any;
  const agent = manifest?.agent;
  if (!agent?.systemPrompt || !agent?.model) return NextResponse.json({ error: "Marketplace manifest is invalid" }, { status: 422 });
  const baseName = String(manifest.title || "Marketplace Agent").slice(0, 80);
  const { data: bot, error: botError } = await (supabase as any).from("bots").insert({
    workspace_id: workspace.workspaceId, created_by: user.id, name: `${baseName} (Template)`, description: String(manifest.description || ""),
    use_case: agent.useCase || "general", tone: agent.tone || "professional", system_prompt: agent.systemPrompt, agent_config: agent.agentConfig || {},
    model: agent.model, welcome_message: agent.welcomeMessage, starter_questions: agent.starterQuestions || [], status: "draft"
  }).select("id,name,status").single();
  if (botError) return NextResponse.json({ error: `Unable to create agent: ${botError.message}` }, { status: 400 });
  const { data: inserted, error } = await (supabase as any).from("marketplace_installs").upsert({ listing_id: listing.id, target_workspace_id: workspace.workspaceId, installed_by: user.id, version_id: version.id, status: "installed", installed_bot_id: bot.id }, { onConflict: "listing_id,target_workspace_id" }).select("*").single();
  if (error) { await (supabase as any).from("bots").delete().eq("id", bot.id); return NextResponse.json({ error: error.message }, { status: 400 }); }
  await (supabase as any).rpc("increment_marketplace_installs", { p_listing_id: listing.id });
  return NextResponse.json({ install: inserted, bot, manifest });
}
