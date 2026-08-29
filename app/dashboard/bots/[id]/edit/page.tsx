import { notFound, redirect } from "next/navigation";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { getAgentBuilderSummary } from "@/lib/data/agent-builder-summary";
import { updateBot, deleteBot } from "@/lib/actions/bots";
import { AgentBuilderShell } from "@/components/bot-editor/agent-builder-shell";

export default async function EditBotPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const bot = await getBotById(params.id);

  // RLS already scopes this read to the caller's workspace, but a
  // second explicit check here means a wrong ID gives a clean 404
  // instead of the more ambiguous "null bot" state leaking into the UI.
  if (!bot || bot.workspace_id !== workspace.workspaceId) {
    notFound();
  }

  const summary = await getAgentBuilderSummary(bot.id);
  const updateActionWithId = updateBot.bind(null, bot.id);
  const deleteActionWithId = deleteBot.bind(null, bot.id);

  return (
    <AgentBuilderShell
      bot={bot}
      updateAction={updateActionWithId}
      deleteAction={deleteActionWithId}
      summary={summary}
      formMessage={searchParams}
    />
  );
}
