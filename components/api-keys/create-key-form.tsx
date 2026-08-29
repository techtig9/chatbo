"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { createApiKey } from "@/lib/actions/api-keys";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function CreateApiKeyForm() {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createApiKey(formData);
      if (result.error) setError(result.error);
      if (result.key) setNewKey(result.key);
    });
  }

  return (
    <>
      <form action={handleSubmit} className="flex items-end gap-3 rounded-2xl border border-mist bg-surface p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm text-ink">
          Key name
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Production integration"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create key"}
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>

      {/* API Key — spec section 86's named example. A newly-generated
         secret is the one moment in this flow where losing focus
         (scrolling past, an accidental click) genuinely costs the user
         something irreversible, so it gets the focus-trapped modal
         treatment rather than sitting inline in the page. */}
      <Modal open={newKey !== null} onClose={() => setNewKey(null)} title="Copy this key now">
        <p className="text-sm leading-6 text-slate">This key won&rsquo;t be shown again after you close this dialog.</p>
        {newKey && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-mist bg-elevated px-3 py-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink">{newKey}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              aria-label="Copy key"
              className="shrink-0 rounded-md p-1.5 text-slate hover:bg-surface hover:text-ink"
            >
              {copied ? <Check size={14} className="text-success" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            </button>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => setNewKey(null)}>Done</Button>
        </div>
      </Modal>
    </>
  );
}
