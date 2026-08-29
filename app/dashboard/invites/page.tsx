import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listPendingInvitesForUser } from "@/lib/data/members";
import { acceptInvite, declineInvite } from "@/lib/actions/members";
import { FormMessage } from "@/components/form-message";

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) redirect("/login");

  const invites = await listPendingInvitesForUser(user.id);

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Invites</h1>
      <p className="mb-6 text-sm text-slate">Workspaces that have invited you.</p>

      <div className="mb-4">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-slate">No pending invites.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => (
            <li
              key={invite.membershipId}
              className="flex items-center justify-between rounded-xl border border-mist bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{invite.workspaceName}</p>
                <p className="text-xs capitalize text-slate">as {invite.role}</p>
              </div>
              <div className="flex gap-2">
                <form action={acceptInvite.bind(null, invite.membershipId)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-lg bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:bg-signal/90"
                  >
                    <Check size={13} /> Accept
                  </button>
                </form>
                <form action={declineInvite.bind(null, invite.membershipId)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium text-slate hover:bg-paper"
                  >
                    <X size={13} /> Decline
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
