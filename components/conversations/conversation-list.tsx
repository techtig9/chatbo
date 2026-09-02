"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search, ThumbsUp, ThumbsDown, ArrowRightLeft, MessagesSquare } from "lucide-react";
import type { ConversationListItem } from "@/lib/data/conversations";

type Filter = "all" | "unread" | "unresolved" | "resolved" | "handoff";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "unresolved", label: "Unresolved" },
  { id: "resolved", label: "Resolved" },
  { id: "handoff", label: "Handoff" },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function filterConversations(conversations: ConversationListItem[], filter: Filter, query: string): ConversationListItem[] {
  const trimmedQuery = query.trim().toLowerCase();
  return conversations.filter((c) => {
    if (filter === "unread" && !c.isUnread) return false;
    if (filter === "unresolved" && c.status !== "active") return false;
    if (filter === "resolved" && c.status !== "ended") return false;
    if (filter === "handoff" && !c.isHandoff) return false;
    if (trimmedQuery && !c.botName.toLowerCase().includes(trimmedQuery) && !(c.lastMessagePreview ?? "").toLowerCase().includes(trimmedQuery) && !c.visitorId.toLowerCase().includes(trimmedQuery)) return false;
    return true;
  });
}

export function ConversationList({ conversations }: { conversations: ConversationListItem[] }) {
  const params = useParams<{ conversationId?: string }>();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterConversations(conversations, filter, query), [conversations, filter, query]);
  const counts = useMemo(() => ({
    all: conversations.length,
    unread: conversations.filter((c) => c.isUnread).length,
    unresolved: conversations.filter((c) => c.status === "active").length,
    resolved: conversations.filter((c) => c.status === "ended").length,
    handoff: conversations.filter((c) => c.isHandoff).length,
  }), [conversations]);

  return (
    <nav aria-label="Conversations" className="flex h-full w-80 shrink-0 flex-col border-r border-mist bg-surface">
      <div className="border-b border-mist p-3">
        <label className="relative block">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full rounded-lg border border-mist bg-elevated py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-slate/70 outline-none focus:border-signal"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === f.id ? "bg-signal text-ink" : "text-slate hover:bg-elevated hover:text-ink"
              }`}
            >
              {f.label} <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-soft text-ink">
                <MessagesSquare size={17} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">No conversations yet</p>
                <p className="mt-1 text-xs leading-5 text-slate">Once your agent is deployed, real conversations will show up here.</p>
              </div>
              <Link href="/dashboard/channels" className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink/90">
                Deploy your agent
              </Link>
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate">No conversations match.</p>
          )
        ) : (
          <ul>
            {filtered.map((c) => {
              const isActive = params.conversationId === c.id;
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/conversations/${c.id}`}
                    className={`flex gap-3 border-b border-mist px-4 py-3 transition ${isActive ? "bg-signal-soft" : "hover:bg-elevated"}`}
                  >
                    <span className="relative shrink-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated font-mono text-xs font-medium text-ink">
                        {c.botName.charAt(0).toUpperCase()}
                      </span>
                      {c.isUnread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-surface" aria-label="Unread" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${c.isUnread ? "font-semibold text-ink" : "font-medium text-ink"}`}>{c.botName}</p>
                        <span className="shrink-0 text-[11px] text-slate">{timeAgo(c.lastMessageAt ?? c.startedAt)}</span>
                      </div>
                      <p className="truncate text-xs text-slate">{c.lastMessagePreview ?? "No messages yet"}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.status === "active" ? "bg-info-soft text-accent2-ink" : "bg-neutral-soft text-slate"}`}>
                          {c.status === "active" ? "unresolved" : "resolved"}
                        </span>
                        {c.isHandoff && (
                          <span className="flex items-center gap-0.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-ember-ink">
                            <ArrowRightLeft size={9} aria-hidden="true" /> handoff
                          </span>
                        )}
                        {c.sentiment === "positive" && <ThumbsUp size={11} className="text-success" aria-label="Positive sentiment" />}
                        {c.sentiment === "negative" && <ThumbsDown size={11} className="text-danger" aria-label="Negative sentiment" />}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
