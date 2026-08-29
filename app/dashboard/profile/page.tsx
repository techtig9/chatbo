import { redirect } from "next/navigation";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { MfaEnrollFlow } from "@/components/mfa/enroll-flow";

export default async function ProfilePage() {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Profile</h1>
      <p className="mb-8 text-sm text-slate">Your account details and security settings.</p>

      <section className="mb-8 rounded-2xl border border-mist bg-surface p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Account</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate">Name</dt>
            <dd className="text-ink">{user.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium text-ink">Two-factor authentication</h2>
        <p className="mb-3 text-xs text-slate">
          Require a code from an authenticator app when logging in.
        </p>
        <MfaEnrollFlow />
      </section>
    </main>
  );
}
