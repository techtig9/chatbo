import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return null;
  const supabase = createClient();
  const [bots, knowledge, integrations, subscription] = await Promise.all([
    supabase.from("bots").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.workspaceId).eq("status", "published"),
    supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).in("bot_id", (await supabase.from("bots").select("id").eq("workspace_id", workspace.workspaceId)).data?.map((b) => b.id) ?? []),
    supabase.from("integration_connections").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.workspaceId).eq("status", "connected"),
    supabase.from("subscriptions").select("plan,status").eq("workspace_id", workspace.workspaceId).maybeSingle(),
  ]);
  const checks = [
    ["Create an AI agent", (bots.count ?? 0) > 0, "/dashboard/bots"],
    ["Add knowledge", (knowledge.count ?? 0) > 0, "/dashboard/knowledge-base"],
    ["Connect an integration", (integrations.count ?? 0) > 0, "/dashboard/integrations"],
    ["Choose the right plan", !!subscription.data, "/dashboard/billing"],
    ["Test before going live", true, "/dashboard/evaluations"],
    ["Review security settings", true, "/dashboard/organization/security-center"],
  ] as const;
  const done = checks.filter(([, ok]) => ok).length;
  return <main className="mx-auto max-w-4xl px-6 py-8">
    <div className="rounded-2xl border border-mist bg-surface p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Launch center</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">Ready to put your agent to work?</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Use this final checklist before inviting customers or teammates. It covers product setup, AI quality, integrations, billing, and security.</p>
      <div className="mt-7 rounded-xl bg-paper p-4"><div className="flex items-center justify-between text-sm"><span className="font-medium">Launch readiness</span><span className="font-mono text-ink">{done}/{checks.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full bg-signal" style={{ width: `${Math.round(done / checks.length * 100)}%` }} /></div></div>
      <div className="mt-6 divide-y divide-mist rounded-xl border border-mist">
        {checks.map(([label, ok, href]) => <Link key={label} href={href} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-paper"><span className="text-sm text-ink">{label}</span><span className={`text-xs font-semibold ${ok ? "text-ink" : "text-ember-ink"}`}>{ok ? "Ready" : "Needs setup"}</span></Link>)}
      </div>
    </div>
  </main>;
}
