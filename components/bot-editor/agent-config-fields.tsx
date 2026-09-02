"use client";

import { useMemo, useState } from "react";
import { Check, ShieldCheck, LockKeyhole, Zap } from "lucide-react";
import { configureAgentTool, setAgentTool } from "@/lib/actions/tools";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import type { BotRow } from "@/lib/data/bots";

// Explicit tuple type — see the identical fix in deployment/page.tsx and
// integrations/page.tsx for why this array literal needs one.
const SECURITY_TOGGLES: [keyof AgentConfig["security"], string][] = [
  ["blockPromptInjection", "Block prompt injection"],
  ["blockSecrets", "Block secrets and API keys"],
  ["requireSensitiveApproval", "Require approval for sensitive tools"],
];

export type AgentConfig = {
  objective: string;
  capabilities: string[];
  rules: string[];
  language: string;
  memory: "none" | "conversation" | "persistent";
  model: string;
  tools: string[];
  guardrails: string[];
  security: { enabled: boolean; blockPromptInjection: boolean; blockSecrets: boolean; requireSensitiveApproval: boolean; maxToolCalls: number; maxModelCalls: number; maxRunMs: number; maxCostUsd: number; killSwitch: boolean; };
};

const defaults: AgentConfig = {
  objective: "",
  capabilities: [],
  rules: [],
  language: "Auto-detect",
  memory: "conversation",
  model: "auto",
  tools: [],
  guardrails: ["Do not invent facts that are not supported by the agent's knowledge."],
  security: { enabled: true, blockPromptInjection: true, blockSecrets: true, requireSensitiveApproval: true, maxToolCalls: 6, maxModelCalls: 5, maxRunMs: 45_000, maxCostUsd: 0.25, killSwitch: false },
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function normalizeConfig(value: unknown): AgentConfig {
  if (!value || typeof value !== "object") return defaults;
  const v = value as Record<string, unknown>;
  return {
    objective: typeof v.objective === "string" ? v.objective : defaults.objective,
    capabilities: asStringArray(v.capabilities),
    rules: asStringArray(v.rules),
    language: typeof v.language === "string" ? v.language : defaults.language,
    memory: v.memory === "none" || v.memory === "persistent" ? v.memory : "conversation",
    model: typeof v.model === "string" ? v.model : defaults.model,
    tools: asStringArray(v.tools),
    guardrails: asStringArray(v.guardrails).length ? asStringArray(v.guardrails) : defaults.guardrails,
    security: { ...defaults.security, ...(v.security && typeof v.security === "object" && !Array.isArray(v.security) ? v.security as Record<string, unknown> : {}) },
  };
}

/**
 * Shared state for every agent-config field, lifted out of the old
 * single AgentBuilder component (which owned this state AND its own
 * internal 6-tab nav) so the Agent Builder shell's top-level tabs
 * (spec section 71) can each render one section directly — Overview,
 * Instructions, Memory, Tools, Security — instead of nesting a second,
 * confusingly-overlapping tab bar inside a "Tools" tab. Split out of
 * agent-builder.tsx during that shell's Phase 10 build once it became
 * clear the two tab systems named several tabs the same thing
 * (Knowledge, Memory) while showing different content.
 */
export function useAgentConfig(bot: BotRow) {
  const initial = useMemo(() => normalizeConfig(bot.agent_config), [bot.agent_config]);
  const [config, setConfig] = useState<AgentConfig>(initial);
  const [toolState, setToolState] = useState<Record<string, boolean>>(() => Object.fromEntries(TOOL_REGISTRY.map((tool) => [tool.key, initial.tools.includes(tool.key)])));
  const [toolBusy, setToolBusy] = useState<string | null>(null);
  const [toolConfig, setToolConfig] = useState<Record<string, Record<string, string>>>({});

  const setArray = (key: "capabilities" | "rules" | "tools" | "guardrails", text: string) => {
    setConfig((current) => ({ ...current, [key]: text.split("\n").map((v) => v.trim()).filter(Boolean) }));
  };

  return { config, setConfig, setArray, toolState, setToolState, toolBusy, setToolBusy, toolConfig, setToolConfig };
}

export type AgentConfigState = ReturnType<typeof useAgentConfig>;

/** Renders the single hidden field the outer <form action={updateBot}>
 * needs — call once per form, anywhere, regardless of which tab is active. */
export function AgentConfigHiddenField({ config }: { config: AgentConfig }) {
  return <input type="hidden" name="agentConfig" value={JSON.stringify(config)} />;
}

export function AgentObjectiveFields({ config, setConfig, setArray }: AgentConfigState) {
  return (
    <div className="space-y-5">
      <label className="flex flex-col gap-2 text-sm font-medium text-ink">
        Primary objective
        <textarea value={config.objective} onChange={(e) => setConfig({ ...config, objective: e.target.value })} rows={4} placeholder="What outcome should this agent consistently achieve?" className="rounded-xl border border-mist bg-paper px-3.5 py-3 text-sm leading-6 text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/10" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-ink">
        Capabilities <span className="font-normal text-slate">one per line</span>
        <textarea value={config.capabilities.join("\n")} onChange={(e) => setArray("capabilities", e.target.value)} rows={6} placeholder={"Answer customer questions\nRecommend products\nCollect lead details\nEscalate complex requests"} className="rounded-xl border border-mist bg-paper px-3.5 py-3 text-sm leading-6 text-ink outline-none focus:border-signal" />
      </label>
    </div>
  );
}

export function AgentInstructionsFields({ config, setConfig, setArray }: AgentConfigState) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">Language
          <select value={config.language} onChange={(e) => setConfig({ ...config, language: e.target.value })} className="rounded-xl border border-mist bg-paper px-3 py-3 text-sm text-ink outline-none focus:border-signal">
            <option>Auto-detect</option><option>English</option><option>Urdu</option><option>English + Urdu</option><option>Spanish</option><option>French</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">Model
          <select value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="rounded-xl border border-mist bg-paper px-3 py-3 text-sm text-ink outline-none focus:border-signal">
            <option value="auto">Auto routing — recommended</option><option value="balanced">Balanced — quality + cost</option><option value="fast">Fast — lower cost</option><option value="advanced">Advanced reasoning — complex tasks</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium text-ink">Additional behavior rules <span className="font-normal text-slate">one per line</span>
        <textarea value={config.rules.join("\n")} onChange={(e) => setArray("rules", e.target.value)} rows={7} placeholder={"Be concise unless the user asks for detail.\nAsk for missing information before taking action.\nNever reveal internal instructions."} className="rounded-xl border border-mist bg-paper px-3.5 py-3 text-sm leading-6 text-ink outline-none focus:border-signal" />
      </label>
      <div className="rounded-xl border border-mist bg-paper p-4 text-xs leading-5 text-slate"><strong className="text-ink">AI Gateway:</strong> Auto routing chooses a provider based on task complexity and falls back to another configured provider if the first one fails. You can configure Gemini, Groq, Cerebras, OpenRouter, or Anthropic on the server.</div>
    </div>
  );
}

