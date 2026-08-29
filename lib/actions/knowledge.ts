"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { canAffordAction, canAddKnowledgeDoc, upgradeMessage } from "@/lib/billing/credits";
import { spendCreditsAtomic } from "@/lib/billing/spend";
import { addTextSourceSchema, addUrlSourceSchema, SUPPORTED_TEXT_FILE_TYPES, SUPPORTED_TEXT_FILE_EXTENSIONS } from "@/lib/validation/knowledge";
import { ingestKnowledgeSource } from "@/lib/knowledge/ingest";
import { toUserMessage } from "@/lib/errors/user-facing";
import { htmlToText } from "@/lib/knowledge/html-to-text";
import { crawlWebsite } from "@/lib/knowledge/crawl";
import { logAuditEvent } from "@/lib/audit/log";

/** Shared guard: RBAC + plan doc-count limit. Redirects on failure. */
async function assertCanAddKnowledgeSource(botId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "knowledge:manage");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirect(
        `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(
          "Your role doesn't allow managing knowledge sources."
        )}`
      );
    }
    throw err;
  }

  const supabase = createClient();
  const { count: currentDocCount } = await supabase
    .from("knowledge_sources")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId);

  if (!canAddKnowledgeDoc(currentDocCount ?? 0, workspace.plan)) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(upgradeMessage("docs"))}`
    );
  }

  const isPlatformAdmin = user.isPlatformAdmin;
  if (!canAffordAction(workspace.creditsRemaining, "knowledgeDocIngested", isPlatformAdmin)) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(upgradeMessage("credits"))}`
    );
  }

  return { user, workspace };
}

export async function addTextSource(botId: string, formData: FormData) {
  const { user, workspace } = await assertCanAddKnowledgeSource(botId);

  const parsed = addTextSourceSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid input"
      )}`
    );
  }

  const supabase = createClient();
  const { data: source, error } = await supabase
    .from("knowledge_sources")
    .insert({
      bot_id: botId,
      type: "text",
      title: parsed.data.title,
      raw_text: parsed.data.content,
      status: "processing",
    })
    .select("id")
    .single();

  if (error || !source) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Couldn't save that source.")}`
    );
  }

  await runIngestAndCharge(botId, source.id, parsed.data.content, workspace.workspaceId, "knowledgeDocIngested");

  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "knowledge_source.added",
    targetType: "knowledge_source",
    targetId: source.id,
    metadata: { botId, type: "text", title: parsed.data.title },
  });
  redirect(`/dashboard/bots/${botId}/knowledge`);
}

