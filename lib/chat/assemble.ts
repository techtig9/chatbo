import type { BotRow } from "@/lib/data/bots";
import type { RetrievalResult } from "@/lib/knowledge/retrieve";

export interface ChatHistoryTurn { role: "user" | "assistant"; content: string; }
export interface AssembledChatRequest { system: string; messages: { role: "user" | "assistant"; content: string }[]; }
const MAX_HISTORY_TURNS = 12;

export function assembleChatRequest(
  bot: Pick<BotRow, "system_prompt" | "fallback_behavior" | "agent_config">,
  retrieval: RetrievalResult,
  history: ChatHistoryTurn[],
  userMessage: string,
  memoryContext = ""
): AssembledChatRequest {
  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS);
  const cfg = bot.agent_config && typeof bot.agent_config === "object" && !Array.isArray(bot.agent_config)
    ? bot.agent_config as Record<string, unknown> : {};
  const capabilities = Array.isArray(cfg.capabilities) ? cfg.capabilities.filter((v): v is string => typeof v === "string") : [];
  const rules = Array.isArray(cfg.rules) ? cfg.rules.filter((v): v is string => typeof v === "string") : [];
  const guardrails = Array.isArray(cfg.guardrails) ? cfg.guardrails.filter((v): v is string => typeof v === "string") : [];
  const objective = typeof cfg.objective === "string" ? cfg.objective : "";
  const language = typeof cfg.language === "string" ? cfg.language : "Auto-detect";
  const groundingSection = retrieval.useFallback
    ? "No relevant information was found in the knowledge base for this question. You MUST invoke the configured fallback behavior; do not guess or present unsupported facts."
    : `Use the retrieved knowledge as the primary source of truth. If it does not support an answer, say so instead of inventing facts.\n\n${retrieval.contextBlock}`;
  const system = [
    bot.system_prompt,
    objective && `Primary objective: ${objective}`,
    capabilities.length && `Capabilities:\n- ${capabilities.join("\n- ")}`,
    `Preferred language: ${language}`,
    rules.length && `Behavior rules:\n- ${rules.join("\n- ")}`,
    guardrails.length && `Guardrails:\n- ${guardrails.join("\n- ")}`,
    groundingSection,
    memoryContext && `Memory context:\n${memoryContext}`,
    "When a configured tool is available, use it for actions or live data instead of pretending you performed the action. Explain tool results accurately.",
  ].filter(Boolean).join("\n\n---\n\n");
  return { system, messages: [...trimmedHistory, { role: "user", content: userMessage }] };
}