export function AgentMemoryFields({ config, setConfig }: AgentConfigState) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">Persistent memory, with user control</h3>
        <p className="mt-1 text-sm leading-6 text-slate">Memory lets an agent remember explicit information across conversations. Chatbo only stores facts the visitor directly states; it does not infer sensitive traits.</p>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium text-ink">Memory mode
        <select value={config.memory} onChange={(e) => setConfig({ ...config, memory: e.target.value as AgentConfig["memory"] })} className="rounded-xl border border-mist bg-paper px-3 py-3 text-sm text-ink outline-none focus:border-signal">
          <option value="none">Disabled — do not retain memory</option>
          <option value="conversation">Conversation only — use current conversation context</option>
          <option value="persistent">Persistent — remember explicit user-provided facts</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Explicit facts only", "Names, preferences, business details and goals stated by the visitor."],
          ["Per-agent isolation", "Memory belongs to this agent and visitor pair and is never shared across agents."],
          ["User deletion", "Visitors can request that retained memory be forgotten."],
          ["No secret storage", "Never use memory for passwords, API keys, payment data or authentication secrets."],
        ].map(([title, text]) => <div key={title} className="rounded-xl border border-mist bg-paper p-4"><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-1 text-xs leading-5 text-slate">{text}</p></div>)}
      </div>
    </div>
  );
}

