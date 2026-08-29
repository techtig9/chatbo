import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createWorkflow, saveWorkflowJson, setWorkflowStatus, deleteWorkflow, runWorkflowManual, runWorkflowDurable, cancelWorkflowRun } from "@/lib/actions/workflows";
import { GitBranch, Play, Pause, Plus, Workflow, Zap, ShieldCheck } from "lucide-react";
import { VisualWorkflowBuilder } from "@/components/workflows/visual-builder";
import { EmptyWorkflowsState } from "@/components/workflows/empty-workflows-state";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage({ searchParams }: { searchParams: { workflow?: string; error?: string; success?: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return null;
  const admin = createAdminClient();
  const [{ data: workflows }, { data: runs }] = await Promise.all([
    admin.from("workflows").select("id,name,description,status,trigger_type,version,updated_at").eq("workspace_id", workspace.workspaceId).order("updated_at", { ascending: false }),
    admin.from("workflow_runs").select("id,workflow_id,status,trigger_type,duration_ms,current_node_id,created_at,error").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(12),
  ]);
  const selected = workflows?.find((w) => w.id === searchParams.workflow) || workflows?.[0];
  const { data: detail } = selected ? await admin.from("workflows").select("*").eq("id", selected.id).eq("workspace_id", workspace.workspaceId).single() : { data: null as any };
  const recentRuns = (runs || []).filter((r) => r.workflow_id === selected?.id);
  // Most recent run's per-node status — what the canvas paints as
  // execution state (spec section 76's Queued/Running/Waiting/Completed/
  // Failed) and which edges get the animated "traversed" treatment.
  const latestRun = recentRuns[0];
  const { data: latestRunStepRows } = latestRun
    ? await admin.from("workflow_run_steps").select("node_id,status").eq("run_id", latestRun.id)
    : { data: null as any };
  const latestRunSteps = (latestRunStepRows ?? []).map((s: any) => ({ nodeId: s.node_id, status: s.status }));
  return <main className="mx-auto max-w-7xl px-6 py-8">
    <div className="flex items-start justify-between gap-4">
      <div><div className="flex items-center gap-2"><GitBranch size={22} /><h1 className="font-display text-2xl font-semibold text-ink">Workflows & Automation</h1></div><p className="mt-1 max-w-2xl text-sm text-slate">Build multi-step business automations: trigger → AI → condition → action → approval → completion.</p></div>
      <form action={createWorkflow} className="flex gap-2"><input id="new-workflow-name" name="name" required placeholder="New workflow name" className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm" /><select name="trigger" className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm"><option value="manual">Manual</option><option value="webhook">Webhook</option><option value="conversation">Conversation</option><option value="schedule">Schedule</option></select><button className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"><Plus size={16}/>Create</button></form>
    </div>
    {searchParams.error && <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</div>}
    {searchParams.success && <div className="mt-5 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{searchParams.success}</div>}
    <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
      <section className="rounded-2xl border border-mist bg-surface p-3"><h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate">Your workflows</h2>{(workflows || []).length ? workflows!.map((w) => <Link key={w.id} href={`/dashboard/workflows?workflow=${w.id}`} className={`mb-1 block rounded-lg p-3 ${selected?.id === w.id ? "bg-ink text-white" : "hover:bg-paper"}`}><div className="flex items-center gap-2 text-sm font-medium"><Workflow size={15}/>{w.name}</div><div className={`mt-1 text-xs ${selected?.id === w.id ? "text-white/70" : "text-slate"}`}>{w.status} · v{w.version} · {w.trigger_type}</div></Link>) : <p className="p-3 text-xs leading-5 text-slate">No workflows yet — use the form above to create one.</p>}</section>
      <section className="space-y-5">
        {detail ? <>
          <div className="rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-xl font-semibold text-ink">{detail.name}</h2><p className="text-sm text-slate">Version {detail.version} · {detail.trigger_type} trigger · {detail.status}</p></div><div className="flex gap-2"><form action={async () => { "use server"; await setWorkflowStatus(detail.id, detail.status === "active" ? "paused" : "active"); }}><button className="inline-flex items-center gap-2 rounded-lg border border-mist px-3 py-2 text-sm">{detail.status === "active" ? <><Pause size={15}/>Pause</> : <><Play size={15}/>Activate</>}</button></form><form action={runWorkflowManual.bind(null, detail.id)}><button className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm text-white"><Zap size={15}/>Test run</button></form><form action={runWorkflowDurable.bind(null, detail.id)}><button className="inline-flex items-center gap-2 rounded-lg border border-mist px-3 py-2 text-sm"><Zap size={15}/>Durable run</button></form></div></div></div>
          <VisualWorkflowBuilder
            workflowId={detail.id}
            initialDefinition={{ nodes: detail.nodes as any, edges: detail.edges as any }}
            latestRunSteps={latestRunSteps}
            latestRun={latestRun ? { status: latestRun.status, currentNodeId: latestRun.current_node_id } : undefined}
          />
          <form action={saveWorkflowJson.bind(null, detail.id)} className="rounded-2xl border border-mist bg-surface p-5"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-ink">Advanced JSON editor</h3><p className="text-xs text-slate">Power users can edit the exact workflow graph directly.</p></div><button className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink">Save JSON</button></div><textarea name="definition" defaultValue={JSON.stringify({ nodes: detail.nodes, edges: detail.edges }, null, 2)} className="min-h-[280px] w-full rounded-lg border border-mist bg-elevated p-4 font-mono text-xs text-ink outline-none" spellCheck={false}/></form>
          <div className="rounded-2xl border border-mist bg-surface p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-ink" size={19}/><div><h3 className="font-semibold text-ink">Durable execution</h3><p className="mt-1 text-sm text-slate">Production runs are queued in the background, retried on transient failures, and tracked step-by-step.</p></div></div></div>
          <div className="grid gap-4 md:grid-cols-2">{[{t:"Available nodes",items:["AI Agent","Condition","HTTP Request","Email","Webhook","Delay","Transform","Human Approval","End"]},{t:"Production pattern",items:["Trigger → Validate → AI","Condition → branch","Action → verify","Approval → continue","Retry/timeout → failure path"]}].map((c)=><div key={c.t} className="rounded-2xl border border-mist bg-surface p-5"><h3 className="font-semibold">{c.t}</h3><ul className="mt-3 space-y-2 text-sm text-slate">{c.items.map(i=><li key={i}>• {i}</li>)}</ul></div>)}</div>
          <div className="rounded-2xl border border-mist bg-surface p-5"><h3 className="font-semibold">Recent runs</h3>{recentRuns.length ? <div className="mt-3 space-y-2">{recentRuns.map(r=><div key={r.id} className="flex items-center justify-between rounded-lg bg-paper p-3 text-sm"><span>{r.status} · {r.trigger_type}</span><span className="flex items-center gap-3 text-slate">{r.duration_ms ?? "—"} ms {(r.status === "queued" || r.status === "running") && <form action={cancelWorkflowRun.bind(null, r.id)}><button className="text-danger hover:underline">Cancel</button></form>}</span></div>)}</div> : <p className="mt-2 text-sm text-slate">No runs yet.</p>}</div>
          <form action={async () => { "use server"; await deleteWorkflow(detail.id); }}><button className="text-sm text-danger hover:underline">Delete workflow</button></form>
        </> : <EmptyWorkflowsState />}
      </section>
    </div>
  </main>;
}
