import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { ChatUI } from "@/components/chat-widget/chat-ui";

export default async function PlaygroundPage({ params }: { params: { id: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const bot = await getBotById(params.id);
  if (!bot || bot.workspace_id !== workspace.workspaceId) notFound();

  return (
    <main className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      <Link
        href={`/dashboard/bots/${bot.id}/edit`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to editor
      </Link>

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Playground — {bot.name}
      </h1>
      <p className="mb-6 text-sm text-slate">
        Test your bot here before publishing. Works even in draft status —
        this doesn&rsquo;t use the public widget path.
      </p>

      <div className="h-[600px] overflow-hidden rounded-xl border border-mist shadow-sm">
        <ChatUI
          bot={{
            id: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            brandColor: bot.brand_color,
            welcomeMessage: bot.welcome_message,
            starterQuestions: bot.starter_questions,
          }}
          channel="playground"
        />
      </div>
    </main>
  );
}
