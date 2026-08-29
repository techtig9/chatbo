"use client";
import { useMemo, useState, useTransition } from "react";
import {
  Plus, Save, Trash2, GripVertical, Zap, Sparkles, BookOpen, Users, GitBranch,
  Wrench, Globe, Mail, Webhook as WebhookIcon, Clock, Shuffle, UserCheck, CircleCheck,
  Loader2, Check, X as XIcon, MinusCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkflowDefinition, WorkflowNode, WorkflowNodeType } from "@/lib/workflows/types";
import { saveWorkflowJson } from "@/lib/actions/workflows";

export interface WorkflowRunStepSummary {
  nodeId: string;
  status: "running" | "succeeded" | "failed" | "skipped";
}
export interface LatestRunSummary {
  status: string;
  currentNodeId: string | null;
}

/** Icon + subtle color per node type (spec section 76: "node colors
 * should be subtle, not overly saturated" — every tint below is a card
 * background at 5% opacity with a 20% border, never a solid fill). */
const NODE_META: Record<WorkflowNodeType, { icon: LucideIcon; color: string; label: string }> = {
  trigger: { icon: Zap, color: "accent2", label: "Trigger" },
  ai: { icon: Sparkles, color: "signal", label: "AI Agent" },
  knowledge: { icon: BookOpen, color: "signal", label: "Knowledge" },
  agent: { icon: Users, color: "signal", label: "Delegate to Agent" },
  condition: { icon: GitBranch, color: "ember", label: "Condition" },
  tool: { icon: Wrench, color: "accent2", label: "Tool" },
  http: { icon: Globe, color: "accent2", label: "HTTP Request" },
  email: { icon: Mail, color: "accent2", label: "Email" },
  webhook: { icon: WebhookIcon, color: "accent2", label: "Webhook" },
  delay: { icon: Clock, color: "slate", label: "Delay" },
  transform: { icon: Shuffle, color: "slate", label: "Transform" },
  human_approval: { icon: UserCheck, color: "ember", label: "Human Approval" },
  end: { icon: CircleCheck, color: "success", label: "End" },
};

const palette = Object.entries(NODE_META) as [WorkflowNodeType, typeof NODE_META[WorkflowNodeType]][];

// Tailwind's JIT compiler can only pick up class names that appear as
// full literal strings in source — `bg-${meta.color}/10` would compile
// to nothing in production. This maps each of NODE_META's small, fixed
// set of color keys to fully-static class strings instead.
const COLOR_CLASSES: Record<string, { icon: string; badge: string; tint: string }> = {
  accent2: { icon: "bg-accent2/10 text-accent2", badge: "text-accent2", tint: "bg-accent2/[0.04]" },
  signal: { icon: "bg-signal/10 text-ink", badge: "text-ink", tint: "bg-signal/[0.04]" },
  ember: { icon: "bg-ember/10 text-ember", badge: "text-ember", tint: "bg-ember/[0.04]" },
  slate: { icon: "bg-mist text-slate", badge: "text-slate", tint: "bg-elevated" },
  success: { icon: "bg-success/10 text-success", badge: "text-success", tint: "bg-success/[0.04]" },
};

const defaults: Record<WorkflowNodeType, Record<string, unknown>> = {
  trigger: {},
  ai: { prompt: "{{input.message}}", system: "You are a helpful workflow assistant.", mode: "auto" },
  knowledge: { botId: "", query: "{{input.message}}" },
  agent: { targetBotId: "", sourceBotId: "", task: "{{input.message}}" },
  condition: { left: "{{last.text}}", operator: "contains", right: "yes" },
  tool: { botId: "", toolKey: "", input: {} },
  http: { method: "POST", url: "https://example.com/webhook", body: { data: "{{last}}" }, timeoutMs: 10000 },
  email: { to: "{{input.email}}", subject: "Chatbo workflow", body: "{{last.text}}" },
  webhook: { url: "https://example.com/webhook", body: { data: "{{last}}" }, timeoutMs: 10000 },
  delay: { ms: 1000 },
  transform: { value: { value: "{{input.message}}" } },
  human_approval: { message: "Please review this action before continuing." },
  end: { output: "{{last}}" },
};

function node(type: WorkflowNodeType, i: number): WorkflowNode {
  return { id: `${type}-${Date.now()}-${i}`, type, name: NODE_META[type].label, config: { ...defaults[type] }, x: 50 + (i % 3) * 210, y: 50 + Math.floor(i / 3) * 140 };
}

/** One-line, config-derived summary shown under the node title — the
 * "description" spec section 76 asks every node to show. */