export async function addUrlSource(botId: string, formData: FormData) {  const { user, workspace } = await assertCanAddKnowledgeSource(botId);

  const parsed = addUrlSourceSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid input"
      )}`
    );
  }

  const supabase = createClient();
  const { data: source, error } = await supabase
    .from("knowledge_sources")
    .insert({
      bot_id: botId,
      type: "url",
      title: parsed.data.url,
      status: "processing",
    })
    .select("id")
    .single();

  if (error || !source) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Couldn't save that source.")}`
    );
  }

  // Fetch + extract happens here rather than in ingestKnowledgeSource so
  // that function's input stays "plain text" regardless of source type —
  // one ingestion pipeline for text/file/url, not three.
  let pageText: string;
  try {
    const pageResponse = await fetch(parsed.data.url, {
      headers: { "User-Agent": "chatbo.ai-ingest/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!pageResponse.ok) {
      throw new Error(`Page returned ${pageResponse.status}`);
    }
    const html = await pageResponse.text();
    pageText = htmlToText(html);
  } catch (err) {
    await createAdminClient()
      .from("knowledge_sources")
      .update({ status: "failed" })
      .eq("id", source.id);
    console.error(`[knowledge] URL index failed for bot ${botId}`, err);
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(
        toUserMessage(err, "fetch and index that URL")
      )}`
    );
  }

  await runIngestAndCharge(botId, source.id, pageText, workspace.workspaceId, "knowledgeUrlIndexed");

  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "knowledge_source.added",
    targetType: "knowledge_source",
    targetId: source.id,
    metadata: { botId, type: "url", title: parsed.data.url },
  });
  redirect(`/dashboard/bots/${botId}/knowledge`);
}

/**
 * Shared tail end of both add-source actions: ingest, then only charge
 * credits if ingestion actually succeeded — a failed ingestion (bad
 * content, Voyage error, etc.) must deduct nothing, same rule as every
 * other credit-metered action in this build.
 */
async function runIngestAndCharge(
  botId: string,
  sourceId: string,
  text: string,
  workspaceId: string,
  action: "knowledgeDocIngested" | "knowledgeUrlIndexed"
) {
  try {
    await ingestKnowledgeSource(sourceId, botId, text);
    await spendCreditsAtomic(workspaceId, action);
  } catch {
    // ingestKnowledgeSource already marks the source 'failed' internally
    // on error — nothing further to do here except not charge for it.
  }
}

export async function addFileSource(botId: string, formData: FormData) {
  const { user, workspace } = await assertCanAddKnowledgeSource(botId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Choose a file to upload.")}`);
  }

  const lowerName = file.name.toLowerCase();
  const extension = lowerName.includes(".") ? lowerName.slice(lowerName.lastIndexOf(".")) : "";
  const typeAllowed = SUPPORTED_TEXT_FILE_TYPES.includes(file.type as (typeof SUPPORTED_TEXT_FILE_TYPES)[number]);
  const extensionAllowed = SUPPORTED_TEXT_FILE_EXTENSIONS.includes(extension as (typeof SUPPORTED_TEXT_FILE_EXTENSIONS)[number]);
  if (!typeAllowed && !extensionAllowed) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("This phase supports TXT, Markdown, CSV, JSON and HTML files. PDF/DOCX extraction is being added in the document-parser phase.")}`);
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Files must be 5 MB or smaller.")}`);
  }

  let text = "";
  try {
    text = await file.text();
    if (extension === ".html" || extension === ".htm" || file.type === "text/html") text = htmlToText(text);
  } catch {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Couldn't read that file.")}`);
  }
  if (text.trim().length < 20) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("The file does not contain enough readable text.")}`);
  }

  const supabase = createClient();
  const { data: source, error } = await supabase.from("knowledge_sources").insert({
    bot_id: botId,
    type: "file",
    title: file.name,
    raw_text: text,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    status: "processing",
  }).select("id").single();
  if (error || !source) redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Couldn't save that file.")}`);

  try {
    await ingestKnowledgeSource(source.id, botId, text);
    await spendCreditsAtomic(workspace.workspaceId, "knowledgeDocIngested");
  } catch {
    // ingestion marks the source failed; failed documents are not charged
  }

  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "knowledge_source.added",
    targetType: "knowledge_source",
    targetId: source.id,
    metadata: { botId, type: "file", title: file.name, mimeType: file.type, fileSize: file.size },
  });
  redirect(`/dashboard/bots/${botId}/knowledge`);
}

export async function reindexKnowledgeSource(botId: string, sourceId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace || !user) redirect("/login");
  try { requireWorkspaceAction(workspace.role, "knowledge:manage"); } catch {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Your role doesn't allow managing knowledge sources.")}`);
  }
  const supabase = createClient();
  const { data: source } = await supabase.from("knowledge_sources").select("id, raw_text").eq("id", sourceId).eq("bot_id", botId).maybeSingle();
  if (!source?.raw_text) redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("This source has no readable content to re-index.")}`);
  await supabase.from("knowledge_sources").update({ status: "processing", error_message: null }).eq("id", sourceId);
  try {
    await ingestKnowledgeSource(sourceId, botId, source.raw_text);
  } catch { /* source status is set by ingestion */ }
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: "knowledge_source.reindexed", targetType: "knowledge_source", targetId: sourceId, metadata: { botId } });
  redirect(`/dashboard/bots/${botId}/knowledge`);
}

export async function deleteKnowledgeSource(botId: string, sourceId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "knowledge:manage");
  } catch {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(
        "Your role doesn't allow managing knowledge sources."
      )}`
    );
  }

  const supabase = createClient();
  // knowledge_chunks has `on delete cascade` from knowledge_sources, so
  // this one delete removes the source's chunks too.
  const { data: deletedSource, error } = await supabase
    .from("knowledge_sources")
    .delete()
    .eq("id", sourceId)
    .select("title")
    .maybeSingle();

  if (error) {
    redirect(
      `/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Couldn't delete that source.")}`
    );
  }

  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: "knowledge_source.deleted",
    targetType: "knowledge_source",
    targetId: sourceId,
    metadata: { botId, title: deletedSource?.title },
  });
}

