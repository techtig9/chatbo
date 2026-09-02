import { Bot, Loader2, Check, X as XIcon, MinusCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type AgentNodeStatus = "enabled" | "disabled" | "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface AgentGraphNode {
  id: string;
  name: string;
  status: AgentNodeStatus;
  task: string | null;
  latencyMs: number | null;
  costUsd: number | null;
  successRatePct: number | null;
}

export interface AgentGraphSupervisor {
  id: string;
  name: string;
}

const STATUS_META: Record<AgentNodeStatus, { label: string; className: string; icon?: typeof Check; spin?: boolean }> = {
  enabled: { label: "Connected", className: "bg-success-soft text-success-ink", icon: Circle },
  disabled: { label: "Disabled", className: "bg-neutral-soft text-slate", icon: MinusCircle },
  queued: { label: "Queued", className: "bg-neutral-soft text-slate" },
  running: { label: "Running", className: "bg-signal-soft text-ink", icon: Loader2, spin: true },
  succeeded: { label: "Succeeded", className: "bg-success-soft text-success-ink", icon: Check },
  failed: { label: "Failed", className: "bg-danger-soft text-danger-ink", icon: XIcon },
  cancelled: { label: "Cancelled", className: "bg-neutral-soft text-slate", icon: MinusCircle },
};

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function AgentCard({ node, emphasized = false }: { node: AgentGraphNode | AgentGraphSupervisor; emphasized?: boolean }) {
  const full = "status" in node ? node : null;
  const meta = full ? STATUS_META[full.status] : null;
  const StatusIcon = meta?.icon;
  return (
    <div className={`w-56 rounded-2xl border bg-surface p-4 shadow-sm ${emphasized ? "border-signal/40 shadow-glow-sm" : "border-mist"}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium ${emphasized ? "bg-signal-soft text-ink" : "bg-elevated text-ink"}`}>
          {node.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{node.name}</p>
          {emphasized && <p className="text-[11px] text-slate">Supervisor</p>}
        </div>
      </div>
      {full && (
        <>
          <p className="mt-2.5 truncate text-xs text-slate" title={full.task ?? undefined}>{full.task ?? "No task yet"}</p>
          <div className="mt-2.5 grid grid-cols-3 gap-1 text-center text-[11px] text-slate">
            <div><p className="font-mono font-medium text-ink">{formatMs(full.latencyMs)}</p><p>latency</p></div>
            <div><p className="font-mono font-medium text-ink">{full.costUsd != null ? `$${full.costUsd.toFixed(4)}` : "—"}</p><p>cost</p></div>
            <div><p className="font-mono font-medium text-ink">{full.successRatePct != null ? `${full.successRatePct}%` : "—"}</p><p>success</p></div>
          </div>
          {meta && (
            <Badge tone={full.status === "succeeded" || full.status === "enabled" ? "success" : full.status === "failed" ? "danger" : full.status === "running" ? "info" : "neutral"} className="mt-2.5">
              {StatusIcon && <StatusIcon size={9} className={`mr-1 inline ${meta.spin ? "animate-spin" : ""}`} aria-hidden="true" />}
              {meta.label}
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hub-and-spoke visual graph (spec section 77): one supervisor connected
 * to its specialists, each specialist card showing avatar/status/task/
 * latency/cost/success rate. Used for both the static relationship
 * network (Multi-Agent page) and the live/most-recent execution view
 * (Orchestration page) — callers pass different data into the same
 * AgentGraphNode shape rather than this component knowing which context
 * it's in.
 */
export function AgentNetworkGraph({ supervisor, specialists }: { supervisor: AgentGraphSupervisor; specialists: AgentGraphNode[] }) {
  if (specialists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-mist bg-surface p-8">
        <Bot size={20} className="text-slate" aria-hidden="true" />
        <AgentCard node={supervisor} emphasized />
        <p className="text-sm text-slate">No specialists connected yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center overflow-x-auto rounded-2xl border border-mist bg-elevated p-8">
      <AgentCard node={supervisor} emphasized />
      {/* Trunk line down from the supervisor */}
      <div className="h-6 w-px bg-mist" aria-hidden="true" />
      <div className="relative flex items-start">
        {/* Horizontal branch bar spanning every specialist, only shown with 2+ */}
        {specialists.length > 1 && (
          <div className="absolute left-1/2 top-0 h-px -translate-x-1/2 bg-mist" style={{ width: `calc(100% - ${224 + 24}px)` }} aria-hidden="true" />
        )}
        <div className="flex gap-6">
          {specialists.map((s) => {
            const isActive = s.status === "running";
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div className={`h-6 w-px ${isActive ? "bg-signal" : "bg-mist"}`} aria-hidden="true">
                  {isActive && <div className="h-full w-full animate-pulse bg-signal" />}
                </div>
                <AgentCard node={s} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
