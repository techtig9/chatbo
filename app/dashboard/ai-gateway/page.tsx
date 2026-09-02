import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getProviderDashboard, type ProviderCardData, type ProviderStatus } from "@/lib/data/ai-gateway";
import { redirect } from "next/navigation";
import { ArrowDown, Zap, Gauge, CircleDot, Cpu } from "lucide-react";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_META: Record<ProviderStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  healthy: { label: "Healthy", tone: "success" },
  rate_limited: { label: "Rate Limited", tone: "warning" },
  unavailable: { label: "Unavailable", tone: "danger" },
  not_configured: { label: "Not configured", tone: "neutral" },
};

const PROVIDER_LABEL: Record<string, string> = { groq: "Groq", cerebras: "Cerebras", openrouter: "OpenRouter", anthropic: "Anthropic Claude" };

function ProviderCard({ p }: { p: ProviderCardData }) {
  const meta = STATUS_META[p.status];
  return (
    <Card variant="primary" className={p.status === "not_configured" ? "opacity-60" : ""}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate">Priority {p.priority}</p>
          <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">{PROVIDER_LABEL[p.provider]}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-slate">{p.model}</p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      {p.provider === "anthropic" && <p className="mt-2 text-[11px] text-slate">Optional escalation — only used for complex requests once Groq, Cerebras, and OpenRouter are exhausted.</p>}
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-mist pt-3 text-center">
        <div><p className="font-mono text-sm font-semibold text-ink">{p.requests}</p><p className="text-[10px] text-slate">Requests</p></div>
        <div><p className="font-mono text-sm font-semibold text-ink">{p.successRatePct != null ? `${p.successRatePct}%` : "—"}</p><p className="text-[10px] text-slate">Success</p></div>
        <div><p className="font-mono text-sm font-semibold text-ink">{p.avgLatencyMs != null ? `${p.avgLatencyMs}ms` : "—"}</p><p className="text-[10px] text-slate">Latency</p></div>
        <div><p className="font-mono text-sm font-semibold text-ink">{p.totalTokens.toLocaleString()}</p><p className="text-[10px] text-slate">Tokens</p></div>
      </div>
    </Card>
  );
}

export default async function AIGatewayPage() {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const [providers, { data: rows }] = await Promise.all([
    getProviderDashboard(workspace.workspaceId),
    createAdminClient().from("ai_usage_records").select("provider, model, input_tokens, output_tokens, cached_tokens, estimated_cost_usd, latency_ms, success, created_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(100),
  ]);
  const items = rows || [];
  const totalCost = providers.reduce((s, p) => s + p.costUsd, 0);
  const totalRequests = providers.reduce((s, p) => s + p.requests, 0);

  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">AI Gateway</p><h1 className="mt-1 font-display text-2xl font-semibold text-ink">Models, routing &amp; usage</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Chatbo routes requests through the configured provider stack, records usage, and exposes latency and estimated cost so you can optimize quality and margins.</p></div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Card variant="metric"><p className="text-xs text-slate">Tracked requests (7d)</p><p className="mt-1 font-display text-2xl font-semibold text-ink">{totalRequests}</p></Card>
      <Card variant="metric"><p className="text-xs text-slate">Estimated cost (7d)</p><p className="mt-1 font-display text-2xl font-semibold text-ink">${totalCost.toFixed(4)}</p></Card>
      <Card variant="metric"><p className="text-xs text-slate">Configured providers</p><p className="mt-1 font-display text-2xl font-semibold text-ink">{providers.filter((p) => p.status !== "not_configured").length}/4</p></Card>
    </div>

    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <CardEyebrow>Provider stack</CardEyebrow>
        <h2 className="mb-4 mt-1 font-display text-lg font-semibold text-ink">Providers</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map((p) => <ProviderCard key={p.provider} p={p} />)}
        </div>
      </div>

      <div>
        <CardEyebrow>Fallback chain</CardEyebrow>
        <h2 className="mb-4 mt-1 font-display text-lg font-semibold text-ink">Routing order</h2>
        <Card variant="primary">
          <div className="flex flex-col items-center gap-1.5">
            {providers.map((p, i) => (
              <div key={p.provider} className="flex w-full flex-col items-center">
                <div className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${p.status === "not_configured" ? "bg-neutral-soft text-slate" : "bg-signal-soft text-ink"}`}>
                  <CircleDot size={12} className={p.status === "healthy" ? "text-success" : p.status === "rate_limited" ? "text-ember-ink" : p.status === "unavailable" ? "text-danger" : "text-slate"} aria-hidden="true" />
                  <span className="font-medium">{PROVIDER_LABEL[p.provider]}</span>
                </div>
                {i < providers.length - 1 && <ArrowDown size={14} className="my-1 text-slate" aria-hidden="true" />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate">Claude is only reached for requests classified as complex, and only once every provider ahead of it has failed.</p>
        </Card>

        <Card variant="primary" className="mt-4">
          <div className="mb-2 flex items-center gap-2"><Zap size={14} className="text-ink" aria-hidden="true" /><h3 className="text-sm font-semibold text-ink">Routing policy</h3></div>
          <ul className="space-y-1.5 text-[11px] leading-5 text-slate">
            <li><strong className="text-ink">Simple / normal:</strong> Groq → Cerebras → OpenRouter</li>
            <li><strong className="text-ink">Complex:</strong> adds Claude as a final escalation</li>
            <li>Advances automatically on quota (429), timeout, or outage — never on a successful response.</li>
          </ul>
        </Card>

        <Card variant="primary" className="mt-4">
          <div className="mb-2 flex items-center gap-2"><Gauge size={14} className="text-ink" aria-hidden="true" /><h3 className="text-sm font-semibold text-ink">Provider health</h3></div>
          <p className="text-[11px] leading-5 text-slate">After 3 consecutive failures, a provider is skipped for 2 minutes rather than retried on every request — it clears the moment one request succeeds.</p>
        </Card>
      </div>
    </section>

    <section className="mt-8 overflow-hidden rounded-2xl border border-mist bg-surface">
      <div className="flex items-center gap-2 border-b border-mist px-5 py-4"><Cpu size={16} className="text-ink" aria-hidden="true" /><h2 className="font-display text-lg font-semibold text-ink">Recent model activity</h2></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-paper text-xs text-slate"><tr><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Model</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{items.map((r, i) => <tr key={`${r.created_at}-${i}`} className="border-t border-mist"><td className="px-4 py-3 font-medium text-ink">{r.provider}</td><td className="px-4 py-3 text-slate">{r.model}</td><td className="px-4 py-3 text-slate">{Number(r.input_tokens)+Number(r.output_tokens)} <span className="text-[10px]">({r.cached_tokens} cached)</span></td><td className="px-4 py-3 text-slate">{r.latency_ms}ms</td><td className="px-4 py-3 text-slate">${Number(r.estimated_cost_usd).toFixed(5)}</td><td className="px-4 py-3">{r.success ? <span className="text-success">Success</span> : <span className="text-danger">Failed</span>}</td></tr>)}</tbody></table></div>
    </section>
  </main>;
}
