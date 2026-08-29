import type { AgentListItem } from "@/lib/data/agents-list";

export type AgentFilter = "all" | "published" | "draft" | "archived" | "needs_attention";

/** Extracted from the AgentsGrid component so the filter/search logic
 * (spec section 69) can be unit tested without rendering React. */
export function filterAgents(agents: AgentListItem[], filter: AgentFilter, query: string): AgentListItem[] {
  const trimmedQuery = query.trim().toLowerCase();
  return agents.filter((a) => {
    if (filter === "needs_attention" && !a.needsAttention) return false;
    if (filter !== "all" && filter !== "needs_attention" && a.status !== filter) return false;
    if (trimmedQuery && !a.name.toLowerCase().includes(trimmedQuery)) return false;
    return true;
  });
}

export function countAgentsByFilter(agents: AgentListItem[]): Record<AgentFilter, number> {
  return {
    all: agents.length,
    published: agents.filter((a) => a.status === "published").length,
    draft: agents.filter((a) => a.status === "draft").length,
    archived: agents.filter((a) => a.status === "archived").length,
    needs_attention: agents.filter((a) => a.needsAttention).length,
  };
}
