"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function MfaVerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFactor() {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        setError("No verified authenticator found on this account.");
        return;
      }
      setFactorId(totp.id);
    }
    loadFactor();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setError("Something went wrong. Try again.");
      setIsSubmitting(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError("That code didn't match. Try again.");
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        autoFocus
        required
        className="rounded-lg border border-mist px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-signal"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || code.length !== 6 || !factorId}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
      >
        {isSubmitting ? "Verifying…" : "Verify"}
      </button>
      <Link href="/mfa/recover" className="text-center text-xs text-ink hover:underline">
        Lost your device?
      </Link>
    </form>
  );
}
