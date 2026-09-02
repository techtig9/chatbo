import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getOrganizationForWorkspace, listOrganizationMembers, listTeams } from "@/lib/enterprise";
import { createTeam, deleteTeam, changeOrganizationMemberRole } from "@/lib/actions/enterprise";
import { FormMessage } from "@/components/form-message";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";

const ROLES = ["admin","security_admin","billing_admin","developer","analyst","member","viewer"];

export default async function OrganizationPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");
  const org = await getOrganizationForWorkspace(workspace.workspaceId);
  if (!org) redirect("/dashboard/settings?error=Organization+not+configured");
  const [members, teams] = await Promise.all([listOrganizationMembers(org.id), listTeams(org.id)]);
  const canManage = authorizeWorkspaceAction(workspace.role, "member:invite");

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink"><Building2 size={14}/> Enterprise organization</p>
          <h1 className="font-display text-2xl font-semibold text-ink">{org.name}</h1>
          <p className="mt-1 text-sm text-slate">Manage organization roles, teams and enterprise access.</p>
        </div>
        <div className="flex items-center gap-2"><Link href="/dashboard/organization/security" className="rounded-lg border border-mist bg-surface px-3 py-2 text-xs font-medium text-ink hover:bg-paper">Security & Identity</Link><div className="rounded-lg border border-mist bg-surface px-3 py-2 text-xs text-slate">Workspace: {workspace.workspaceName}</div></div>
      </div>
      <div className="mb-6"><FormMessage error={searchParams.error} success={searchParams.success}/></div>

      <section className="mb-8 rounded-2xl border border-mist bg-surface p-5">
        <div className="mb-4 flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-medium text-ink">Organization roles</h2></div>
        <div className="space-y-2">
          {members.map((member) => <div key={member.id} className="flex items-center justify-between rounded-lg border border-mist px-3 py-3">
            <div><p className="text-sm font-medium text-ink">{member.name ?? member.email}</p><p className="text-xs text-slate">{member.email}</p></div>
            {canManage && member.role !== "owner" ? <form action={changeOrganizationMemberRole.bind(null, member.id)} className="flex items-center gap-2"><select name="role" defaultValue={member.role} className="bg-surface text-ink rounded-md border border-mist px-2 py-1.5 text-xs">{ROLES.map(r => <option key={r} value={r}>{r.replace("_"," ")}</option>)}</select><button className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper">Save</button></form> : <span className="rounded-full bg-paper px-2 py-1 text-xs capitalize text-slate">{member.role.replace("_"," ")}</span>}
          </div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-mist bg-surface p-5">
        <div className="mb-4 flex items-center gap-2"><Users size={18}/><h2 className="font-medium text-ink">Teams</h2></div>
        {canManage && <form action={createTeam} className="mb-5 grid gap-3 rounded-lg bg-paper p-4 md:grid-cols-[1fr_1.5fr_auto]"><input name="name" required placeholder="Team name" className="bg-surface text-ink rounded-md border border-mist px-3 py-2 text-sm"/><input name="description" placeholder="Description (optional)" className="bg-surface text-ink rounded-md border border-mist px-3 py-2 text-sm"/><button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"><Plus size={15}/> Create team</button></form>}
        <div className="grid gap-3 md:grid-cols-2">{teams.map(team => <div key={team.id} className="rounded-lg border border-mist p-4"><div className="flex items-start justify-between"><div><h3 className="text-sm font-medium text-ink">{team.name}</h3><p className="mt-1 text-xs text-slate">{team.description ?? "No description"}</p></div>{canManage && <form action={deleteTeam.bind(null, team.id)}><button aria-label={`Delete ${team.name}`} className="rounded-md p-1.5 text-slate hover:bg-paper hover:text-danger-ink"><Trash2 size={15}/></button></form>}</div></div>)}</div>
        {teams.length === 0 && <p className="py-8 text-center text-sm text-slate">No teams yet. Create your first department or specialist team.</p>}
      </section>
    </main>
  );
}