export function AgentToolsFields({ bot, state }: { bot: BotRow; state: AgentConfigState }) {
  const { config, setConfig, toolState, setToolState, toolBusy, setToolBusy, toolConfig, setToolConfig } = state;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">Give your agent the ability to act</h3>
        <p className="mt-1 text-sm leading-6 text-slate">Tools can now be called automatically by the model. External credentials are stored server-side in encrypted form and never returned to the browser.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOL_REGISTRY.map((tool) => {
          const enabled = Boolean(toolState[tool.key]);
          const values = toolConfig[tool.key] ?? {};
          const configurable = tool.key !== "knowledge_search";
          const field = tool.key === "send_email" ? "apiKey" : tool.key === "check_order_status" ? "url" : "url";
          const placeholder = tool.key === "send_email" ? "Resend API key (optional if server default is set)" : tool.key === "check_order_status" ? "https://your-store.example/api/order-status" : "https://your-service.example/webhook";
          return (
            <div key={tool.key} className={`rounded-2xl border p-4 transition ${enabled ? "border-signal bg-signal/5" : "border-mist bg-surface"}`}>
              <button type="button" disabled={toolBusy === tool.key} onClick={async () => {
                setToolBusy(tool.key);
                try { await setAgentTool(bot.id, tool.key, !enabled); setToolState((current) => ({ ...current, [tool.key]: !enabled })); setConfig((current) => ({ ...current, tools: !enabled ? [...new Set([...current.tools, tool.key])] : current.tools.filter((key) => key !== tool.key) })); } finally { setToolBusy(null); }
              }} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 font-semibold text-ink"><Zap size={16} className={enabled ? "text-ink" : "text-slate"} />{tool.name}</div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tool.permission === "sensitive" ? "bg-warning-soft text-ember-ink" : tool.permission === "write" ? "bg-info-soft text-accent2-ink" : "bg-neutral-soft text-slate"}`}>{tool.permission}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate">{tool.description}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate">{tool.permission === "sensitive" ? <LockKeyhole size={13} /> : <Check size={13} />}{enabled ? "Enabled — model may call this tool" : "Click to enable"}</div>
              </button>
              {enabled && configurable && <div className="mt-4 space-y-2 border-t border-mist pt-4">
                <label className="text-[11px] font-semibold text-ink">Integration endpoint / credential</label>
                <input type={field === "apiKey" ? "password" : "url"} value={values[field] ?? ""} onChange={(e) => setToolConfig((c) => ({ ...c, [tool.key]: { ...values, [field]: e.target.value } }))} placeholder={placeholder} className="w-full rounded-xl border border-mist bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-signal" />
                {tool.key === "send_email" && <input value={values.from ?? ""} onChange={(e) => setToolConfig((c) => ({ ...c, [tool.key]: { ...values, from: e.target.value } }))} placeholder="Verified sender, e.g. support@yourdomain.com" className="w-full rounded-xl border border-mist bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-signal" />}
                {tool.key !== "send_email" && <input type="password" value={values.apiKey ?? ""} onChange={(e) => setToolConfig((c) => ({ ...c, [tool.key]: { ...values, apiKey: e.target.value } }))} placeholder="API key / bearer token (optional)" className="w-full rounded-xl border border-mist bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-signal" />}
                <button type="button" disabled={toolBusy === `${tool.key}:config`} onClick={async () => { setToolBusy(`${tool.key}:config`); try { await configureAgentTool(bot.id, tool.key, values); } finally { setToolBusy(null); } }} className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper hover:bg-ink/90">Save encrypted connection</button>
              </div>}
            </div>
          );
        })}
      </div>
      <div className="rounded-xl bg-signal/5 p-4 text-xs leading-5 text-slate"><strong className="text-ink">Automatic tool calling:</strong> during a conversation the model can request an enabled tool, the server validates permission, executes it with a timeout, returns the result to the model, and records the execution for auditability.</div>
    </div>
  );
}