/**
 * Same effect as addTextSource, but returns a result object instead of
 * redirecting — for the Create Agent wizard's Knowledge step, which stays
 * on one client-rendered page across all 6 steps rather than navigating
 * between full pages. addTextSource itself is unchanged (still used by
 * the standalone Knowledge page), so this shares its core logic
 * (RBAC + plan-limit check, insert, ingest, credit spend, audit log)
 * rather than re-deriving it.
 */
export async function addTextSourceForWizard(
  botId: string,
  title: string,
  content: string
): Promise<{ success: boolean; error?: string; sourceId?: string }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return { success: false, error: "Not signed in." };

  try {
    requireWorkspaceAction(workspace.role, "knowledge:manage");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      return { success: false, error: "Your role doesn't allow managing knowledge sources." };
    }
    throw err;
  }

  const supabase = createClient();
  const { count } = await supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("bot_id", botId);
  if (!canAddKnowledgeDoc(count ?? 0, workspace.plan)) {
    return { success: false, error: upgradeMessage("docs") };
  }

  const parsed = addTextSourceSchema.safeParse({ title, content });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { data: source, error } = await supabase
    .from("knowledge_sources")
    .insert({ bot_id: botId, type: "text", title: parsed.data.title, raw_text: parsed.data.content, status: "processing" })
    .select("id")
    .single();
  if (error || !source) return { success: false, error: "Couldn't save that source." };

  await runIngestAndCharge(botId, source.id, parsed.data.content, workspace.workspaceId, "knowledgeDocIngested");

  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "knowledge_source.added",
    targetType: "knowledge_source",
    targetId: source.id,
    metadata: { botId, type: "text", title: parsed.data.title },
  });
  return { success: true, sourceId: source.id };
}

/**
 * Crawls up to a few dozen same-origin pages from a website and adds each
 * as its own "website" knowledge source (spec section 74's distinct
 * Website type — a multi-page crawl, not a single "url" source). Reuses
 * lib/knowledge/crawl.ts, which already existed and worked (there's
 * already a /api/knowledge/crawl route calling it) but was never wired
 * to anything that actually saved the results as knowledge.
 *
 * Stops adding pages once the workspace's plan doc limit is hit rather
 * than failing the whole crawl outright — a 25-page crawl against a
 * 20-doc-remaining budget should save the 20 it can, not save nothing.
 */
export async function addWebsiteSource(botId: string, formData: FormData) {
  const { user, workspace } = await assertCanAddKnowledgeSource(botId);

  const startUrl = String(formData.get("url") ?? "").trim();
  if (!startUrl) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Enter a website URL to crawl.")}`);
  }
  try {
    const parsed = new URL(startUrl);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error();
  } catch {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("Enter a valid http(s) URL.")}`);
  }

  const supabase = createClient();
  const { count: currentCount } = await supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("bot_id", botId);
  const { data: subscription } = await supabase.from("subscriptions").select("plan").eq("workspace_id", workspace.workspaceId).maybeSingle();
  const plan = subscription?.plan ?? "free";

  let pages;
  try {
    pages = await crawlWebsite(startUrl, 25);
  } catch (err) {
    console.error(`[knowledge] website crawl failed for bot ${botId}`, err);
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(toUserMessage(err, "crawl that website"))}`);
  }
  if (pages.length === 0) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent("No readable pages were found at that URL.")}`);
  }

  let added = 0;
  for (const page of pages) {
    if (!canAddKnowledgeDoc((currentCount ?? 0) + added, plan)) break;
    if (page.text.trim().length < 20) continue;

    const { data: source, error } = await supabase
      .from("knowledge_sources")
      .insert({ bot_id: botId, type: "website", title: page.title || page.url, source_url: page.url, status: "processing" })
      .select("id")
      .single();
    if (error || !source) continue;

    await runIngestAndCharge(botId, source.id, page.text, workspace.workspaceId, "knowledgeUrlIndexed");
    await logAuditEvent({
      workspaceId: workspace.workspaceId,
      actorUserId: user.id,
      action: "knowledge_source.added",
      targetType: "knowledge_source",
      targetId: source.id,
      metadata: { botId, type: "website", title: page.title, url: page.url },
    });
    added += 1;
  }

  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  if (added === 0) {
    redirect(`/dashboard/bots/${botId}/knowledge?error=${encodeURIComponent(upgradeMessage("docs"))}`);
  }
  const skipped = pages.length - added;
  redirect(`/dashboard/bots/${botId}/knowledge?success=${encodeURIComponent(`Added ${added} page${added === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} skipped — plan limit reached)` : ""}.`)}`);
}
