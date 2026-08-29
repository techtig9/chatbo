import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listAuditLogs, listDistinctAuditActions } from "@/lib/data/audit";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { AutoSubmitSelect } from "@/components/shared/auto-submit-select";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string };
}) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  if (!authorizeWorkspaceAction(workspace.role, "audit:read")) {
    redirect("/dashboard/settings?error=Audit+logs+are+an+admin-only+feature");
  }

  const page = Math.max(0, Number(searchParams.page ?? "0") || 0);
  const actionFilter = searchParams.action || undefined;

  const [{ rows, totalCount, pageSize }, availableActions] = await Promise.all([
    listAuditLogs({ workspaceId: workspace.workspaceId, page, actionFilter }),
    listDistinctAuditActions(workspace.workspaceId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const exportHref = `/api/dashboard/audit-export${actionFilter ? `?action=${encodeURIComponent(actionFilter)}` : ""}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"
      >
        <ArrowLeft size={14} /> Settings
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Activity</h1>
          <p className="text-sm text-slate">{totalCount} events logged</p>
        </div>
        <a
          href={exportHref}
          className="flex items-center gap-1.5 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
        >
          <Download size={13} /> Export CSV
        </a>
      </div>

      <form className="mb-4" action="/dashboard/settings/activity" method="get">
        <AutoSubmitSelect
          name="action"
          defaultValue={actionFilter ?? ""}
          options={availableActions}
          placeholder="All actions"
        />
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-slate">No activity yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mist bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Who</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-mist last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-slate">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-ink">{row.actorEmail}</td>
                  <td className="px-4 py-2 font-mono text-xs text-ink">{row.action}</td>
                  <td className="px-4 py-2 text-xs text-slate">{row.targetType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            href={`/dashboard/settings/activity?page=${Math.max(0, page - 1)}${actionFilter ? `&action=${actionFilter}` : ""}`}
            aria-disabled={page === 0}
            className={`rounded-lg border border-mist px-3 py-1.5 ${
              page === 0 ? "pointer-events-none opacity-40" : "hover:bg-paper"
            }`}
          >
            Previous
          </Link>
          <span className="text-slate">
            Page {page + 1} of {totalPages}
          </span>
          <Link
            href={`/dashboard/settings/activity?page=${Math.min(totalPages - 1, page + 1)}${actionFilter ? `&action=${actionFilter}` : ""}`}
            aria-disabled={page >= totalPages - 1}
            className={`rounded-lg border border-mist px-3 py-1.5 ${
              page >= totalPages - 1 ? "pointer-events-none opacity-40" : "hover:bg-paper"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </main>
  );
}
