import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatUI } from "@/components/chat-widget/chat-ui";

// NOTE: this page does NOT use `export const revalidate` for ISR —
// tried it, and the build output proved it does nothing here: Supabase-
// JS's internal fetch calls don't participate in Next's fetch cache the
// way that export assumes, so the route stayed fully dynamic either
// way. Real edge caching for this page comes from the explicit
// Cache-Control headers in next.config.mjs instead — a mechanism that
// actually is verifiable (curl -I shows the header), rather than
// claiming ISR that the build output itself contradicts.
export const dynamic = "force-dynamic";

export default async function HostedChatPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();

  const { data: share } = await supabase
    .from("shares")
    .select("bot_id, is_public")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!share || !share.is_public) notFound();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", share.bot_id)
    .eq("status", "published")
    .maybeSingle();

  if (!bot) notFound();

  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col py-4 sm:py-8">
      <div className="flex-1 overflow-hidden rounded-xl border border-mist shadow-sm sm:rounded-2xl">
        <ChatUI
          bot={{
            id: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            brandColor: bot.brand_color,
            welcomeMessage: bot.welcome_message,
            starterQuestions: bot.starter_questions,
          }}
          channel="share_link"
        />
      </div>
    </div>
  );
}
