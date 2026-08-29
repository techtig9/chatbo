import Link from "next/link";
import { redirect } from "next/navigation";
import { UserMinus, ScrollText, KeyRound, Webhook } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listWorkspaceMembers } from "@/lib/data/members";
import { inviteMember, changeMemberRole, removeMember } from "@/lib/actions/members";
import { setWorkspaceRequireMfa } from "@/lib/actions/mfa";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { FormMessage } from "@/components/form-message";
import { RoleSelect } from "@/components/settings/role-select";
import { InviteMemberModal } from "@/components/settings/invite-member-modal";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");

  const members = await listWorkspaceMembers(workspace.workspaceId);
  const canManageMembers = authorizeWorkspaceAction(workspace.role, "member:invite");
  const seatLimit = PLAN_LIMITS[workspace.plan].maxSeats;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Settings</h1>
      <p className="mb-6 text-sm text-slate">
        {workspace.workspaceName} · {members.length}
        {seatLimit !== null ? ` / ${seatLimit}` : ""} seats used
      </p>

      {canManageMembers && (
        <div className="mb-6 flex flex-wrap gap-4">
          <Link
            href="/dashboard/settings/activity"
            className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline"
          >
            <ScrollText size={13} /> View activity log
          </Link>
          <Link
            href="/dashboard/settings/api-keys"
            className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline"
          >
            <KeyRound size={13} /> API keys
          </Link>
          <Link
            href="/dashboard/settings/webhooks"
            className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline"
          >
            <Webhook size={13} /> Webhooks
          </Link>
        </div>
      )}

      <div className="mb-6">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      {canManageMembers && <InviteMemberModal inviteAction={inviteMember} />}
      <h2 className="mb-3 text-sm font-medium text-ink">Members</h2>
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-lg border border-mist bg-surface px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-ink">
                {member.name ?? member.email}
                {!member.joinedAt && (
                  <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs text-slate">
                    Pending
                  </span>
                )}
              </p>
              <p className="text-xs text-slate">{member.email}</p>
            </div>

            <div className="flex items-center gap-2">
              {canManageMembers && member.role !== "owner" ? (
                <RoleSelect
                  action={changeMemberRole.bind(null, member.id)}
                  defaultRole={member.role}
                />
              ) : (
                <span className="rounded-full bg-paper px-2 py-1 text-xs capitalize text-slate">
                  {member.role}
                </span>
              )}

              {canManageMembers && member.role !== "owner" && (
                <form action={removeMember.bind(null, member.id)}>
                  <button
                    type="submit"
                    aria-label={`Remove ${member.email}`}
                    className="rounded-lg p-1.5 text-slate hover:bg-paper hover:text-danger"
                  >
                    <UserMinus size={15} />
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      {workspace.role === "owner" && PLAN_LIMITS[workspace.plan].features.mfaOrgEnforceable && (
        <section className="mt-8 rounded-2xl border border-mist bg-surface p-4">
          <h2 className="mb-1 text-sm font-medium text-ink">
            Require two-factor authentication
          </h2>
          <p className="mb-3 text-xs text-slate">
            Members without MFA enrolled will see a lock screen until they
            set it up. This won&rsquo;t log anyone out immediately.
          </p>
          <form action={setWorkspaceRequireMfa.bind(null, workspace.workspaceId, !workspace.requireMfa)}>
            <button
              type="submit"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                workspace.requireMfa
                  ? "border border-mist text-ink hover:bg-paper"
                  : "bg-ink text-paper hover:bg-ink/90"
              }`}
            >
              {workspace.requireMfa ? "Disable requirement" : "Require for all members"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