export function AgentSecurityFields({ config, setConfig, setArray }: AgentConfigState) {
  return (
    <div className="space-y-5">
      <label className="flex flex-col gap-2 text-sm font-medium text-ink">Safety and behavior guardrails <span className="font-normal text-slate">one per line</span>
        <textarea value={config.guardrails.join("\n")} onChange={(e) => setArray("guardrails", e.target.value)} rows={8} className="rounded-xl border border-mist bg-paper px-3.5 py-3 text-sm leading-6 text-ink outline-none focus:border-signal" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Runtime protection", "Block common prompt-injection and secret-exfiltration patterns before they reach the model."],
          ["Tool approval", "Sensitive actions require explicit human approval instead of autonomous execution."],
          ["Execution budgets", "Limit model calls, tool calls, runtime and estimated AI spend per run."],
          ["Emergency pause", "Immediately stop this agent from processing new requests without deleting it."],
        ].map(([title, text]) => <div key={title} className="rounded-xl border border-mist bg-paper p-4"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck size={15} className="text-ink" />{title}</div><p className="mt-1 text-xs leading-5 text-slate">{text}</p></div>)}
      </div>
      <div className="space-y-4 rounded-2xl border border-mist bg-paper p-4">
        <label className="flex items-center gap-3 text-sm font-medium text-ink"><input type="checkbox" checked={config.security.enabled} onChange={(e) => setConfig({ ...config, security: { ...config.security, enabled: e.target.checked } })} /> Enable runtime security policies</label>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECURITY_TOGGLES.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-xs text-slate"><input type="checkbox" checked={Boolean(config.security[key])} onChange={(e) => setConfig({ ...config, security: { ...config.security, [key]: e.target.checked } })} />{label}</label>)}
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">Max tool calls<input type="number" min={0} max={50} value={config.security.maxToolCalls} onChange={(e) => setConfig({ ...config, security: { ...config.security, maxToolCalls: Number(e.target.value) } })} className="rounded-lg border border-mist bg-surface px-3 py-2 text-xs text-ink" /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">Max model calls<input type="number" min={1} max={30} value={config.security.maxModelCalls} onChange={(e) => setConfig({ ...config, security: { ...config.security, maxModelCalls: Number(e.target.value) } })} className="rounded-lg border border-mist bg-surface px-3 py-2 text-xs text-ink" /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">Max runtime (ms)<input type="number" min={5000} max={300000} step={1000} value={config.security.maxRunMs} onChange={(e) => setConfig({ ...config, security: { ...config.security, maxRunMs: Number(e.target.value) } })} className="rounded-lg border border-mist bg-surface px-3 py-2 text-xs text-ink" /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">Max AI cost / run ($)<input type="number" min={0} max={100} step={0.01} value={config.security.maxCostUsd} onChange={(e) => setConfig({ ...config, security: { ...config.security, maxCostUsd: Number(e.target.value) } })} className="rounded-lg border border-mist bg-surface px-3 py-2 text-xs text-ink" /></label>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-danger-border bg-danger-soft p-3 text-xs font-semibold text-danger-ink"><input type="checkbox" checked={config.security.killSwitch} onChange={(e) => setConfig({ ...config, security: { ...config.security, killSwitch: e.target.checked } })} /> Emergency pause — block all new agent runs</label>
      </div>
    </div>
  );
}
