import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationProvider } from "@/lib/integrations/catalog";

export default async function IntegrationAccessPage({ params }: { params: { provider: string } }) {
  const provider = getIntegrationProvider(params.provider);
  if (!provider) notFound();
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return null;
  const supabase = createClient();
  const { data: connection } = await supabase.from("integration_connections").select("id,status,account_id").eq("workspace_id", workspace.workspaceId).eq("provider", provider.key).maybeSingle();
  if (!connection) return <main className="mx-auto max-w-3xl px-6 py-8"><Link href="/dashboard/integrations" className="inline-flex items-center gap-2 text-sm text-slate"><ArrowLeft size={15}/>Back</Link><h1 className="mt-6 font-display text-2xl font-semibold text-ink">Connect {provider.name} first</h1><a href={`/api/integrations/connect?provider=${provider.key}`} className="mt-4 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper">Connect {provider.name}</a></main>;
  const { data: bots } = await supabase.from("bots").select("id,name,status").eq("workspace_id", workspace.workspaceId).order("created_at", { ascending: false });
  const { data: permissions } = await supabase.from("agent_integration_permissions").select("bot_id,enabled").eq("connection_id", connection.id);
  const enabled = new Set((permissions ?? []).filter((p) => p.enabled).map((p) => p.bot_id));
  return <main className="mx-auto max-w-3xl px-6 py-8"><Link href="/dashboard/integrations" className="inline-flex items-center gap-2 text-sm text-slate"><ArrowLeft size={15}/>Back to integrations</Link><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-ink">Agent access</p><h1 className="mt-2 font-display text-2xl font-semibold text-ink">{provider.name}</h1><p className="mt-2 text-sm leading-6 text-slate">Choose exactly which agents can use this connected account. Connecting a provider never grants every agent automatic access.</p><section className="mt-6 rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2 text-sm"><CheckCircle2 size={17} className="text-success"/>Connection: <strong>{connection.status}</strong>{connection.account_id ? <span className="text-slate">({connection.account_id})</span> : null}</div><div className="mt-5 space-y-3">{(bots ?? []).map((bot) => <div key={bot.id} className="flex items-center justify-between rounded-xl border border-mist bg-paper p-4"><div><p className="font-semibold text-ink">{bot.name}</p><p className="text-xs text-slate">{bot.status}</p></div><form action="/api/integrations/permissions" method="post"><input type="hidden" name="botId" value={bot.id}/><input type="hidden" name="connectionId" value={connection.id}/><input type="hidden" name="enabled" value={enabled.has(bot.id) ? "false" : "true"}/><input type="hidden" name="provider" value={provider.key}/><button type="submit" className={`rounded-lg px-3 py-2 text-xs font-semibold ${enabled.has(bot.id) ? "border border-mist bg-surface text-ink" : "bg-ink text-paper"}`}>{enabled.has(bot.id) ? "Revoke access" : "Grant access"}</button></form></div>)}</div>{!bots?.length && <p className="mt-4 text-sm text-slate">Create an agent before granting integration access.</p>}</section></main>;
}
