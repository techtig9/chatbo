import Link from "next/link";
import { BookOpen, Search, Globe2, Database, ShieldCheck } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";

export default async function AdvancedKnowledgePage() {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return null;
  const supabase = createClient();
  const db = supabase as any;
  const [{ data: bases }, { data: events }] = await Promise.all([
    db.from("knowledge_bases").select("id,name,description,status,created_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }),
    db.from("knowledge_retrieval_events").select("id,query,strategy,returned_chunks,top_score,latency_ms,created_at").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(8),
  ]);
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Knowledge intelligence</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Advanced Knowledge & RAG</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Manage reusable knowledge bases, inspect retrieval quality, and prepare your agents for hybrid semantic + keyword search.</p>
      </div>
      <Link href="/dashboard/knowledge-base" className="shrink-0 whitespace-nowrap rounded-lg border border-mist bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:border-signal/40">Manage a bot&rsquo;s knowledge →</Link>
    </div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Knowledge bases', bases?.length ?? 0, Database], ['Recent retrievals', events?.length ?? 0, Search], ['Hybrid search', 'Enabled', Globe2], ['Access control', 'Ready', ShieldCheck]].map(([label,value,Icon]) => <div key={String(label)} className="rounded-2xl border border-mist bg-surface p-5"><Icon size={18} className="text-ink"/><p className="mt-3 text-xs text-slate">{label}</p><p className="mt-1 text-xl font-semibold text-ink">{String(value)}</p></div>)}
    </div>
    <section className="mt-7 rounded-2xl border border-mist bg-surface p-5">
      <div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold text-ink">Knowledge bases</h2><p className="mt-1 text-xs text-slate">Reusable containers for sources and future team/agent permissions.</p></div><Link href="/dashboard/knowledge-base" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">Manage agent sources</Link></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{(bases ?? []).map((b:any)=><div key={b.id} className="rounded-xl border border-mist bg-paper p-4"><p className="font-semibold text-ink">{b.name}</p><p className="mt-1 text-xs text-slate">{b.description || 'No description'}</p><span className="mt-3 inline-flex rounded-full bg-signal-soft px-2 py-1 text-[11px] font-medium text-ink">{b.status}</span></div>)}</div>
      {!bases?.length && <p className="mt-5 text-sm text-slate">No knowledge bases yet.</p>}
    </section>
    <section className="mt-7 rounded-2xl border border-mist bg-surface p-5"><h2 className="font-display text-xl font-semibold text-ink">Recent retrieval quality</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-mist text-slate"><th className="py-2">Query</th><th>Strategy</th><th>Chunks</th><th>Top score</th><th>Latency</th></tr></thead><tbody>{(events ?? []).map((e:any)=><tr key={e.id} className="border-b border-mist/70"><td className="max-w-md truncate py-3 text-ink">{e.query}</td><td>{e.strategy}</td><td>{e.returned_chunks}</td><td>{e.top_score == null ? '—' : Number(e.top_score).toFixed(2)}</td><td>{e.latency_ms ?? '—'}ms</td></tr>)}</tbody></table></div></section>
  </main>;
}
