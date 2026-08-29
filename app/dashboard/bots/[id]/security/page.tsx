import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { getSecurityPolicy } from "@/lib/security/guardrails";

export default async function BotSecurityPage({ params }: { params: { id: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  const bot = await getBotById(params.id);
  if (!bot || bot.workspace_id !== workspace.workspaceId) notFound();
  const policy = getSecurityPolicy(bot);
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
    <Link href={`/dashboard/bots/${bot.id}/edit`} className="text-sm text-slate hover:text-ink">← Back to agent</Link>
    <div className="mt-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Runtime governance</p><h1 className="mt-1 font-display text-2xl font-semibold text-ink">Security & Guardrails</h1><p className="mt-2 text-sm leading-6 text-slate">Runtime policies are enforced on the server before tools and model execution.</p></div><ShieldCheck className="text-ink" size={32}/></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {[['Runtime protection', policy.enabled ? 'Enabled' : 'Disabled'],['Prompt injection', policy.blockPromptInjection ? 'Blocked' : 'Allowed'],['Secret detection', policy.blockSecrets ? 'Enabled' : 'Disabled'],['Sensitive tools', policy.requireSensitiveApproval ? 'Approval required' : 'Autonomous'],['Max tool calls', String(policy.maxToolCalls)],['Max model calls', String(policy.maxModelCalls)],['Max runtime', `${policy.maxRunMs} ms`],['Max AI cost', `$${policy.maxCostUsd.toFixed(2)}`]].map(([k,v]) => <div key={k} className="rounded-2xl border border-mist bg-surface p-5"><p className="text-xs text-slate">{k}</p><p className="mt-1 text-lg font-semibold text-ink">{v}</p></div>)}
    </div>
    {policy.killSwitch && <div className="mt-5 flex gap-3 rounded-2xl border border-ember/30 bg-ember/5 p-4 text-sm text-ember"><AlertTriangle size={18}/><div><strong>Emergency pause is active.</strong><p className="mt-1 text-xs">New runs are blocked until the pause is disabled in the Agent Builder.</p></div></div>}
    <div className="mt-6 rounded-2xl border border-mist bg-paper p-5 text-sm leading-6 text-slate"><strong className="text-ink">Need to change a policy?</strong> Open the Agent Builder → Guardrails. Changes are stored with the agent configuration and enforced server-side.</div>
  </main>;
}
