import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return null;
  const supabase = createClient() as any;
  const { data: rows } = await supabase.from("referrals").select("id,referred_email,status,reward_cents,created_at").eq("referrer_workspace_id", workspace.workspaceId).order("created_at", { ascending: false }).limit(25);
  const code = `CHATBO-${workspace.workspaceId.slice(0, 8).toUpperCase()}`;
  return <main className="mx-auto max-w-3xl px-6 py-8"><h1 className="font-display text-2xl font-semibold">Referrals</h1><p className="mt-1 text-sm text-slate">Invite another team to chatbo.ai. Your referral program can later be connected to your billing provider for automatic rewards.</p><div className="mt-6 rounded-2xl border border-mist bg-surface p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate">Your referral code</p><div className="mt-2 rounded-lg bg-paper px-4 py-3 font-mono text-sm">{code}</div><p className="mt-2 text-xs text-slate">Share this code with a customer or teammate. Reward amounts are configured by the platform.</p></div><div className="mt-6 rounded-2xl border border-mist bg-surface"><div className="border-b border-mist px-5 py-4 text-sm font-semibold">Recent referrals</div>{(rows ?? []).length === 0 ? <p className="px-5 py-8 text-sm text-slate">No referrals yet.</p> : <div className="divide-y divide-mist">{rows.map((r: any) => <div key={r.id} className="flex items-center justify-between px-5 py-4 text-sm"><span>{r.referred_email ?? "Invite"}</span><span className="capitalize text-slate">{r.status}</span></div>)}</div>}</div></main>;
}
