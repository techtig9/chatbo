"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ThumbsUp, ThumbsDown, Square, Wrench, Check, X as XIcon, BookOpen } from "lucide-react";

export interface ChatUIBot {
  id: string;
  name: string;
  avatar: string | null;
  brandColor: string | null;
  welcomeMessage: string | null;
  starterQuestions: string[];
}

interface Citation {
  sourceId: string;
  sourceTitle: string;
}

interface ToolEvent {
  tool: string;
  status: "started" | "succeeded" | "failed";
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  id?: string;
  feedback?: "up" | "down";
  toolEvents?: ToolEvent[];
  citations?: Citation[] | null;
}

function getOrCreateVisitorId(botId: string): string {
  if (typeof window === "undefined") return "server";
  const key = `chatbo_visitor_${botId}`;
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export function ChatUI({
  bot,
  channel,
  apiBase = "",
  version,
  showBuilderChrome = false,
}: {
  bot: ChatUIBot;
  channel: "widget" | "share_link" | "playground";
  apiBase?: string;
  /** Shown next to the agent name when set — e.g. "v4". Meaningful to
   * whoever is building the agent, not to an end customer, so this is
   * opt-in rather than always-on. */
  version?: number | null;
  /** Turns on the internal-builder chrome (spec section 71/72): an
   * online-status dot and purple AI accents, instead of the public
   * widget's neutral/accessible-by-default styling. The embeddable
   * widget on a customer's own site intentionally does NOT get this —
   * it needs to look right against ANY host page, not carry Chatbo's
   * own brand color, and accentColor below still exists specifically
   * for that case. */
  showBuilderChrome?: boolean;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const visitorIdRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId(bot.id);
  }, [bot.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Default falls back to near-black, not a colored accent — white text
  // sits directly on this color in the header, user message bubbles, and
  // send button (see lib/a11y/contrast.ts's test suite), and the new
  // brand foundation is black + lime rather than a mid-tone purple: near-
  // black passes contrast with white text by a wide margin (unlike lime,
  // which is far too light to pair with white text at all), so both the
  // builder-preview and public-widget fallbacks use it rather than
  // needing two different violet shades tuned for two different contrast
  // thresholds the way the old purple palette did.
  const accentColor = bot.brandColor || "#0C0D09";

  // Announced to screen readers only once a reply finishes — not on
  // every streamed token, which would otherwise flood assistive tech
  // with repeated interruptions on a fast-mutating region. Visually
  // hidden; sighted users already see the streaming text update live.
  const lastAssistantMessage = messages[messages.length - 1];
  const completedAnnouncement =
    !isStreaming && lastAssistantMessage?.role === "assistant" && lastAssistantMessage.content
      ? lastAssistantMessage.content
      : "";

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", toolEvents: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const isPlayground = channel === "playground";
      const endpoint = isPlayground
        ? `${apiBase}/api/dashboard/playground/${bot.id}`
        : `${apiBase}/api/public/chat/${bot.id}`;
      const requestBody = isPlayground
        ? { message: text, conversationId: conversationIdRef.current }
        : {
            message: text,
            conversationId: conversationIdRef.current,
            visitorId: visitorIdRef.current,
            channel,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error ?? `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventMatch = frame.match(/^event: (.+)$/m);
          const dataMatch = frame.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventName = eventMatch[1];
          const data = JSON.parse(dataMatch[1]!);

          if (eventName === "conversation") {
            conversationIdRef.current = data.conversationId;
          } else if (eventName === "tool_call") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1]!;
              const events = last.toolEvents ? [...last.toolEvents] : [];
              const startedIndex = events.findIndex((e) => e.tool === data.tool && e.status === "started");
              if (data.status !== "started" && startedIndex !== -1) {
                events[startedIndex] = { tool: data.tool, status: data.status };
              } else {
                events.push({ tool: data.tool, status: data.status });
              }
              updated[updated.length - 1] = { ...last, toolEvents: events };
              return updated;
            });
          } else if (eventName === "token") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1]!;
              updated[updated.length - 1] = { ...last, content: last.content + data.text };
              return updated;
            });
          } else if (eventName === "error") {
            setError(data.error);
          } else if (eventName === "done") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1]!;
              updated[updated.length - 1] = {
                ...last,
                id: data.messageId ?? last.id,
                citations: data.citations ?? null,
              };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      // AbortError means the person clicked Stop — that's an intentional
      // cancellation, not a failure, so it shouldn't surface as an error
      // banner (the partial reply already showing is exactly what they wanted).
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  async function submitFeedback(index: number, messageId: string, value: "up" | "down") {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index]!, feedback: value };
      return updated;
    });

    try {
      await fetch(`${apiBase}/api/public/feedback/${messageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: value }),
      });
    } catch {
      // Feedback is a nice-to-have signal, not critical path — a failed
      // request here shouldn't disrupt the conversation with an error
      // banner. The optimistic UI update already gave the visitor
      // confirmation their click registered.
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <header
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <span className="relative shrink-0">
          {bot.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- external/customer-provided avatar URL, not a local asset
            <img src={bot.avatar} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              {bot.name.charAt(0).toUpperCase()}
            </span>
          )}
          {showBuilderChrome && (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-current bg-success"
              style={{ borderColor: accentColor }}
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{bot.name}</span>
          {showBuilderChrome && <span className="block text-[11px] text-white/70">Online — testing in draft</span>}
        </span>
        {showBuilderChrome && version != null && (
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px]">v{version}</span>
        )}
      </header>

      <span aria-live="polite" className="sr-only">
        {completedAnnouncement}
      </span>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Conversation"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="space-y-3">
            {bot.welcomeMessage && (
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-paper px-3 py-2 text-sm text-ink">
                {bot.welcomeMessage}
              </div>
            )}
            {bot.starterQuestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {bot.starterQuestions.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-lg border border-mist px-3 py-1.5 text-left text-xs text-slate transition hover:border-signal hover:text-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
            {m.role === "assistant" && m.toolEvents && m.toolEvents.length > 0 && (
              <div className="mb-1.5 flex flex-col gap-1">
                {m.toolEvents.map((event, eventIndex) => (
                  <div key={eventIndex} className="flex items-center gap-1.5 rounded-lg bg-elevated px-2.5 py-1 text-[11px] text-slate">
                    <Wrench size={11} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1 truncate">{event.tool}</span>
                    {event.status === "started" && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal" aria-label="Running" />}
                    {event.status === "succeeded" && <Check size={11} aria-hidden="true" className="shrink-0 text-success" />}
                    {event.status === "failed" && <XIcon size={11} aria-hidden="true" className="shrink-0 text-danger" />}
                  </div>
                ))}
              </div>
            )}
            <div
              className={`rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "rounded-tr-sm text-white" : "rounded-tl-sm bg-paper text-ink"
              }`}
              style={m.role === "user" ? { backgroundColor: accentColor } : undefined}
            >
              {m.content || (isStreaming && i === messages.length - 1 ? (
                <span className="inline-flex gap-1" aria-label="Typing">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate [animation-delay:300ms]" />
                </span>
              ) : null)}
            </div>
            {m.role === "assistant" && m.citations && m.citations.length > 0 && !isStreaming && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.citations.map((citation, citationIndex) => (
                  <span key={citationIndex} className="flex items-center gap-1 rounded-full border border-mist bg-surface px-2 py-1 text-[11px] text-slate">
                    <BookOpen size={10} aria-hidden="true" className="shrink-0 text-ink" />
                    {citation.sourceTitle}
                  </span>
                ))}
              </div>
            )}
            {m.role === "assistant" && m.id && m.content && !isStreaming && (
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  aria-label="Good response"
                  onClick={() => submitFeedback(i, m.id!, "up")}
                  className={`rounded p-1 transition ${
                    m.feedback === "up" ? "text-ink" : "text-mist hover:text-slate"
                  }`}
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Bad response"
                  onClick={() => submitFeedback(i, m.id!, "down")}
                  className={`rounded p-1 transition ${
                    m.feedback === "down" ? "text-ember" : "text-mist hover:text-slate"
                  }`}
                >
                  <ThumbsDown size={13} />
                </button>
              </div>
            )}
          </div>
        ))}

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-center gap-2 border-t border-mist p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={isStreaming}
          className="flex-1 rounded-full border border-mist px-3 py-2 text-sm outline-none focus:border-signal disabled:opacity-60"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            aria-label="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated text-ink transition hover:bg-mist"
          >
            <Square size={13} fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            <Send size={15} />
          </button>
        )}
      </form>
    </div>

  );
}
