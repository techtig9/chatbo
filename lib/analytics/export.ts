import { csvEscape } from "@/lib/utils/csv";

export interface ExportableMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  feedback: "up" | "down" | null;
}

export function messagesToCsv(messages: ExportableMessage[]): string {
  const header = "timestamp,role,content,feedback";
  const rows = messages.map((m) =>
    [
      csvEscape(m.createdAt),
      csvEscape(m.role),
      csvEscape(m.content),
      csvEscape(m.feedback ?? ""),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function messagesToJson(messages: ExportableMessage[]): string {
  return JSON.stringify(messages, null, 2);
}
