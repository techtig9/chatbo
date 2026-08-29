import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Globe, Rocket, RotateCcw, ShieldCheck } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { createClient } from "@/lib/supabase/server";
import { addBotDomain, deployBot, rollbackDeployment } from "@/lib/actions/deployments";
import { FormMessage } from "@/components/form-message";

export default async function DeploymentPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; success?: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  const bot = await getBotById(params.id);
  if (!bot || bot.workspace_id !== workspace.workspaceId) notFound();
  const supabase = createClient();
  const [{ data: deployments }, { data: domains }] = await Promise.all([
    supabase.from("bot_deployments").select("id, environment, status, deployed_at, version_id, bot_versions(version_number)").eq("bot_id", bot.id).order("deployed_at", { ascending: false }).limit(12),
    supabase.from("bot_domains").select("id, hostname, status, verification_token, created_at").eq("bot_id", bot.id).order("created_at", { ascending: false }),
  ]);
  const deployStaging = deployBot.bind(null, bot.id, "staging");
  const deployProduction = deployBot.bind(null, bot.id, "production");
  const rollbackProduction = rollbackDeployment.bind(null, bot.id, "production");
  const addDomain = addBotDomain.bind(null, bot.id);
  const currentProduction = deployments?.find((d) => d.environment === "production" && d.status === "active");
  const currentStaging = deployments?.find((d) => d.environment === "staging" && d.status === "active");
  // Explicit tuple type — without it, TS widens this array literal to
  // (string | typeof currentStaging)[] (not a tuple), so destructuring
  // gives `name` the type `string | DeploymentRow | undefined`, which
  // isn't valid to render directly as {name} in JSX.
  const environmentCards: [string, typeof currentStaging][] = [
    ["Staging", currentStaging],
    ["Production", currentProduction],
  ];

  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <Link href={`/dashboard/bots/${bot.id}/edit`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"><ArrowLeft size={14}/> Back to editor</Link>
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h1 className="font-display text-2xl font-semibold text-ink">Deployment</h1><p className="text-sm text-slate">Move {bot.name} from draft to staging and production with version history and rollback.</p></div>
      <div className="flex gap-2"><form action={deployStaging}><button className="rounded-lg border border-mist px-4 py-2 text-sm font-medium">Deploy staging</button></form><form action={deployProduction}><button className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper">Deploy production</button></form></div>
    </div>
    <FormMessage error={searchParams.error} success={searchParams.success}/>
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      {environmentCards.map(([name, item]) => <section key={name} className="rounded-2xl border border-mist bg-surface p-5"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Rocket size={16}/>{name}</div><p className="text-2xl font-semibold text-ink">{item ? `v${(item as any).bot_versions?.version_number ?? '?'}` : 'Not deployed'}</p><p className="mt-1 text-xs text-slate">{item ? new Date(item.deployed_at).toLocaleString() : 'No active deployment'}</p></section>)}
      <section className="rounded-2xl border border-mist bg-surface p-5"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16}/> Release policy</div><p className="text-sm text-slate">Recommended: evaluate + security-check every release before production.</p></section>
    </div>
    <section className="mb-6 rounded-2xl border border-mist bg-surface p-5"><h2 className="mb-4 font-semibold text-ink">Deployment history</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-mist text-xs text-slate"><th className="py-2">Environment</th><th>Version</th><th>Status</th><th>Deployed</th><th></th></tr></thead><tbody>{deployments?.map((d: any) => <tr key={d.id} className="border-b border-mist/70"><td className="py-3 capitalize">{d.environment}</td><td>v{d.bot_versions?.version_number ?? '?'}</td><td>{d.status}</td><td>{new Date(d.deployed_at).toLocaleString()}</td><td>{d.environment === 'production' && d.status === 'active' ? <form action={rollbackProduction}><button className="inline-flex items-center gap-1 rounded-md border border-mist px-2 py-1 text-xs"><RotateCcw size={12}/> Roll back</button></form> : null}</td></tr>)}</tbody></table></div></section>
    <section className="rounded-2xl border border-mist bg-surface p-5"><div className="mb-4 flex items-center gap-2"><Globe size={17}/><h2 className="font-semibold text-ink">Custom domains</h2></div><p className="mb-4 text-sm text-slate">Connect a domain for a branded hosted agent experience. DNS verification is intentionally explicit before activation.</p><form action={addDomain} className="mb-5 flex gap-2"><input name="hostname" placeholder="support.example.com" className="bg-surface text-ink min-w-0 flex-1 rounded-lg border border-mist px-3 py-2 text-sm"/><button className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper">Add domain</button></form><div className="space-y-3">{domains?.map((d: any) => <div key={d.id} className="rounded-lg border border-mist p-3"><div className="flex items-center justify-between"><span className="font-medium text-ink">{d.hostname}</span><span className="text-xs text-slate">{d.status}</span></div><p className="mt-1 text-xs text-slate">Verification token: <code>{d.verification_token}</code></p></div>)}</div></section>
  </main>;
}
