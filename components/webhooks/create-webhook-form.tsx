"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { createWebhookEndpoint } from "@/lib/actions/webhooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const EVENTS = ["conversation.started", "message.created", "feedback.submitted"] as const;

/**
 * A signing secret was already being generated per webhook endpoint
 * (used to verify outbound payload authenticity) but was never actually
 * shown anywhere in the UI — without it, nobody could configure their
 * receiving server to verify signatures at all. Reveal-once modal with
 * copy confirmation, matching the same pattern already established for
 * API keys.
 */
export function CreateWebhookForm() {
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createWebhookEndpoint(formData);
      if (!result.success) setError(result.error ?? "Something went wrong.");
      else if (result.secret) setSecret(result.secret);
    });
  }

  return (
    <>
      <form action={handleSubmit} className="mb-8 flex flex-col gap-3 rounded-2xl border border-mist bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Endpoint URL
          <input
            type="url"
            name="url"
            required
            placeholder="https://example.com/webhooks/chatbo"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm text-ink">Events</legend>
          {EVENTS.map((event) => (
            <label key={event} className="flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" name="events" value={event} className="rounded border-mist" />
              <code className="text-xs">{event}</code>
            </label>
          ))}
        </fieldset>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" variant="secondary" loading={isPending} className="self-start">
          Create endpoint
        </Button>
      </form>

      <Modal open={secret !== null} onClose={() => setSecret(null)} title="Copy your signing secret now">
        <p className="text-sm leading-6 text-slate">
          Use this to verify the <code className="text-xs">X-Chatbo-Signature</code> header on incoming payloads. It won&rsquo;t be shown again after you close this dialog.
        </p>
        {secret && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-mist bg-elevated px-3 py-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink">{secret}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(secret);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              aria-label="Copy signing secret"
              className="shrink-0 rounded-md p-1.5 text-slate hover:bg-surface hover:text-ink"
            >
              {copied ? <Check size={14} className="text-success" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            </button>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => setSecret(null)}>Done</Button>
        </div>
      </Modal>
    </>
  );
}
