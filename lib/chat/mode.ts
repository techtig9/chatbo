import type { BotRow } from "@/lib/data/bots";

/**
 * Reads the AI gateway mode ("auto" | "fast" | "balanced" | "advanced")
 * configured on a bot. Shared by every chat completion path (streaming,
 * non-streaming/API, channels) so they all route through the gateway the
 * same way.
 */
export function configMode(bot: Pick<BotRow, "agent_config">): string {
  const cfg = bot.agent_config && typeof bot.agent_config === "object" && !Array.isArray(bot.agent_config)
    ? bot.agent_config as Record<string, unknown>
    : {};
  return typeof cfg.model === "string" ? cfg.model : "auto";
}
