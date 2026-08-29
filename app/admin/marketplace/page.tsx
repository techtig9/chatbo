import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AdminMarketplacePage() {
  const supabase = createClient();
  const { data } = await (supabase as any).from("marketplace_listings").select("id,title,category,status,visibility,security_scan_status,creator_name,created_at").in("status", ["pending_review","published","rejected"]).order("created_at", { ascending: false }).limit(100);
  return <main><h1 className="font-display text-2xl font-semibold text-ink">Marketplace moderation</h1><p className="mt-2 text-sm text-slate">Review public agent submissions and security-scan status before publication.</p><div className="mt-6 space-y-3">{(data ?? []).map((item: any) => <div key={item.id} className="rounded-2xl border border-mist bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-ink">{item.title}</p><p className="text-xs text-slate">{item.category} · {item.status} · scan: {item.security_scan_status}</p></div><div className="flex gap-2 text-xs"><span className="rounded-full bg-paper px-2 py-1">{item.visibility}</span><span className="rounded-full bg-paper px-2 py-1">{item.creator_name ?? "Creator"}</span></div></div></div>)}</div></main>;
}
