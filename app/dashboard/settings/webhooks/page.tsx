import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Webhook } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { deleteWebhookEndpoint } from "@/lib/actions/webhooks";
import { FormMessage } from "@/components/form-message";
import { CreateWebhookForm } from "@/components/webhooks/create-webhook-form";

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  const canManage = authorizeWorkspaceAction(workspace.role, "webhook:manage");
  const hasAccess = PLAN_LIMITS[workspace.plan].features.outboundWebhooks;

  const supabase = createClient();
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, status, created_at")
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

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Webhooks</h1>
      <p className="mb-6 text-sm text-slate">
        {hasAccess
          ? "Get notified when conversations start, bots reply, or visitors leave feedback."
          : "Outbound webhooks are available on the Business plan."}
      </p>

      <div className="mb-6">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      {canManage && hasAccess && <CreateWebhookForm />}

      <ul className="flex flex-col gap-2">
        {(endpoints ?? []).map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-mist bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Webhook size={15} className="shrink-0 text-slate" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{e.url}</p>
                <p className="text-xs text-slate">{(e.events as string[]).join(", ")}</p>
              </div>
            </div>
            {canManage && (
              <form action={deleteWebhookEndpoint.bind(null, e.id)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-mist px-3 py-1 text-xs text-slate hover:border-danger hover:text-danger"
                >
                  Delete
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
