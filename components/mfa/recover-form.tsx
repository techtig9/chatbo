"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { recoverMfaAccount } from "@/lib/actions/mfa";

export function RecoverForm() {
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await recoverMfaAccount(formData);
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <div className="rounded-lg border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
        Two-factor authentication has been reset on that account.{" "}
        <Link href="/login" className="text-ink hover:underline">
          Log in
        </Link>{" "}
        with your password — you can re-enroll a new device from Profile.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-ink">
        Email
        <input
          type="email"
          name="email"
          required
          className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        Recovery code
        <input
          type="text"
          name="code"
          required
          placeholder="XXXXX-XXXXX"
          className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm font-mono outline-none focus:border-signal"
        />
      </label>
      {result?.error && <p className="text-xs text-danger">{result.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
      >
        {isPending ? "Checking…" : "Reset two-factor authentication"}
      </button>
    </form>
  );
}
