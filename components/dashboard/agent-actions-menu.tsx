"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Copy, Rocket, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import { setBotPublishStatus, setBotArchived, duplicateBot, deleteBot } from "@/lib/actions/bots";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";

export function AgentActionsMenu({ botId, botName, status }: { botId: string; botName: string; status: "draft" | "published" | "archived" }) {
  const [open, setOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function run(action: () => Promise<{ success: boolean; error?: string; newBotId?: string }>, successMessage?: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await action();
      if (!result.success && result.error) {
        // Previously a blocking native browser confirm dialog — now
        // uses the same toast system as the success path below, per
        // spec section 89/90's shared success/error notification pattern.
        showToast("error", result.error);
      } else if (result.newBotId) {
        router.push(`/dashboard/bots/${result.newBotId}/edit`);
      } else {
        router.refresh();
        if (successMessage) showToast("success", successMessage);
      }
    });
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={pending}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate transition hover:bg-elevated hover:text-ink disabled:opacity-50"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={15} />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-mist bg-elevated py-1 shadow-lg">
          <button type="button" role="menuitem" onClick={() => run(() => duplicateBot(botId), "Agent duplicated")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface">
            <Copy size={14} aria-hidden="true" /> Duplicate
          </button>
          {status !== "archived" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (status === "published") {
                  // Unpublish is the safe direction — it takes the agent
                  // out of customer reach, so it doesn't need the same
                  // "are you sure" gate as making it live does.
                  run(() => setBotPublishStatus(botId, false), "Agent unpublished");
                } else {
                  setOpen(false);
                  setPublishModalOpen(true);
                }
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface"
            >
              <Rocket size={14} aria-hidden="true" /> {status === "published" ? "Unpublish" : "Publish"}
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => run(() => setBotArchived(botId, status !== "archived"), status === "archived" ? "Agent unarchived" : "Agent archived")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface">
            {status === "archived" ? <ArchiveRestore size={14} aria-hidden="true" /> : <Archive size={14} aria-hidden="true" />}
            {status === "archived" ? "Unarchive" : "Archive"}
          </button>
          <div className="my-1 border-t border-mist" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setDeleteModalOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-ink hover:bg-danger-soft"
          >
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        </div>
      )}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { setDeleteModalOpen(false); startTransition(() => deleteBot(botId)); }}
        title={`Delete "${botName}"?`}
        message="This permanently removes its knowledge base and conversation history and can't be undone."
        confirmLabel="Delete agent"
        pending={pending}
      />
      <ConfirmModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirm={() => { setPublishModalOpen(false); run(() => setBotPublishStatus(botId, true), "Agent published"); }}
        title={`Publish "${botName}"?`}
        message="This makes the agent reachable wherever it's deployed — your widget, share link, or connected channels."
        confirmLabel="Publish"
        tone="primary"
        pending={pending}
      />
    </div>
  );
}
