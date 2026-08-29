import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Link as LinkIcon, Upload, Globe } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { createClient } from "@/lib/supabase/server";
import { addTextSource, addUrlSource, addFileSource, addWebsiteSource, deleteKnowledgeSource, reindexKnowledgeSource } from "@/lib/actions/knowledge";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { KnowledgeSourceGrid, type KnowledgeSourceCardData } from "@/components/knowledge/knowledge-source-grid";
import type { Database } from "@/lib/supabase/types";

type KnowledgeSourceRow = Database["public"]["Tables"]["knowledge_sources"]["Row"];

export default async function BotKnowledgePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const bot = await getBotById(params.id);
  if (!bot || bot.workspace_id !== workspace.workspaceId) notFound();

  const supabase = createClient();
  const { data: sources } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("bot_id", bot.id)
    .order("created_at", { ascending: false })
    .returns<KnowledgeSourceRow[]>();

  const addTextWithId = addTextSource.bind(null, bot.id);
  const addUrlWithId = addUrlSource.bind(null, bot.id);
  const addWebsiteWithId = addWebsiteSource.bind(null, bot.id);
  const reindexWithId = reindexKnowledgeSource.bind(null, bot.id);
  const deleteWithId = deleteKnowledgeSource.bind(null, bot.id);

  const cardData: KnowledgeSourceCardData[] = (sources ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    mimeType: s.mime_type,
    fileSize: s.file_size,
    rawTextLength: s.raw_text?.length ?? null,
    status: s.status,
    chunkCount: s.chunk_count ?? 0,
    lastIndexedAt: s.last_indexed_at,
    errorMessage: s.error_message,
  }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/dashboard/bots/${bot.id}/edit`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to agent
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">{bot.name}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Knowledge</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate">
            Everything here is what your agent can actually answer from. Each successful source ingestion costs 40 credits.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      <div id="add-source" className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <form action={addFileSource.bind(null, bot.id)} encType="multipart/form-data" className="rounded-xl border border-signal/20 bg-signal/[0.03] p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"><Upload size={15} /> Upload file</p>
          <p className="mb-3 text-xs leading-5 text-slate">TXT, Markdown, CSV, JSON, HTML up to 5 MB. PDF/DOCX parsers are queued for a later phase.</p>
          <input type="file" name="file" required accept=".txt,.md,.csv,.json,.html,.htm,text/plain,text/markdown,text/csv,application/json,text/html" className="mb-3 block w-full text-xs text-slate file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-medium file:text-paper" />
          <SubmitButton variant="secondary" size="md" className="w-full">Upload &amp; index</SubmitButton>
        </form>

        <form action={addTextWithId} className="rounded-2xl border border-mist bg-surface p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink"><FileText size={15} /> Paste text</p>
          <input type="text" name="title" placeholder="Title (e.g. Return Policy)" required className="bg-surface text-ink mb-2 w-full rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal" />
          <textarea name="content" rows={4} placeholder="Paste the content here…" required className="bg-surface text-ink mb-3 w-full rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal" />
          <SubmitButton variant="secondary" size="md" className="w-full">Add &amp; index</SubmitButton>
        </form>

        <form action={addUrlWithId} className="rounded-2xl border border-mist bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"><LinkIcon size={15} /> Index a URL</p>
          <p className="mb-3 text-xs leading-5 text-slate">Fetches one public page, cleans its readable text, and adds it.</p>
          <input type="url" name="url" placeholder="https://example.com/faq" required className="bg-surface text-ink mb-3 w-full rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal" />
          <SubmitButton variant="secondary" size="md" className="w-full">Index URL</SubmitButton>
        </form>

        <form action={addWebsiteWithId} className="rounded-2xl border border-mist bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"><Globe size={15} /> Crawl a website</p>
          <p className="mb-3 text-xs leading-5 text-slate">Follows same-origin links from a starting page (up to 25 pages) and adds each as its own source.</p>
          <input type="url" name="url" placeholder="https://example.com" required className="bg-surface text-ink mb-3 w-full rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal" />
          <SubmitButton variant="secondary" size="md" className="w-full">Crawl &amp; index</SubmitButton>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Sources", cardData.length],
          ["Ready", cardData.filter((s) => s.status === "ready").length],
          ["Chunks", cardData.reduce((n, s) => n + s.chunkCount, 0)],
          ["In progress", cardData.filter((s) => s.status === "processing" || s.status === "indexing").length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-mist bg-surface p-3">
            <p className="text-xs text-slate">{label}</p>
            <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <KnowledgeSourceGrid sources={cardData} reindexAction={reindexWithId} deleteAction={deleteWithId} />
    </main>
  );
}
