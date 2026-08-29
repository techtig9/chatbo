"use client";

import { useRef } from "react";

export function RoleSelect({
  action,
  defaultRole,
}: {
  action: (formData: FormData) => void;
  defaultRole: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <select
        name="role"
        defaultValue={defaultRole}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-mist px-2 py-1 text-xs"
      >
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
    </form>
  );
}
