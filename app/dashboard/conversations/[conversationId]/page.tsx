import { notFound } from "next/navigation";
import { ThumbsUp, ThumbsDown, BookOpen, User, Bot, Clock, ArrowRightLeft, Radio } from "lucide-react";
import { getConversationDetail } from "@/lib/data/conversations";
import { markConversationRead } from "@/lib/actions/conversations";
import { ExportButtons } from "@/components/conversations/export-buttons";
import { Badge } from "@/components/ui/badge";

export default async function ConversationDetailPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const conversation = await getConversationDetail(params.conversationId);
  if (!conversation) notFound();

  // Fire-and-forget: viewing the conversation is what "read" means here;
  // this shouldn't block rendering the page, and a failure to record it
  // isn't worth surfacing to the person just trying to read a transcript.
  void markConversationRead(conversation.id);

  return (
    <>
      {/* CENTER — full transcript */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-mist px-6 py-3">
          <div>
            <h1 className="font-display text-base font-semibold text-ink">{conversation.botName}</h1>
            <p className="text-xs text-slate">{conversation.channel} · {new Date(conversation.startedAt).toLocaleString()}</p>
          </div>
          <ExportButtons
            messages={conversation.messages.map((m) => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
              feedback: m.feedback,
            }))}
            filenameBase={`conversation-${conversation.id.slice(0, 8)}`}
          />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {conversation.messages.map((m) => {
            const citations = Array.isArray(m.citations) ? (m.citations as { sourceId: string; sourceTitle: string }[]) : null;
            return (
              <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[75%]" : "max-w-[75%]"}>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "rounded-tr-sm bg-signal text-ink" : "rounded-tl-sm bg-surface text-ink"
                  }`}
                >
                  {m.content}
                </div>
                {citations && citations.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {citations.map((citation, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full border border-mist bg-surface px-2 py-1 text-[11px] text-slate">
                        <BookOpen size={10} aria-hidden="true" className="shrink-0 text-ink" />
                        {citation.sourceTitle}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2 px-1">
                  <span className="text-xs text-slate">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  {m.feedback === "up" && <ThumbsUp size={12} className="text-success" aria-label="Positive feedback" />}
                  {m.feedback === "down" && <ThumbsDown size={12} className="text-danger" aria-label="Negative feedback" />}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* RIGHT — agent / customer / context */}
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-mist bg-surface p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink">Agent</p>
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink"><Bot size={16} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{conversation.botName}</p>
            <p className="text-xs text-slate capitalize">{conversation.channel}</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink">Customer</p>
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink"><User size={16} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-ink">{conversation.visitorId}</p>
            <p className="text-xs text-slate">{conversation.visitorConversationCount} conversation{conversation.visitorConversationCount === 1 ? "" : "s"} total</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink">Context</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-slate"><Radio size={12} aria-hidden="true" /> Status</span>
            <Badge tone={conversation.status === "active" ? "info" : "neutral"}>{conversation.status === "active" ? "unresolved" : "resolved"}</Badge>
          </div>
          {conversation.isHandoff && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate"><ArrowRightLeft size={12} aria-hidden="true" /> Handoff</span>
              <Badge tone="warning">requested</Badge>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-slate"><Clock size={12} aria-hidden="true" /> Started</span>
            <span className="text-xs text-ink">{new Date(conversation.startedAt).toLocaleString()}</span>
          </div>
          {conversation.endedAt && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate"><Clock size={12} aria-hidden="true" /> Ended</span>
              <span className="text-xs text-ink">{new Date(conversation.endedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
