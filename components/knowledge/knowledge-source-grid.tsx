"use client";

import { useMemo, useState } from "react";
import { Search, FileText, Link as LinkIcon, Globe, FileSpreadsheet, FileJson, FileCode, RefreshCw, Trash2, AlertTriangle, Loader2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { KnowledgeSourceType, KnowledgeSourceStatus } from "@/lib/supabase/types";

export interface KnowledgeSourceCardData {
  id: string;
  title: string;
  type: KnowledgeSourceType;
  mimeType: string | null;
  fileSize: number | null;
  rawTextLength: number | null;
  status: KnowledgeSourceStatus;
  chunkCount: number;
  lastIndexedAt: string | null;
  errorMessage: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Display type — spec section 74 wants specific badges (CSV/URL/Text/
 * Website/...), but the DB only tracks the broader "file" type; this
 * refines "file" using its extension/mime type without pretending we
 * support formats (PDF/DOC) that addFileSource genuinely rejects today. */
export function displayType(source: KnowledgeSourceCardData): { label: string; icon: typeof FileText } {
  if (source.type === "url") return { label: "URL", icon: LinkIcon };
  if (source.type === "website") return { label: "Website", icon: Globe };
  if (source.type === "text") return { label: "Text", icon: FileText };
  const lower = source.title.toLowerCase();
  if (lower.endsWith(".csv") || source.mimeType === "text/csv") return { label: "CSV", icon: FileSpreadsheet };
  if (lower.endsWith(".json") || source.mimeType === "application/json") return { label: "JSON", icon: FileJson };
  if (lower.endsWith(".html") || lower.endsWith(".htm") || source.mimeType === "text/html") return { label: "HTML", icon: FileCode };
  return { label: "Text file", icon: FileText };
}

export function sizeLabel(source: KnowledgeSourceCardData): string {
  if (source.fileSize != null) return formatBytes(source.fileSize);
  if (source.rawTextLength != null) return `${source.rawTextLength.toLocaleString()} chars`;
  return "—";
}

const STATUS_META: Record<KnowledgeSourceStatus, { label: string; tone: "neutral" | "success" | "danger" | "info"; progressPct: number; animated: boolean }> = {
  processing: { label: "Processing", tone: "neutral", progressPct: 25, animated: true },
  indexing: { label: "Indexing", tone: "info", progressPct: 70, animated: true },
  ready: { label: "Ready", tone: "success", progressPct: 100, animated: false },
  failed: { label: "Failed", tone: "danger", progressPct: 100, animated: false },
};

export function filterKnowledgeSources(sources: KnowledgeSourceCardData[], query: string): KnowledgeSourceCardData[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sources;
  return sources.filter((s) => s.title.toLowerCase().includes(trimmed));
}

export function KnowledgeSourceGrid({
  sources,
  reindexAction,
  deleteAction,
}: {
  sources: KnowledgeSourceCardData[];
  reindexAction: (sourceId: string) => void;
  deleteAction: (sourceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterKnowledgeSources(sources, query), [sources, query]);

  return (
    <div>
      <label className="relative mb-4 block max-w-sm">
        <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sources..."
          aria-label="Search knowledge sources"
          className="w-full rounded-lg border border-mist bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-slate/70 outline-none focus:border-signal"
        />
      </label>

      {filtered.length === 0 ? (
        sources.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No knowledge sources yet"
            description="Give your agent something to ground its answers in — upload a file, paste text, index a URL, or crawl a whole site."
            action={
              <Button variant="primary" size="md" onClick={() => document.getElementById("add-source")?.scrollIntoView({ behavior: "smooth" })}>
                Add knowledge
              </Button>
            }
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-mist bg-surface p-8 text-center text-sm text-slate">
            No sources match &ldquo;{query}&rdquo;.
          </p>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((source) => {
            const { label: typeLabel, icon: TypeIcon } = displayType(source);
            const meta = STATUS_META[source.status];
            return (
              <div key={source.id} className={`rounded-2xl border bg-surface p-4 ${source.status === "failed" ? "border-danger-border" : "border-mist"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-soft text-ink">
                      <TypeIcon size={15} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink" title={source.title}>{source.title}</p>
                      <p className="text-xs text-slate">{typeLabel} · {sizeLabel(source)}</p>
                    </div>
                  </div>
                  {source.status === "failed" && <AlertTriangle size={14} className="mt-1 shrink-0 text-danger" aria-label="Failed" />}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate">
                  <span>{source.chunkCount} chunks</span>
                  <span>{source.lastIndexedAt ? new Date(source.lastIndexedAt).toLocaleDateString() : "Not indexed"}</span>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className={`h-full rounded-full transition-all ${
                      source.status === "failed" ? "bg-danger" : source.status === "ready" ? "bg-success" : "bg-signal"
                    } ${meta.animated ? "animate-pulse" : ""}`}
                    style={{ width: `${meta.progressPct}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge tone={meta.tone}>
                    {meta.animated && <Loader2 size={10} className="mr-1 inline animate-spin" aria-hidden="true" />}
                    {meta.label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => reindexAction(source.id)} aria-label={`Re-index ${source.title}`} className="rounded-lg p-1.5 text-slate hover:bg-elevated hover:text-ink">
                      <RefreshCw size={14} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => deleteAction(source.id)} aria-label={`Delete ${source.title}`} className="rounded-lg p-1.5 text-slate hover:bg-elevated hover:text-danger-ink">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {source.status === "failed" && source.errorMessage && (
                  <p className="mt-2 truncate text-xs text-danger" title={source.errorMessage}>{source.errorMessage}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
