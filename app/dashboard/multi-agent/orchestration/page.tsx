import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listWorkspaceAgents } from "@/lib/agents/collaboration";
import { getMostRecentOrchestrationRun } from "@/lib/data/agent-network";
import { Network, ShieldCheck, Zap } from "lucide-react";
import { runMultiAgentOrchestration } from "@/lib/actions/orchestration";
import { AgentNetworkGraph } from "@/components/multi-agent/agent-network-graph";

export const dynamic = "force-dynamic";
export default async function OrchestrationPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return null;
  const admin = createAdminClient();
  const [agents, runs, latestRun] = await Promise.all([
    listWorkspaceAgents(workspace.workspaceId),
    (admin as any).from("multi_agent_runs").select("id,source_bot_id,task,mode,status,plan,total_cost_usd,error,created_at,completed_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(30),
    getMostRecentOrchestrationRun(workspace.workspaceId),
  ]);
  const name = (id: string) => agents.find((a: any) => a.id === id)?.name || "Unknown agent";
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="flex items-center gap-2"><Network size={23}/><h1 className="font-display text-2xl font-semibold text-ink">Multi-Agent Orchestration</h1></div>
    <p className="mt-1 max-w-3xl text-sm text-slate">Run bounded parallel, sequential, or supervisor-planned collaborations. Every target must be explicitly connected to the source agent.</p>{searchParams.error && <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</div>}{searchParams.success && <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{searchParams.success}</div>}

    {latestRun && latestRun.specialists.length > 0 && (
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Most recent execution</h2>
          <span className="text-xs capitalize text-slate">{latestRun.status.replace("_", " ")}</span>
        </div>
        <AgentNetworkGraph supervisor={{ id: latestRun.supervisorId, name: latestRun.supervisorName }} specialists={latestRun.specialists} />
      </section>
    )}

    <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2"><Zap size={18}/><h2 className="font-semibold">Test an orchestration</h2></div>
        <form action={runMultiAgentOrchestration} className="mt-4 space-y-3">
          <select name="sourceBotId" required className="bg-surface text-ink w-full rounded-lg border border-mist px-3 py-2 text-sm"><option value="">Select supervisor</option>{agents.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <textarea name="task" required rows={5} className="bg-surface text-ink w-full rounded-lg border border-mist px-3 py-2 text-sm" placeholder="Example: Research this lead, assess fit, and recommend the next sales action." />
          <select name="mode" defaultValue="supervisor" className="bg-surface text-ink w-full rounded-lg border border-mist px-3 py-2 text-sm"><option value="supervisor">Supervisor — dynamically select specialists</option><option value="parallel">Parallel — run all connected specialists</option><option value="sequential">Sequential — run specialists in priority order</option></select>
          <p className="text-xs text-slate">Supervisor mode uses only explicitly connected agents. Runtime limits prevent recursive or runaway orchestration.</p>
          <button className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper">Run orchestration</button>
        </form>
      </div>
      <div className="rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-semibold">Recent orchestration runs</h2></div><div className="mt-4 space-y-2">{(runs.data || []).length ? runs.data.map((r:any)=><div key={r.id} className="rounded-lg border border-mist p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{name(r.source_bot_id)}</strong><span className="rounded-full border border-mist px-2 py-0.5 text-xs">{r.mode} · {r.status}</span></div><p className="mt-1 text-slate">{r.task}</p><p className="mt-1 text-xs text-slate">{Array.isArray(r.plan) ? r.plan.length : 0} specialist steps · ${Number(r.total_cost_usd || 0).toFixed(4)}</p>{r.error && <p className="mt-1 text-xs text-danger">{r.error}</p>}</div>) : <p className="text-sm text-slate">No orchestration runs yet.</p>}</div></div>
    </section>
  </main>;
}
