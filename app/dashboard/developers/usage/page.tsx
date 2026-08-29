import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

export default async function DeveloperUsagePage() {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  const supabase = createClient();
  const { data: rows } = await supabase.from("ai_usage_records").select("provider, model, input_tokens, output_tokens, cached_tokens, estimated_cost_usd, latency_ms, success, created_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(100);
  const usage = rows ?? [];
  const totalCost = usage.reduce((sum, r) => sum + Number(r.estimated_cost_usd || 0), 0);
  const totalInput = usage.reduce((sum, r) => sum + Number(r.input_tokens || 0), 0);
  const totalOutput = usage.reduce((sum, r) => sum + Number(r.output_tokens || 0), 0);
  const successRate = usage.length ? Math.round((usage.filter(r => r.success).length / usage.length) * 100) : 0;
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">Developer Platform</p><h1 className="mt-2 font-display text-2xl font-semibold text-ink">API usage</h1><p className="mt-2 text-sm text-slate">Recent model usage across your Chatbo developer workloads.</p></div><Link href="/developers" className="text-sm font-medium text-ink hover:underline">API docs</Link></div>
    <div className="mb-8 grid gap-4 md:grid-cols-4">{[["Requests", usage.length], ["Input tokens", totalInput.toLocaleString()], ["Output tokens", totalOutput.toLocaleString()], ["Estimated cost", `$${totalCost.toFixed(4)}`]].map(([k,v]) => <div key={String(k)} className="rounded-2xl border border-mist bg-surface p-5"><p className="text-xs text-slate">{k}</p><p className="mt-2 text-2xl font-semibold text-ink">{v}</p></div>)}</div>
    <div className="mb-5 rounded-2xl border border-mist bg-surface p-5"><p className="text-sm font-medium text-ink">API success rate</p><p className="mt-1 text-2xl font-semibold text-ink">{successRate}%</p></div>
    <div className="overflow-hidden rounded-2xl border border-mist bg-surface"><div className="border-b border-mist px-5 py-4 font-medium text-ink">Recent requests</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-paper text-xs text-slate"><tr>{["Time","Provider","Model","Tokens","Latency","Cost","Status"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{usage.map((r,i)=><tr key={`${r.created_at}-${i}`} className="border-t border-mist"><td className="px-5 py-3 text-slate">{new Date(r.created_at).toLocaleString()}</td><td className="px-5 py-3 text-ink">{r.provider}</td><td className="px-5 py-3 font-mono text-xs text-slate">{r.model}</td><td className="px-5 py-3 text-slate">{Number(r.input_tokens)+Number(r.output_tokens)}</td><td className="px-5 py-3 text-slate">{r.latency_ms}ms</td><td className="px-5 py-3 text-slate">${Number(r.estimated_cost_usd).toFixed(5)}</td><td className="px-5 py-3">{r.success ? <span className="text-success">Success</span> : <span className="text-danger">Failed</span>}</td></tr>)}</tbody></table></div></div>
  </main>;
}
