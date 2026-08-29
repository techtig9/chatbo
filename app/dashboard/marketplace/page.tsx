import Link from "next/link";
import { Bot, Download, ShieldCheck, Star, Store, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { MARKETPLACE_CATEGORIES } from "@/lib/marketplace/catalog";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return null;
  const supabase = createClient();
  const { data: listings } = await (supabase as any).from("marketplace_listings")
    .select("id,slug,title,description,category,tags,pricing_type,price_cents,currency,license,installs_count,rating_average,rating_count,security_scan_status,creator_name")
    .eq("visibility", "public").eq("status", "published").order("installs_count", { ascending: false }).limit(50);
  const { data: mine } = await (supabase as any).from("marketplace_listings").select("id,title,status,visibility,installs_count,rating_average").eq("workspace_id", workspace.workspaceId).order("updated_at", { ascending: false });
  return <main className="mx-auto max-w-7xl px-6 py-8">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Agent marketplace</p><h1 className="mt-2 font-display text-2xl font-semibold text-ink">Discover, install and publish AI agents</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Turn proven Chatbo agents into reusable templates. Public agents pass a manifest security scan before publication and never include OAuth tokens, API keys or tenant-specific secrets.</p></div>
      <Link href="/dashboard/bots" className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper"><Bot size={16}/> Create an agent</Link>
    </div>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MARKETPLACE_CATEGORIES.map((category) => <div key={category} className="rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2"><Store size={17} className="text-ink"/><h2 className="font-semibold capitalize text-ink">{category}</h2></div><p className="mt-2 text-xs leading-5 text-slate">Ready-to-customize agents for {category} teams.</p></div>)}
    </section>
    <section className="mt-8"><div className="flex items-center gap-2"><Sparkles size={18} className="text-ink"/><h2 className="font-display text-xl font-semibold text-ink">Featured agents</h2></div>
      {(listings ?? []).length === 0 ? <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-mist bg-surface p-10 text-center"><Store size={24} className="text-ink"/><div><p className="text-sm font-medium text-ink">No public agents have been published yet</p><p className="mt-1 text-sm text-slate">Publish an agent, then list it here to share it with your organization or the marketplace.</p></div><Link href="/dashboard/bots" className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink/90">Open your agents</Link></div> : <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{(listings ?? []).map((item: any) => <article key={item.id} className="rounded-2xl border border-mist bg-surface p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-ink">{item.title}</h3><p className="mt-1 text-xs capitalize text-ink">{item.category}</p></div><ShieldCheck size={18} className={item.security_scan_status === "passed" ? "text-ink" : "text-slate"}/></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate">{item.description}</p><div className="mt-4 flex items-center gap-4 text-xs text-slate"><span className="inline-flex items-center gap-1"><Star size={13}/> {Number(item.rating_average).toFixed(1)} ({item.rating_count})</span><span className="inline-flex items-center gap-1"><Download size={13}/> {item.installs_count}</span></div><div className="mt-4 flex flex-wrap gap-1.5">{(item.tags ?? []).slice(0,5).map((tag: string) => <span key={tag} className="rounded-full bg-paper px-2 py-1 text-[10px] text-slate">#{tag}</span>)}</div></article>)}</div>}
    </section>
    <section className="mt-10 rounded-2xl border border-mist bg-surface p-6"><h2 className="font-display text-xl font-semibold text-ink">Your published agents</h2><div className="mt-4 space-y-2">{(mine ?? []).length === 0 ? <p className="text-sm text-slate">You have not published an agent yet.</p> : (mine ?? []).map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mist bg-paper p-3"><div><p className="font-medium text-ink">{item.title}</p><p className="text-xs text-slate">{item.status} · {item.visibility}</p></div><span className="text-xs text-slate">{item.installs_count} installs · {Number(item.rating_average).toFixed(1)} rating</span></div>)}</div></section>
  </main>;
}