export function describeNode(n: WorkflowNode): string {
  const c = n.config as Record<string, unknown>;
  const trim = (v: unknown, len = 34) => { const s = String(v ?? "").trim(); return s.length > len ? `${s.slice(0, len)}…` : s; };
  switch (n.type) {
    case "trigger": return "Starts the workflow";
    case "ai": return c.prompt ? trim(c.prompt) : "Configure a prompt";
    case "knowledge": return c.botId ? `Search knowledge · ${trim(c.query, 24)}` : "Choose an agent to search";
    case "tool": return c.toolKey ? `Run ${trim(c.toolKey)}` : "Choose a tool";
    case "agent": return c.targetBotId ? "Delegates to another agent" : "Choose a target agent";
    case "condition": return `${trim(c.left, 14)} ${String(c.operator ?? "equals")} ${trim(c.right, 14)}`;
    case "http": return c.url ? trim(c.url) : "Configure a URL";
    case "email": return c.to ? `To ${trim(c.to)}` : "Configure a recipient";
    case "webhook": return c.url ? trim(c.url) : "Configure a URL";
    case "delay": return `Wait ${Number(c.ms ?? 0).toLocaleString()}ms`;
    case "transform": return "Reshapes the data in flight";
    case "human_approval": return "Pauses for human approval";
    case "end": return "Workflow output";
    default: return "";
  }
}

export type NodeExecStatus = "idle" | "queued" | "running" | "waiting" | "succeeded" | "failed" | "skipped";

export function getNodeStatus(nodeId: string, steps: WorkflowRunStepSummary[], latestRun?: LatestRunSummary): NodeExecStatus {  if (!latestRun) return "idle";
  if (latestRun.status === "awaiting_approval" && latestRun.currentNodeId === nodeId) return "waiting";
  const step = steps.find((s) => s.nodeId === nodeId);
  if (step) return step.status;
  if (latestRun.status === "queued") return "queued";
  return "idle";
}

const STATUS_META: Record<NodeExecStatus, { label: string; className: string; icon?: LucideIcon; spin?: boolean }> = {
  idle: { label: "", className: "" },
  queued: { label: "Queued", className: "bg-mist text-slate" },
  running: { label: "Running", className: "bg-signal/10 text-ink", icon: Loader2, spin: true },
  waiting: { label: "Waiting", className: "bg-ember/10 text-ember", icon: UserCheck },
  succeeded: { label: "Completed", className: "bg-success/10 text-success", icon: Check },
  failed: { label: "Failed", className: "bg-danger/10 text-danger", icon: XIcon },
  skipped: { label: "Skipped", className: "bg-mist text-slate", icon: MinusCircle },
};

