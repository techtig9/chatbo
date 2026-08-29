import "server-only";
import type { BotRow } from "@/lib/data/bots";
import type { ToolPermission } from "@/lib/supabase/types";

export type SecurityPolicy = {
  enabled: boolean;
  blockPromptInjection: boolean;
  blockSecrets: boolean;
  requireSensitiveApproval: boolean;
  maxToolCalls: number;
  maxModelCalls: number;
  maxRunMs: number;
  maxCostUsd: number;
  maxInputChars: number;
  maxOutputChars: number;
  killSwitch: boolean;
  blockedDomains: string[];
};

const DEFAULT_POLICY: SecurityPolicy = {
  enabled: true,
  blockPromptInjection: true,
  blockSecrets: true,
  requireSensitiveApproval: true,
  maxToolCalls: 6,
  maxModelCalls: 5,
  maxRunMs: 45_000,
  maxCostUsd: 0.25,
  maxInputChars: 4_000,
  maxOutputChars: 12_000,
  killSwitch: false,
  blockedDomains: [],
};

function asBool(value: unknown, fallback: boolean) { return typeof value === "boolean" ? value : fallback; }
function asNumber(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function asStrings(value: unknown) { return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 100) : []; }

export function getSecurityPolicy(bot: BotRow): SecurityPolicy {
  const config = bot.agent_config && typeof bot.agent_config === "object" && !Array.isArray(bot.agent_config) ? bot.agent_config as Record<string, unknown> : {};
  const raw = config.security && typeof config.security === "object" && !Array.isArray(config.security) ? config.security as Record<string, unknown> : {};
  return {
    enabled: asBool(raw.enabled, DEFAULT_POLICY.enabled),
    blockPromptInjection: asBool(raw.blockPromptInjection, DEFAULT_POLICY.blockPromptInjection),
    blockSecrets: asBool(raw.blockSecrets, DEFAULT_POLICY.blockSecrets),
    requireSensitiveApproval: asBool(raw.requireSensitiveApproval, DEFAULT_POLICY.requireSensitiveApproval),
    maxToolCalls: asNumber(raw.maxToolCalls, DEFAULT_POLICY.maxToolCalls, 0, 50),
    maxModelCalls: asNumber(raw.maxModelCalls, DEFAULT_POLICY.maxModelCalls, 1, 30),
    maxRunMs: asNumber(raw.maxRunMs, DEFAULT_POLICY.maxRunMs, 5_000, 300_000),
    maxCostUsd: asNumber(raw.maxCostUsd, DEFAULT_POLICY.maxCostUsd, 0, 100),
    maxInputChars: asNumber(raw.maxInputChars, DEFAULT_POLICY.maxInputChars, 100, 20_000),
    maxOutputChars: asNumber(raw.maxOutputChars, DEFAULT_POLICY.maxOutputChars, 100, 100_000),
    killSwitch: asBool(raw.killSwitch, DEFAULT_POLICY.killSwitch),
    blockedDomains: asStrings(raw.blockedDomains),
  };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all|any|the|previous|prior)\s+(instructions|rules)/i,
  /reveal\s+(the|your)\s+(system|developer)\s+(prompt|instructions)/i,
  /show\s+me\s+(your|the)\s+(api|secret|private)\s+key/i,
  /disregard\s+your\s+(safety|security)\s+(rules|policy)/i,
  /pretend\s+you\s+are\s+(the\s+)?system/i,
];

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /-----BEGIN\s+(RSA|OPENSSH|EC|PRIVATE)\s+PRIVATE KEY-----/i,
  /(?:password|passwd|secret|api[_ -]?key|access[_ -]?token)\s*[:=]\s*[^\s]{8,}/i,
];

export type GuardrailDecision = { allowed: true } | { allowed: false; code: string; message: string };

export function inspectUserInput(bot: BotRow, input: string): GuardrailDecision {
  const policy = getSecurityPolicy(bot);
  if (!policy.enabled) return { allowed: true };
  if (policy.killSwitch) return { allowed: false, code: "AGENT_PAUSED", message: "This agent is temporarily unavailable." };
  if (input.length > policy.maxInputChars) return { allowed: false, code: "INPUT_TOO_LARGE", message: "That message is too long for this agent." };
  if (policy.blockPromptInjection && INJECTION_PATTERNS.some((p) => p.test(input))) return { allowed: false, code: "PROMPT_INJECTION", message: "I can't follow requests that attempt to override my safety or system instructions." };
  if (policy.blockSecrets && SECRET_PATTERNS.some((p) => p.test(input))) return { allowed: false, code: "SECRET_DETECTED", message: "Please remove passwords, API keys, tokens, or private keys before sending this message." };
  return { allowed: true };
}

export function inspectToolCall(bot: BotRow, permission: ToolPermission, input: Record<string, unknown>): GuardrailDecision {
  const policy = getSecurityPolicy(bot);
  if (!policy.enabled) return { allowed: true };
  if (policy.killSwitch) return { allowed: false, code: "AGENT_PAUSED", message: "This agent is temporarily unavailable." };
  if (permission === "sensitive" && policy.requireSensitiveApproval) return { allowed: false, code: "SENSITIVE_APPROVAL_REQUIRED", message: "This action requires explicit human approval before it can run." };
  const serialized = JSON.stringify(input);
  if (policy.blockSecrets && SECRET_PATTERNS.some((p) => p.test(serialized))) return { allowed: false, code: "SECRET_DETECTED", message: "The requested action contains a possible secret and was blocked." };
  return { allowed: true };
}

export function assertRunBudget(bot: BotRow, startedAt: number, modelCalls: number, toolCalls: number, estimatedCostUsd: number) {
  const policy = getSecurityPolicy(bot);
  if (!policy.enabled) return;
  if (Date.now() - startedAt > policy.maxRunMs) throw new Error("AGENT_RUNTIME_LIMIT: This agent run exceeded its time limit.");
  if (modelCalls >= policy.maxModelCalls) throw new Error("AGENT_MODEL_LIMIT: This agent reached its model-call limit.");
  if (toolCalls >= policy.maxToolCalls) throw new Error("AGENT_TOOL_LIMIT: This agent reached its tool-call limit.");
  if (estimatedCostUsd >= policy.maxCostUsd && policy.maxCostUsd > 0) throw new Error("AGENT_COST_LIMIT: This agent reached its per-run AI cost limit.");
}

export function enforceOutput(bot: BotRow, output: string) {
  const policy = getSecurityPolicy(bot);
  return policy.enabled ? output.slice(0, policy.maxOutputChars) : output;
}
