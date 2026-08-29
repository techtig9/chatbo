"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bot as BotIcon, Search, ArrowRight, AlertTriangle, MessagesSquare, TrendingUp, Clock, User, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgentListItem } from "@/lib/data/agents-list";
import { filterAgents, countAgentsByFilter, type AgentFilter } from "@/lib/data/agents-filter";
import { AgentActionsMenu } from "@/components/dashboard/agent-actions-menu";

const FILTERS: { id: AgentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
  { id: "needs_attention", label: "Needs attention" },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function AgentsGrid({ agents }: { agents: AgentListItem[] }) {
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterAgents(agents, filter, query), [agents, filter, query]);
  const counts = useMemo(() => countAgentsByFilter(agents), [agents]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === f.id ? "bg-signal text-ink" : "text-slate hover:bg-elevated hover:text-ink"
              }`}
            >
              {f.label} <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents..."
            aria-label="Search agents"
            className="w-full rounded-lg border border-mist bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-slate/70 outline-none focus:border-signal"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-mist bg-surface p-8 text-center text-sm text-slate">
          No agents match {query ? `"${query}"` : "this filter"}.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className={`group relative rounded-2xl border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                agent.needsAttention ? "border-ember/40 hover:border-ember/60" : "border-mist hover:border-signal/50"
              }`}
            >
              <Link href={`/dashboard/bots/${agent.id}/edit`} className="absolute inset-0" aria-label={`Open ${agent.name}`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal/10 text-ink">
                  <BotIcon size={19} aria-hidden="true" />
                </div>
                <div className="flex items-center gap-1.5">
                  {agent.needsAttention && (
                    <span title="Needs attention" className="flex h-6 w-6 items-center justify-center rounded-lg bg-ember/10 text-ember">
                      <AlertTriangle size={13} aria-hidden="true" />
                    </span>
                  )}
                  <Badge tone={agent.status === "published" ? "success" : agent.status === "archived" ? "neutral" : "info"}>{agent.status}</Badge>
                  <span className="relative z-10"><AgentActionsMenu botId={agent.id} botName={agent.name} status={agent.status} /></span>
                </div>
              </div>

              <h2 className="relative mt-4 font-display text-lg font-semibold text-ink group-hover:text-ink">{agent.name}</h2>
              <p className="relative mt-1 line-clamp-2 min-h-[2.5em] text-xs leading-5 text-slate">
                {agent.description || `${agent.useCase.replace(/_/g, " ")} agent`}
              </p>

              <div className="relative mt-4 grid grid-cols-2 gap-y-2 border-t border-mist pt-3 text-xs text-slate">
                <span className="flex items-center gap-1.5"><MessagesSquare size={12} aria-hidden="true" /> {agent.conversationCount.toLocaleString()} conversations</span>
                <span className="flex items-center gap-1.5"><TrendingUp size={12} aria-hidden="true" /> {agent.successRatePct !== null ? `${agent.successRatePct}% success` : "No ratings"}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} aria-hidden="true" /> {timeAgo(agent.lastActiveAt)}</span>
                <span className="flex items-center gap-1.5"><User size={12} aria-hidden="true" /> {agent.ownerName ?? "Unknown"}</span>
              </div>

              <div className="relative mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate">
                  {agent.version && <span className="font-mono">v{agent.version}</span>}
                  {agent.channels.length > 0 && (
                    <span className="flex items-center gap-1"><Radio size={11} aria-hidden="true" /> {agent.channels.length}</span>
                  )}
                </div>
                <span className="z-10 flex items-center gap-3 text-xs text-slate">
                  <Link href={`/dashboard/bots/${agent.id}/playground`} className="relative hover:text-ink">Test</Link>
                  <span className="flex items-center gap-1 group-hover:text-ink">
                    Open <ArrowRight size={12} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
