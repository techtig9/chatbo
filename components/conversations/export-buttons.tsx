"use client";

import { Download } from "lucide-react";
import { messagesToCsv, messagesToJson, type ExportableMessage } from "@/lib/analytics/export";

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  messages,
  filenameBase,
}: {
  messages: ExportableMessage[];
  filenameBase: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => downloadBlob(messagesToCsv(messages), `${filenameBase}.csv`, "text/csv")}
        className="flex items-center gap-1.5 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
      >
        <Download size={13} /> CSV
      </button>
      <button
        type="button"
        onClick={() =>
          downloadBlob(messagesToJson(messages), `${filenameBase}.json`, "application/json")
        }
        className="flex items-center gap-1.5 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
      >
        <Download size={13} /> JSON
      </button>
    </div>
  );
}
