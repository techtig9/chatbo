"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { LogoMark } from "@/components/branding/logo";

/**
 * Uses the real brand mark, not a generic chat icon — this launcher IS
 * chatbo.ai representing itself (unlike widget-loader.js's bubble icon,
 * which stays deliberately generic since that one represents each
 * individual customer's own bot on their own site, not chatbo.ai).
 *
 * Only rendered when botId is provided (dashboard/layout.tsx passes
 * process.env.CONCIERGE_BOT_ID, read server-side — no NEXT_PUBLIC_
 * prefix needed since the layout is a Server Component passing the
 * resolved value down as a prop, not reading the env var in the
 * browser). Silently absent until someone runs the admin seed action
 * and sets that env var — no broken bubble pointing at a bot that
 * doesn't exist yet.
 */
export function ConciergeLauncher({ botId }: { botId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close help" : "Ask chatbo for help"}
        aria-expanded={isOpen}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition hover:scale-105"
      >
        {isOpen ? <X size={20} /> : <LogoMark size={22} variant="onDark" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 h-[520px] w-[360px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-mist bg-surface shadow-2xl">
          <iframe
            src={`/widget/${botId}`}
            title="Ask chatbo — product help"
            className="h-full w-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      )}
    </>
  );
}
