"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Settings2, Unplug, Loader2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export function ConnectionMenu({ provider, providerName }: { provider: string; providerName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function disconnect() {
    setConfirmOpen(false);
    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        window.alert(body.error ?? "Couldn't disconnect. Try again.");
        return;
      }
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${providerName} settings`}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disconnecting}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate transition hover:bg-elevated hover:text-ink disabled:opacity-50"
      >
        {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={15} />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-mist bg-elevated py-1 shadow-lg">
          <Link href={`/dashboard/integrations/${provider}`} role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface">
            <Settings2 size={14} aria-hidden="true" /> Manage access
          </Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setConfirmOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
            <Unplug size={14} aria-hidden="true" /> Disconnect
          </button>
        </div>
      )}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={disconnect}
        title={`Disconnect ${providerName}?`}
        message="Agents granted access will lose it immediately."
        confirmLabel="Disconnect"
        pending={disconnecting}
      />
    </div>
  );
}
