import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listBotsForWorkspace } from "@/lib/data/bots";

export default async function KnowledgeBaseLauncherPage() {
  const { workspace } = await getCurrentUserAndWorkspace();
  const bots = workspace ? await listBotsForWorkspace(workspace.workspaceId) : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Knowledge Base
      </h1>
      <p className="mb-6 text-sm text-slate">
        Each bot has its own knowledge base. Pick a bot to manage its sources.
      </p>

      {bots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist bg-surface p-8 text-center">
          <BookOpen size={24} className="mx-auto mb-3 text-slate" />
          <p className="mb-3 text-sm text-slate">Create a bot first.</p>
          <Link
            href="/dashboard/bots/new"
            className="inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Create a bot
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {bots.map((bot) => (
            <li key={bot.id}>
              <Link
                href={`/dashboard/bots/${bot.id}/knowledge`}
                className="flex items-center justify-between rounded-xl border border-mist bg-surface px-4 py-3 transition hover:border-signal"
              >
                <span className="font-medium text-ink">{bot.name}</span>
                <span className="text-xs text-slate">Manage sources →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
