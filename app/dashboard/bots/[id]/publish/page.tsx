import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { createClient } from "@/lib/supabase/server";
import { createShareLink, updateAllowedDomains } from "@/lib/actions/shares";
import { getRequestOrigin } from "@/lib/utils/origin";
import { FormMessage } from "@/components/form-message";
import { CopyableSnippet } from "@/components/bot-editor/copyable-snippet";

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const bot = await getBotById(params.id);
  if (!bot || bot.workspace_id !== workspace.workspaceId) notFound();

  const supabase = createClient();
  const { data: share } = await supabase
    .from("shares")
    .select("slug")
    .eq("bot_id", bot.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const origin = getRequestOrigin();
  const embedSnippet = `<script src="${origin}/widget-loader.js" data-bot-id="${bot.id}" data-position="${bot.widget_position}"${bot.brand_color ? ` data-brand-color="${bot.brand_color}"` : ""}></script>`;

  const shareUrl = share ? `${origin}/chat/${share.slug}` : null;
  const qrDataUri = shareUrl ? await QRCode.toDataURL(shareUrl, { margin: 1, width: 200 }) : null;

  const createShareWithId = createShareLink.bind(null, bot.id);
  const updateDomainsWithId = updateAllowedDomains.bind(null, bot.id);

  if (bot.status !== "published") {
    return (
      <main className="mx-auto max-w-xl px-6 py-8">
        <Link
          href={`/dashboard/bots/${bot.id}/edit`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to editor
        </Link>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink">Publish</h1>
        <p className="text-sm text-slate">
          Publish {bot.name} from the editor first — the embed snippet and
          share link only work once the bot is live.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <Link
        href={`/dashboard/bots/${bot.id}/edit`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to editor
      </Link>

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Publish — {bot.name}</h1>
      <p className="mb-6 text-sm text-slate">Your bot is live. Here&rsquo;s how to put it in front of people.</p>

      <div className="mb-6">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-ink">Website widget</h2>
        <p className="mb-3 text-xs text-slate">
          Paste this one line before the closing <code>&lt;/body&gt;</code> tag on your site.
        </p>
        <CopyableSnippet code={embedSnippet} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-ink">Share link</h2>
        {!shareUrl ? (
          <form action={createShareWithId}>
            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Generate share link
            </button>
          </form>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <CopyableSnippet code={shareUrl} />
            </div>
            {qrDataUri && (
              // eslint-disable-next-line @next/next/no-img-element -- server-generated data URI, not an optimizable remote/local asset
              <img
                src={qrDataUri}
                alt={`QR code linking to ${shareUrl}`}
                className="h-24 w-24 rounded-lg border border-mist"
              />
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink">Allowed domains</h2>
        <p className="mb-3 text-xs text-slate">
          One per line. Leave empty to allow embedding anywhere.
        </p>
        <form action={updateDomainsWithId} className="flex flex-col gap-3">
          <textarea
            name="allowedDomains"
            rows={3}
            defaultValue={bot.allowed_domains?.join("\n") ?? ""}
            placeholder="example.com"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
          <button
            type="submit"
            className="self-start rounded-lg border border-mist px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper"
          >
            Save
          </button>
        </form>
      </section>
    </main>
  );
}
