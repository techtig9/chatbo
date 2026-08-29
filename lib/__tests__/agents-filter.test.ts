import { describe, expect, it } from "vitest";
import { filterAgents, countAgentsByFilter } from "@/lib/data/agents-filter";
import type { AgentListItem } from "@/lib/data/agents-list";

function agent(overrides: Partial<AgentListItem>): AgentListItem {
  return {
    id: "1",
    name: "Support Bot",
    description: null,
    useCase: "customer_support",
    status: "published",
    avatar: null,
    version: 1,
    conversationCount: 0,
    successRatePct: null,
    lastActiveAt: null,
    channels: [],
    ownerName: null,
    needsAttention: false,
    ...overrides,
  };
}

const agents: AgentListItem[] = [
  agent({ id: "1", name: "Support Bot", status: "published" }),
  agent({ id: "2", name: "Sales Bot", status: "draft" }),
  agent({ id: "3", name: "Archived Bot", status: "archived" }),
  agent({ id: "4", name: "Broken Bot", status: "published", needsAttention: true }),
];

describe("filterAgents", () => {
  it("'all' returns every agent regardless of status", () => {
    expect(filterAgents(agents, "all", "")).toHaveLength(4);
  });

  it("filters by status", () => {
    expect(filterAgents(agents, "published", "").map((a) => a.id)).toEqual(["1", "4"]);
    expect(filterAgents(agents, "draft", "").map((a) => a.id)).toEqual(["2"]);
    expect(filterAgents(agents, "archived", "").map((a) => a.id)).toEqual(["3"]);
  });

  it("'needs_attention' ignores status and only checks the flag", () => {
    expect(filterAgents(agents, "needs_attention", "").map((a) => a.id)).toEqual(["4"]);
  });

  it("search is case-insensitive and matches by name", () => {
    expect(filterAgents(agents, "all", "sales").map((a) => a.id)).toEqual(["2"]);
    expect(filterAgents(agents, "all", "SALES").map((a) => a.id)).toEqual(["2"]);
  });

  it("combines a status filter and a search query", () => {
    expect(filterAgents(agents, "published", "broken").map((a) => a.id)).toEqual(["4"]);
    // "Broken Bot" is published, but searching for "sales" under the
    // published filter should exclude it — not fall back to the filter alone.
    expect(filterAgents(agents, "published", "sales")).toEqual([]);
  });
});

describe("countAgentsByFilter", () => {
  it("counts every bucket correctly, including the needs_attention count staying independent of status", () => {
    expect(countAgentsByFilter(agents)).toEqual({
      all: 4,
      published: 2,
      draft: 1,
      archived: 1,
      needs_attention: 1,
    });
  });
});
