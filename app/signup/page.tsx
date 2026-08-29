import Link from "next/link";
import { signUp, signInWithGoogle } from "@/lib/actions/auth";
import { FormMessage } from "@/components/form-message";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Your first agent can be live in minutes."
      subtitle="Free plan, no credit card required. Describe the job and chatbo builds the first working version for you."
    >
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Create your chatbo.ai account
      </h1>
      <p className="mb-6 text-sm text-slate">
        Free plan includes 2,500 credits a month — no card required.
      </p>

      <div className="mb-4">
        <FormMessage error={searchParams.error} />
      </div>

      <form action={signInWithGoogle} className="mb-4">
        <button
          type="submit"
          className="w-full rounded-lg border border-mist bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-paper"
        >
          Continue with Google
        </button>
      </form>

      <div className="mb-4 flex items-center gap-3 text-xs text-slate">
        <div className="h-px flex-1 bg-mist" />
        or
        <div className="h-px flex-1 bg-mist" />
      </div>

      <form action={signUp} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Name
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </label>
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
        <label className="flex flex-col gap-1 text-sm text-ink">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
          <span className="text-xs text-slate">
            At least 8 characters, one uppercase letter, one number.
          </span>
        </label>
        <button
          type="submit"
          className="mt-1 w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-105"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
