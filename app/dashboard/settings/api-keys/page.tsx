import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { revokeApiKey } from "@/lib/actions/api-keys";
import { CreateApiKeyForm } from "@/components/api-keys/create-key-form";

export default async function ApiKeysPage() {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const canManage = authorizeWorkspaceAction(workspace.role, "apikey:manage");
  const apiAccess = PLAN_LIMITS[workspace.plan].features.publicApi;

  const supabase = createClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, scopes, last_used_at, created_at, revoked_at")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"
      >
        <ArrowLeft size={14} /> Settings
      </Link>

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">API Keys</h1>
      <p className="mb-6 text-sm text-slate">
        {apiAccess === "none"
          ? "Available on Pro (read-only) and Business (read/write) plans."
          : `Your plan includes ${apiAccess} API access.`}{" "}
        See{" "}
        <Link href="/developers" className="text-ink hover:underline">
          API docs
        </Link>
        .
      </p>

      {canManage && apiAccess !== "none" && (
        <div className="mb-8">
          <CreateApiKeyForm />
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {(keys ?? []).map((k) => (
          <li
            key={k.id}
            className="flex items-center justify-between rounded-lg border border-mist bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-slate" />
              <div>
                <p className="text-sm font-medium text-ink">{k.name}</p>
                <p className="text-xs text-slate">
                  {(k.scopes as string[]).join(", ")} ·{" "}
                  {k.last_used_at
                    ? `last used ${new Date(k.last_used_at).toLocaleDateString()}`
                    : "never used"}
                </p>
              </div>
            </div>
            {k.revoked_at ? (
              <span className="rounded-full bg-mist px-2 py-1 text-xs text-slate">Revoked</span>
            ) : (
              canManage && (
                <form action={revokeApiKey.bind(null, k.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-mist px-3 py-1 text-xs text-slate hover:border-danger hover:text-danger"
                  >
                    Revoke
                  </button>
                </form>
              )
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
