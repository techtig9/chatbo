import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeManifest, slugifyMarketplaceTitle, type AgentMarketplaceManifest } from "./catalog";

export async function buildAgentManifest(botId: string): Promise<AgentMarketplaceManifest | null> {
  const supabase = createClient();
  const { data: bot } = await supabase.from("bots").select("id,name,description,use_case,tone,system_prompt,agent_config,model,welcome_message,starter_questions").eq("id", botId).maybeSingle();
  if (!bot) return null;
  const { count: knowledgeSources } = await supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("bot_id", botId);
  const { count: workflows } = await supabase.from("workflows").select("id", { count: "exact", head: true }).eq("bot_id", botId);
  return sanitizeManifest({
    schemaVersion: 1,
    title: bot.name,
    description: bot.description ?? "",
    category: String(bot.use_case ?? "general"),
    tags: [],
    license: "standard",
    requirements: { integrations: [], knowledgeSources: knowledgeSources ?? 0, workflows: workflows ?? 0 },
    agent: {
      useCase: String(bot.use_case ?? "general"), tone: String(bot.tone ?? "professional"), model: bot.model,
      systemPrompt: bot.system_prompt, agentConfig: (bot.agent_config ?? {}) as Record<string, unknown>,
      welcomeMessage: bot.welcome_message, starterQuestions: bot.starter_questions ?? [],
    },
  });
}

export async function publishAgent(params: { botId: string; workspaceId: string; title: string; description: string; category: string; tags: string[]; visibility: "private" | "unlisted" | "public"; pricingType: "free" | "paid"; priceCents: number; license: string; }) {
  const supabase = createClient();
  const manifest = await buildAgentManifest(params.botId);
  if (!manifest) throw new Error("Agent not found");
  manifest.title = params.title.trim().slice(0, 120) || manifest.title;
  manifest.description = params.description.trim().slice(0, 2000);
  manifest.category = params.category;
  manifest.tags = params.tags;
  manifest.license = params.license;
  const sanitized = sanitizeManifest(manifest);
  const slug = slugifyMarketplaceTitle(sanitized.title) + "-" + params.botId.slice(0, 8);
  const checksum = await sha256(JSON.stringify(sanitized));
  const { data: listing, error } = await (supabase as any).from("marketplace_listings").upsert({
    workspace_id: params.workspaceId, bot_id: params.botId, slug, title: sanitized.title, description: sanitized.description,
    category: sanitized.category, tags: sanitized.tags, visibility: params.visibility, status: params.visibility === "public" ? "pending_review" : "draft",
    pricing_type: params.pricingType, price_cents: Math.max(0, Math.floor(params.priceCents)), license: params.license,
    security_scan_status: "pending", security_scan_report: { checks: ["secret-scrub", "tenant-id-scrub", "manifest-schema"] },
  }, { onConflict: "workspace_id,bot_id" }).select("*").single();
  if (error || !listing) throw new Error(error?.message ?? "Unable to publish agent");
  const { error: versionError } = await (supabase as any).from("marketplace_versions").upsert({ listing_id: listing.id, version: "1.0.0", manifest: sanitized, changelog: "Initial marketplace release", checksum }, { onConflict: "listing_id,version" });
  if (versionError) throw new Error(versionError.message);
  return listing;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
