import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatUI } from "@/components/chat-widget/chat-ui";

// See /app/chat/[slug]/page.tsx for why this stays force-dynamic
// instead of using `revalidate` — real caching comes from the explicit
// Cache-Control headers in next.config.mjs instead.
export const dynamic = "force-dynamic";

export default async function WidgetPage({ params }: { params: { botId: string } }) {
  const supabase = createAdminClient();
  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.botId)
    .eq("status", "published")
    .maybeSingle();

  if (!bot) notFound();

  return (
    <div className="h-screen w-screen">
      <ChatUI
        bot={{
          id: bot.id,
          name: bot.name,
          avatar: bot.avatar,
          brandColor: bot.brand_color,
          welcomeMessage: bot.welcome_message,
          starterQuestions: bot.starter_questions,
        }}
        channel="widget"
      />
    </div>
  );
}
