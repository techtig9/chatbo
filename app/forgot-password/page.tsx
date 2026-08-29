import Link from "next/link";
import { forgotPassword } from "@/lib/actions/auth";
import { FormMessage } from "@/components/form-message";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="We'll get you back in."
      subtitle="Enter the email on your account and we'll send a link to set a new password."
    >
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Reset your password
      </h1>
      <p className="mb-6 text-sm text-slate">
        We&rsquo;ll email you a link to set a new one.
      </p>

      <div className="mb-4">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      <form action={forgotPassword} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </label>
        <button
          type="submit"
          className="mt-1 w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-105"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate">
        <Link href="/login" className="font-medium text-ink hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
