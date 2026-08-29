import Link from "next/link";
import { signIn, signInWithGoogle } from "@/lib/actions/auth";
import { FormMessage } from "@/components/form-message";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; redirectedFrom?: string };
}) {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Pick up right where your agents left off."
      subtitle="Log in to manage agents, review conversations, and keep improving what's already live."
    >
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Log in to chatbo.ai
      </h1>
      <p className="mb-6 text-sm text-slate">
        Build and manage the chatbots trained on your content.
      </p>

      <div className="mb-4">
        <FormMessage error={searchParams.error} success={searchParams.success} />
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

      <form action={signIn} className="flex flex-col gap-3">
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
            autoComplete="current-password"
            className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </label>
        <Link
          href="/forgot-password"
          className="self-end text-xs font-medium text-ink hover:underline"
        >
          Forgot password?
        </Link>
        <button
          type="submit"
          className="mt-1 w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-105"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-ink hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
