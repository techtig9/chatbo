import Link from "next/link";
import { Plus, Sparkles, ArrowRight } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listAgentsForWorkspace } from "@/lib/data/agents-list";
import { FormMessage } from "@/components/form-message";
import { AgentsGrid } from "@/components/dashboard/agents-grid";

export default async function BotsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { workspace } = await getCurrentUserAndWorkspace();
  const agents = workspace ? await listAgentsForWorkspace(workspace.workspaceId) : [];

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Agent workspace</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-2 text-sm text-slate">Create, test, connect, and publish specialized agents.</p>
        </div>
        <Link href="/dashboard/bots/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:-translate-y-0.5">
          <Plus size={16} /> Create agent
        </Link>
      </div>

      <FormMessage error={searchParams.error} success={searchParams.success} />

      {agents.length === 0 ? (
        <div className="mt-5 overflow-hidden rounded-3xl border border-mist bg-surface shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-8 sm:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal/10 text-ink">
                <Sparkles size={20} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-semibold">Build your first agent from a description.</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate">
                Tell chatbo the job you want done. We&apos;ll generate the first version
                of the role, instructions, conversation behavior, and starter questions.
              </p>
              <Link href="/dashboard/bots/new" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper">
                Start building <ArrowRight size={16} />
              </Link>
            </div>
            <div className="border-t border-mist bg-paper p-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate">Agent lifecycle</p>
              <div className="mt-5 space-y-4">
                {["Describe", "Generate", "Add knowledge & tools", "Test", "Publish"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface font-mono text-[10px] font-semibold text-ink">{index + 1}</span>
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <AgentsGrid agents={agents} />
        </div>
      )}
    </main>
  );
}
