import "server-only";

export const MARKETPLACE_CATEGORIES = [
  "sales", "support", "marketing", "operations", "hr", "finance", "ecommerce", "productivity", "general",
] as const;

export const MARKETPLACE_LICENSES = ["standard", "commercial", "custom"] as const;

export type AgentMarketplaceManifest = {
  schemaVersion: 1;
  title: string;
  description: string;
  category: string;
  tags: string[];
  license: string;
  requirements: {
    integrations: string[];
    knowledgeSources: number;
    workflows: number;
  };
  agent: {
    useCase: string;
    tone: string;
    model: string;
    systemPrompt: string;
    agentConfig: Record<string, unknown>;
    welcomeMessage: string | null;
    starterQuestions: string[];
  };
};

/** Remove tenant-specific identifiers and secrets before publishing an agent. */
export function sanitizeManifest(input: AgentMarketplaceManifest): AgentMarketplaceManifest {
  const clean = JSON.parse(JSON.stringify(input)) as AgentMarketplaceManifest;
  clean.agent.systemPrompt = clean.agent.systemPrompt.slice(0, 20000);
  clean.agent.agentConfig = scrubSecrets(clean.agent.agentConfig);
  clean.tags = clean.tags.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  clean.description = clean.description.slice(0, 2000);
  return clean;
}

function scrubSecrets(value: unknown): any {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|password|api[_-]?key|authorization|private[_-]?key/i.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = scrubSecrets(child);
    }
  }
  return result;
}

export function slugifyMarketplaceTitle(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "agent-template").slice(0, 70);
}
