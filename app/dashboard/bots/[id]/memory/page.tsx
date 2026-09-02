import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Brain, ShieldCheck } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";

export default async function MemoryPage({ params }: { params: { id: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace(); if(!workspace)redirect("/login");
  const bot=await getBotById(params.id); if(!bot || bot.workspace_id!==workspace.workspaceId)notFound();
  const cfg=bot.agent_config && typeof bot.agent_config==="object" && !Array.isArray(bot.agent_config) ? bot.agent_config as Record<string,unknown> : {};
  const mode=cfg.memory === "none" || cfg.memory === "persistent" ? cfg.memory : "conversation";
  return <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
    <Link href={`/dashboard/bots/${bot.id}/edit`} className="mb-5 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"><ArrowLeft size={14}/> Back to agent</Link>
    <div className="rounded-2xl border border-mist bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-4"><div className="rounded-xl bg-signal-soft p-3 text-ink"><Brain/></div><div><h1 className="font-display text-2xl font-semibold text-ink">{bot.name} memory</h1><p className="mt-1 text-sm text-slate">Review how this agent is configured to remember visitor-provided information.</p></div></div>
      <div className="mt-7 rounded-xl border border-mist bg-paper p-4"><p className="text-xs font-bold uppercase tracking-wider text-ink">Current mode</p><p className="mt-1 text-lg font-semibold text-ink">{mode === "persistent" ? "Persistent memory" : mode === "conversation" ? "Conversation only" : "Disabled"}</p><p className="mt-1 text-sm text-slate">Change this setting from the Agent Builder → Memory section.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-mist p-4"><ShieldCheck className="text-ink" size={18}/><p className="mt-2 text-sm font-semibold text-ink">Privacy by design</p><p className="mt-1 text-xs leading-5 text-slate">Only explicit statements are eligible for persistent memory. Authentication secrets and payment information are never intentionally stored.</p></div><div className="rounded-xl border border-mist p-4"><Brain className="text-ink" size={18}/><p className="mt-2 text-sm font-semibold text-ink">Isolated memory</p><p className="mt-1 text-xs leading-5 text-slate">Memory is scoped to an agent and visitor identifier, preventing one agent&apos;s memories from appearing in another agent.</p></div></div>
    </div>
  </main>;
}
