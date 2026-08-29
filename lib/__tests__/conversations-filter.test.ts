import { describe, expect, it } from "vitest";
import { filterConversations } from "@/components/conversations/conversation-list";
import type { ConversationListItem } from "@/lib/data/conversations";

function conversation(overrides: Partial<ConversationListItem>): ConversationListItem {
  return {
    id: "1",
    botId: "bot-1",
    botName: "Support Bot",
    botAvatar: null,
    channel: "widget",
    visitorId: "visitor-1",
    startedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    messageCount: 3,
    lastMessagePreview: "Where is my order?",
    status: "active",
    isUnread: false,
    sentiment: "neutral",
    isHandoff: false,
    ...overrides,
  };
}

const conversations: ConversationListItem[] = [
  conversation({ id: "1", botName: "Support Bot", status: "active", isUnread: true }),
  conversation({ id: "2", botName: "Sales Bot", status: "ended", isUnread: false }),
  conversation({ id: "3", botName: "Support Bot", status: "active", isHandoff: true, lastMessagePreview: "I need a human" }),
  conversation({ id: "4", botName: "Support Bot", status: "ended", visitorId: "visitor-special-42" }),
];

describe("filterConversations", () => {
  it("'all' returns every conversation", () => {
    expect(filterConversations(conversations, "all", "")).toHaveLength(4);
  });

  it("'unread' returns only conversations with isUnread", () => {
    expect(filterConversations(conversations, "unread", "").map((c) => c.id)).toEqual(["1"]);
  });

  it("'unresolved' returns only active-status conversations", () => {
    expect(filterConversations(conversations, "unresolved", "").map((c) => c.id)).toEqual(["1", "3"]);
  });

  it("'resolved' returns only ended-status conversations", () => {
    expect(filterConversations(conversations, "resolved", "").map((c) => c.id)).toEqual(["2", "4"]);
  });

  it("'handoff' returns only conversations that requested a human handoff", () => {
    expect(filterConversations(conversations, "handoff", "").map((c) => c.id)).toEqual(["3"]);
  });

  it("search matches bot name, message preview, or visitor id (case-insensitive)", () => {
    expect(filterConversations(conversations, "all", "sales").map((c) => c.id)).toEqual(["2"]);
    expect(filterConversations(conversations, "all", "HUMAN").map((c) => c.id)).toEqual(["3"]);
    expect(filterConversations(conversations, "all", "special-42").map((c) => c.id)).toEqual(["4"]);
  });

  it("combines a status filter and a search query", () => {
    expect(filterConversations(conversations, "unresolved", "human").map((c) => c.id)).toEqual(["3"]);
    expect(filterConversations(conversations, "resolved", "human")).toEqual([]);
  });
});
