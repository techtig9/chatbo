import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createAgentRelationship, setAgentRelationshipEnabled, deleteAgentRelationship } from "@/lib/actions/agents";
import { listWorkspaceAgents } from "@/lib/agents/collaboration";
import { getAgentNetworks } from "@/lib/data/agent-network";
import { Network, Plus, ShieldCheck, ArrowRight, Bot } from "lucide-react";
import { AgentNetworkGraph } from "@/components/multi-agent/agent-network-graph";

export const dynamic = "force-dynamic";
export default async function MultiAgentPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace(); if (!workspace) return null;
  const admin = createAdminClient();
  const [agents, rels, delegations, networks] = await Promise.all([
    listWorkspaceAgents(workspace.workspaceId),
    admin.from("agent_relationships").select("id,source_bot_id,target_bot_id,role,enabled,max_calls,max_input_chars,created_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }),
    admin.from("agent_delegations").select("id,source_bot_id,target_bot_id,task,status,result,error,created_at,completed_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(15),
    getAgentNetworks(workspace.workspaceId),
  ]);
  const name = (id: string) => agents.find((a: any) => a.id === id)?.name || "Unknown agent";
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Network size={23}/><h1 className="font-display text-2xl font-semibold text-ink">Multi-Agent Collaboration</h1></div><p className="mt-1 max-w-2xl text-sm text-slate">Connect specialist agents to supervisors and let agents delegate bounded tasks to one another.</p></div><a href="/dashboard/multi-agent/orchestration" className="rounded-lg border border-mist bg-surface px-4 py-2 text-sm font-medium text-ink">Open Orchestration</a></div>
    {searchParams.error && <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</div>}{searchParams.success && <div className="mt-5 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{searchParams.success}</div>}

    {networks.length > 0 && (
      <section className="mt-7 space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Agent network</h2>
        {networks.map((net) => (
          <AgentNetworkGraph key={net.supervisorId} supervisor={{ id: net.supervisorId, name: net.supervisorName }} specialists={net.specialists} />
        ))}
      </section>
    )}

    <section className="mt-7 rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2"><Plus size={18}/><h2 className="font-semibold">Create agent relationship</h2></div><form action={createAgentRelationship} className="mt-4 grid gap-3 md:grid-cols-5"><select name="sourceBotId" required className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm"><option value="">Supervisor / source</option>{agents.map((a: any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select><select name="targetBotId" required className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm"><option value="">Specialist / target</option>{agents.map((a: any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select><select name="role" className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm"><option value="specialist">Specialist</option><option value="worker">Worker</option></select><input name="maxCalls" type="number" min="1" max="100" defaultValue="10" className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm" placeholder="Calls/hour"/><button className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper">Connect agents</button></form><p className="mt-3 text-xs text-slate">Delegation is deny-by-default. The source agent can only call explicitly connected target agents.</p></section>
    <section className="mt-6 rounded-2xl border border-mist bg-surface p-5"><h2 className="font-semibold">All relationships</h2><div className="mt-4 space-y-2">{(rels.data || []).length ? rels.data!.map((r: any)=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper p-3 text-sm"><div className="flex items-center gap-2"><Bot size={16}/><strong>{name(r.source_bot_id)}</strong><ArrowRight size={14}/><span>{name(r.target_bot_id)}</span><span className="rounded-full border border-mist bg-surface px-2 py-0.5 text-xs">{r.role}</span></div><div className="flex items-center gap-3"><span className="text-xs text-slate">≤ {r.max_calls}/hour</span><form action={setAgentRelationshipEnabled.bind(null, r.id, !r.enabled)}><button className="text-xs underline">{r.enabled ? "Disable" : "Enable"}</button></form><form action={deleteAgentRelationship.bind(null, r.id)}><button className="text-xs text-danger underline">Delete</button></form></div></div>) : <p className="text-sm text-slate">No relationships yet. Connect a supervisor to a specialist.</p>}</div></section>
    <section className="mt-6 rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-semibold">Delegation history</h2></div><div className="mt-4 space-y-2">{(delegations.data || []).length ? delegations.data!.map((d: any)=><div key={d.id} className="rounded-lg border border-mist p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{name(d.source_bot_id)}</strong> → <strong>{name(d.target_bot_id)}</strong></span><span className="text-xs text-slate">{d.status}</span></div><p className="mt-1 text-slate">{d.task}</p>{d.error && <p className="mt-1 text-xs text-danger">{d.error}</p>}</div>) : <p className="text-sm text-slate">No delegated tasks yet.</p>}</div></section>
  </main>;
}
