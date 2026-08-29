"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateAndStoreRecoveryCodes } from "@/lib/actions/mfa";

type Step = "idle" | "enrolling" | "verifying" | "codes" | "done";

export function MfaEnrollFlow() {
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function startEnrollment() {
    setError(null);
    setStep("enrolling");
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });

    if (enrollError || !data || data.type !== "totp") {
      setError(enrollError?.message ?? "Couldn't start enrollment");
      setStep("idle");
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setStep("verifying");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Couldn't verify code");
      setIsSubmitting(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError("That code didn't match — check your authenticator app and try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const codes = await generateAndStoreRecoveryCodes();
      setRecoveryCodes(codes);
      setStep("codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrolled, but couldn't generate recovery codes.");
      setStep("done");
    }
    setIsSubmitting(false);
  }

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={startEnrollment}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
      >
        Enable two-factor authentication
      </button>
    );
  }

  if (step === "enrolling") {
    return <p className="text-sm text-slate">Starting enrollment…</p>;
  }

  if (step === "verifying") {
    return (
      <div className="max-w-sm rounded-2xl border border-mist bg-surface p-5">
        <p className="mb-3 text-sm text-ink">
          Scan this with your authenticator app, then enter the 6-digit code.
        </p>
        {qrCode && (
          <div
            className="mb-4 flex justify-center"
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
        )}
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
            className="rounded-lg border border-mist px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-signal"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
          >
            {isSubmitting ? "Verifying…" : "Verify & enable"}
          </button>
        </form>
      </div>
    );
  }

  if (step === "codes") {
    return (
      <div className="max-w-sm rounded-xl border border-signal bg-signal/5 p-5">
        <p className="mb-1 text-sm font-medium text-ink">Save your recovery codes</p>
        <p className="mb-3 text-xs text-slate">
          If you lose access to your authenticator app, one of these codes
          lets you reset MFA on your account. Each works once. This is the
          only time they&rsquo;ll be shown.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-surface p-3 font-mono text-xs text-ink">
          {recoveryCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStep("done")}
          className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          I&rsquo;ve saved these
        </button>
      </div>
    );
  }

  return <p className="text-sm text-ink">Two-factor authentication is enabled.</p>;
}
