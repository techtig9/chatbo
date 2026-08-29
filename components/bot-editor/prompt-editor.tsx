"use client";

import Editor from "@monaco-editor/react";

export function PromptEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-mist">
      <Editor
        height="360px"
        defaultLanguage="markdown"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        theme="vs"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
