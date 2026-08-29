import { resetPassword } from "@/lib/actions/auth";
import { FormMessage } from "@/components/form-message";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthShell
      eyebrow="Almost there"
      title="Set a password you'll remember."
      subtitle="This link is valid for one use — after this you'll be back in your dashboard."
    >
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Choose a new password
      </h1>
      <p className="mb-6 text-sm text-slate">
        This link is valid for one use.
      </p>

      <div className="mb-4">
        <FormMessage error={searchParams.error} />
      </div>

      <form action={resetPassword} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          New password
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
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
