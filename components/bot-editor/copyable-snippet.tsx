"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyableSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-mist bg-paper px-3 py-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink">
        {code}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        className="shrink-0 rounded-md p-1.5 text-slate hover:bg-surface hover:text-ink"
      >
        {copied ? <Check size={14} className="text-ink" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