export function VisualWorkflowBuilder({
  workflowId,
  initialDefinition,
  latestRunSteps = [],
  latestRun,
}: {
  workflowId: string;
  initialDefinition: WorkflowDefinition;
  latestRunSteps?: WorkflowRunStepSummary[];
  latestRun?: LatestRunSummary;
}) {
  const [d, setD] = useState<WorkflowDefinition>(initialDefinition);
  const [selected, setSelected] = useState<string | null>(initialDefinition.nodes[0]?.id ?? null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [saving, startSaving] = useTransition();
  const pos = useMemo(() => new Map(d.nodes.map((n) => [n.id, { x: n.x ?? 40, y: n.y ?? 40 }])), [d]);
  const active = d.nodes.find((n) => n.id === selected);
  const NODE_W = 172, NODE_H = 84;

  const add = (t: WorkflowNodeType) => { const n = node(t, d.nodes.length); setD((v) => ({ ...v, nodes: [...v.nodes, n] })); setSelected(n.id); };
  const update = (patch: Partial<WorkflowNode>) => selected && setD((v) => ({ ...v, nodes: v.nodes.map((n) => (n.id === selected ? { ...n, ...patch } : n)) }));
  const cfg = (k: string, v: unknown) => selected && setD((x) => ({ ...x, nodes: x.nodes.map((n) => (n.id === selected ? { ...n, config: { ...n.config, [k]: v } } : n)) }));
  const remove = () => { if (!selected) return; setD((v) => ({ nodes: v.nodes.filter((n) => n.id !== selected), edges: v.edges.filter((e) => e.source !== selected && e.target !== selected) })); setSelected(null); };
  const connect = (target: string) => { if (!selected || selected === target || d.edges.some((e) => e.source === selected && e.target === target)) return; setD((v) => ({ ...v, edges: [...v.edges, { id: `e-${Date.now()}`, source: selected!, target }] })); };
  const save = () => { const f = new FormData(); f.set("definition", JSON.stringify(d)); startSaving(async () => { await saveWorkflowJson(workflowId, f); }); };

  return (
    <div className="overflow-hidden rounded-2xl border border-mist bg-surface">
      <div className="flex items-center justify-between border-b border-mist p-4">
        <div>
          <h3 className="font-semibold text-ink">Visual workflow builder</h3>
          <p className="text-xs text-slate">Drag nodes. Select a node, then double-click another node to connect them.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper">
          <Save size={15} />{saving ? "Saving…" : "Save workflow"}
        </button>
      </div>
      <div className="grid lg:grid-cols-[205px_1fr_270px]">
        <aside className="border-b border-mist p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate">Add node</p>
          {palette.map(([t, meta]) => {
            const Icon = meta.icon;
            const colors = COLOR_CLASSES[meta.color]!;
            return (
              <button key={t} onClick={() => add(t)} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-paper">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${colors.icon}`}><Icon size={13} /></span>
                <span className="text-sm font-medium">{meta.label}</span>
              </button>
            );
          })}
        </aside>

        <div
          className="relative min-h-[620px] overflow-auto bg-elevated"
          style={{
            // Subtle grid — a workflow canvas should read as a real
            // canvas, not a flat panel; kept faint enough to stay out of
            // the way of the actual nodes and connections.
            backgroundImage: "radial-gradient(circle, #D8D8CC 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onPointerMove={(e) => { if (!drag) return; const r = e.currentTarget.getBoundingClientRect(); setD((v) => ({ ...v, nodes: v.nodes.map((n) => (n.id === drag.id ? { ...n, x: Math.max(10, e.clientX - r.left - drag.dx), y: Math.max(10, e.clientY - r.top - drag.dy) } : n)) })); }}
          onPointerUp={() => setDrag(null)}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {d.edges.map((e) => {
              const a = pos.get(e.source), b = pos.get(e.target);
              if (!a || !b) return null;
              const traversed = getNodeStatus(e.source, latestRunSteps, latestRun) === "succeeded" && ["succeeded", "running", "failed"].includes(getNodeStatus(e.target, latestRunSteps, latestRun));
              return (
                <line
                  key={e.id}
                  x1={a.x + NODE_W} y1={a.y + NODE_H / 2} x2={b.x} y2={b.y + NODE_H / 2}
                  stroke={traversed ? "#C3F53C" : "#8C8E7F"}
                  strokeWidth={traversed ? 2.5 : 2}
                  strokeDasharray={traversed ? "6 6" : undefined}
                  className={traversed ? "animate-dash-flow" : undefined}
                />
              );
            })}
          </svg>
          {d.nodes.map((n) => {
            const p = pos.get(n.id)!;
            const meta = NODE_META[n.type];
            const colors = COLOR_CLASSES[meta.color]!;
            const Icon = meta.icon;
            const status = getNodeStatus(n.id, latestRunSteps, latestRun);
            const statusMeta = STATUS_META[status];
            const StatusIcon = statusMeta.icon;
            const isSelected = selected === n.id;
            return (
              <div
                key={n.id}
                onClick={() => setSelected(n.id)}
                onDoubleClick={() => connect(n.id)}
                onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setDrag({ id: n.id, dx: e.clientX - r.left, dy: e.clientY - r.top }); }}
                style={{ left: p.x, top: p.y, width: NODE_W }}
                className={`group absolute cursor-move rounded-xl border p-3 shadow-sm transition ${colors.tint} ${isSelected ? "border-signal ring-2 ring-signal/20" : "border-mist"}`}
              >
                {n.type !== "trigger" && <span aria-hidden="true" className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-elevated bg-mist" />}
                {n.type !== "end" && <span aria-hidden="true" className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-elevated bg-mist" />}

                <div className="flex items-center justify-between gap-1">
                  <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${colors.badge}`}>
                    <Icon size={12} aria-hidden="true" />{meta.label}
                  </span>
                  <GripVertical size={12} className="shrink-0 text-slate opacity-0 group-hover:opacity-100" aria-hidden="true" />
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-ink">{n.name}</p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-slate">{describeNode(n)}</p>
                {status !== "idle" && (
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.className}`}>
                    {StatusIcon && <StatusIcon size={9} aria-hidden="true" className={statusMeta.spin ? "animate-spin" : undefined} />}
                    {statusMeta.label}
                  </span>
                )}
              </div>
            );
          })}
          <div className="absolute bottom-3 left-3 rounded-lg border border-mist bg-surface px-3 py-2 text-[11px] text-slate">Tip: connect nodes with double-click.</div>
        </div>

        <aside className="border-t border-mist p-4 lg:border-l lg:border-t-0">
          {active ? (
            <>
              <div className="flex items-center justify-between">
                <div><p className="text-xs uppercase tracking-wide text-slate">Selected node</p><h4 className="font-semibold">{active.name}</h4></div>
                <button onClick={remove} className="rounded-lg p-2 text-danger hover:bg-danger/10"><Trash2 size={15} /></button>
              </div>
              <label className="mt-4 block text-xs font-medium text-slate">Name
                <input value={active.name} onChange={(e) => update({ name: e.target.value })} className="mt-1 w-full rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink" />
              </label>
              <div className="mt-4 space-y-3">
                {Object.entries(active.config).map(([k, v]) => (
                  <label key={k} className="block text-xs font-medium text-slate">{k}
                    <textarea
                      value={typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "")}
                      onChange={(e) => { let x: unknown = e.target.value; try { if (typeof v === "object") x = JSON.parse(e.target.value); } catch { /* keep raw text until valid JSON */ } cfg(k, x); }}
                      className="mt-1 min-h-[64px] w-full rounded-lg border border-mist bg-surface px-2 py-2 text-xs font-mono text-ink"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-paper p-3 text-xs text-slate">Incoming: {d.edges.filter((e) => e.target === active.id).length} · Outgoing: {d.edges.filter((e) => e.source === active.id).length}</div>
            </>
          ) : <p className="py-12 text-center text-sm text-slate">Select a node to configure it.</p>}
        </aside>
      </div>
    </div>
  );
}
