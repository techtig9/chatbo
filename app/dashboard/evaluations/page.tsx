import Link from "next/link";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

export default async function EvaluationsPage() {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("id,name").eq("workspace_id", workspace.workspaceId);
  const botIds = (bots || []).map((b) => b.id);
  const { data: runs } = botIds.length ? await admin.from("eval_runs").select("id,bot_id,status,score,started_at").in("bot_id", botIds).order("started_at", { ascending: false }).limit(50) : { data: [] };
  const botNames = new Map((bots || []).map((b) => [b.id, b.name]));
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><div className="flex items-center gap-3"><div className="rounded-xl bg-paper p-2"><FlaskConical className="text-ink"/></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Quality</p><h1 className="font-display text-2xl font-semibold text-ink">Agent evaluations</h1></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate">Run repeatable release-readiness tests across task success, grounding, tool use, safety and efficiency. Good agent evals inspect traces and intermediate actions, not only final text.</p><div className="mt-8 overflow-hidden rounded-2xl border border-mist bg-surface"><table className="min-w-full text-left text-sm"><thead className="bg-paper text-xs text-slate"><tr><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Started</th></tr></thead><tbody>{(runs || []).map((r:any)=><tr key={r.id} className="border-t border-mist"><td className="px-4 py-3"><Link className="font-medium text-ink hover:underline" href={`/dashboard/bots/${r.bot_id}/evals`}>{botNames.get(r.bot_id) || "Agent"}</Link></td><td className="px-4 py-3 text-slate">{r.status}</td><td className="px-4 py-3 font-semibold text-ink">{r.score ?? "—"}/100</td><td className="px-4 py-3 text-slate">{new Date(r.started_at).toLocaleString()}</td></tr>)}</tbody></table>{!runs?.length && <div className="flex flex-col items-center gap-3 p-10 text-center"><FlaskConical size={24} className="text-ink"/><div><p className="text-sm font-medium text-ink">No evaluation runs yet</p><p className="mt-1 text-sm text-slate">Open an agent and create a test suite to start scoring task success, grounding, tool use, safety, and efficiency.</p></div><Link href="/dashboard/bots" className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink/90">Open your agents</Link></div>}</div></main>
}
