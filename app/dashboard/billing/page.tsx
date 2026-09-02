import { redirect } from "next/navigation";
import { CreditCard, ExternalLink, Receipt } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS, PLAN_PRICES_USD } from "@/lib/billing/plans";
import { getBillingOverview } from "@/lib/data/billing-usage";
import { getSubscriptionManagementUrls } from "@/lib/billing/paddle-api";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { UsageBarRow } from "@/components/billing/usage-bar";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Plan } from "@/lib/supabase/types";

const PLAN_ORDER: Plan[] = ["free", "starter", "pro", "business"];
const PLAN_LABELS: Record<Plan, string> = { free: "Free", starter: "Starter", pro: "Pro", business: "Business" };
const PRICE_IDS: Partial<Record<Plan, string | undefined>> = {
  starter: process.env.PADDLE_PRICE_ID_STARTER,
  pro: process.env.PADDLE_PRICE_ID_PRO,
  business: process.env.PADDLE_PRICE_ID_BUSINESS,
};

export default async function BillingPage() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");

  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("status, paddle_subscription_id, renews_at").eq("workspace_id", workspace.workspaceId).maybeSingle();

  // Usage resets on the billing cycle boundary — renews_at minus ~1
  // month is the closest available proxy for "period start" without a
  // dedicated period-start column, since Paddle doesn't hand that back directly.
  const periodStart = subscription?.renews_at ? new Date(new Date(subscription.renews_at).getTime() - 30 * 86400000) : new Date(Date.now() - 30 * 86400000);

  const [overview, managementUrls] = await Promise.all([
    getBillingOverview(workspace.workspaceId, workspace.plan, workspace.creditsRemaining, periodStart),
    subscription?.paddle_subscription_id ? getSubscriptionManagementUrls(subscription.paddle_subscription_id) : Promise.resolve({ updatePaymentMethod: null, cancel: null }),
  ]);

  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const currentPlanIndex = PLAN_ORDER.indexOf(workspace.plan);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Billing</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Plan &amp; usage</h1>

      {!clientToken && (
        <div className="mt-5 rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-sm text-ink">
          Paddle isn&rsquo;t configured yet (missing <code className="mx-1 font-mono text-xs">NEXT_PUBLIC_PADDLE_CLIENT_TOKEN</code>) — upgrade buttons below won&rsquo;t work until it is.
        </div>
      )}

      {/* Current plan */}
      <Card variant="primary" className="mt-6">
        <CardEyebrow>Current plan</CardEyebrow>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">{PLAN_LABELS[workspace.plan]}</h2>
            <p className="mt-1 text-sm text-slate">
              ${PLAN_PRICES_USD[workspace.plan]}/mo · billed monthly{subscription?.status && subscription.status !== "active" && <> · <Badge tone="warning">{subscription.status}</Badge></>}
            </p>
            <p className="mt-1 text-xs text-slate">
              {subscription?.renews_at ? `Renews ${new Date(subscription.renews_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : "No active renewal date on file"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {managementUrls.updatePaymentMethod ? (
              <a href={managementUrls.updatePaymentMethod} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-mist bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-elevated">
                <CreditCard size={14} aria-hidden="true" /> Manage Subscription <ExternalLink size={12} aria-hidden="true" className="text-slate" />
              </a>
            ) : workspace.plan !== "free" && (
              <span className="rounded-lg border border-mist px-3.5 py-2 text-xs text-slate">Subscription management unavailable — Paddle isn&rsquo;t fully configured.</span>
            )}
            {managementUrls.cancel && (
              <a href={managementUrls.cancel} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-danger-border px-3.5 py-2 text-sm font-medium text-danger-ink hover:bg-danger-soft">
                Cancel
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-4 border-t border-mist pt-5 sm:grid-cols-2">
          {overview.usageBars.map((bar) => <UsageBarRow key={bar.label} bar={bar} />)}
        </div>
      </Card>

      {/* Plan comparison / upgrade-downgrade */}
      <section className="mt-8">
        <CardEyebrow>All plans</CardEyebrow>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLAN_ORDER.map((plan, index) => {
            const planLimits = PLAN_LIMITS[plan];
            const isCurrent = plan === workspace.plan;
            const isDowngrade = index < currentPlanIndex;
            const priceId = PRICE_IDS[plan];

            return (
              <div key={plan} className={`rounded-xl border p-5 ${isCurrent ? "border-signal bg-signal/5" : "border-mist bg-surface"}`}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">{PLAN_LABELS[plan]}</h3>
                  <span className="font-mono text-sm text-slate">${PLAN_PRICES_USD[plan]}/mo</span>
                </div>
                <ul className="mb-4 flex flex-col gap-1 text-xs text-slate">
                  <li>{planLimits.monthlyCredits.toLocaleString()} credits/mo</li>
                  <li>{planLimits.maxBots === null ? "Unlimited" : planLimits.maxBots} agents</li>
                  <li>{planLimits.maxSeats === null ? "Unlimited" : planLimits.maxSeats} seats</li>
                  {planLimits.features.auditLogs && <li>Audit logs</li>}
                  {planLimits.features.publicApi !== "none" && <li>Public API ({planLimits.features.publicApi})</li>}
                  {planLimits.features.outboundWebhooks && <li>Outbound webhooks</li>}
                </ul>

                {isCurrent ? (
                  <div className="rounded-lg bg-mist px-4 py-2 text-center text-sm font-medium text-slate">Current plan</div>
                ) : isDowngrade ? (
                  managementUrls.updatePaymentMethod ? (
                    <a href={managementUrls.updatePaymentMethod} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-mist px-4 py-2 text-center text-sm text-ink hover:bg-elevated">Downgrade via Paddle</a>
                  ) : (
                    <div className="rounded-lg border border-mist px-4 py-2 text-center text-sm text-slate">Contact support to downgrade</div>
                  )
                ) : plan === "free" ? (
                  <div className="rounded-lg border border-mist px-4 py-2 text-center text-sm text-slate">Default plan</div>
                ) : priceId && clientToken ? (
                  <CheckoutButton priceId={priceId} planLabel={PLAN_LABELS[plan]} workspaceId={workspace.workspaceId} email={user.email} clientToken={clientToken} environment={process.env.NODE_ENV === "production" ? "production" : "sandbox"} />
                ) : (
                  <div className="rounded-lg border border-mist px-4 py-2 text-center text-xs text-slate">Not configured yet</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment history */}
      <section className="mt-8">
        <CardEyebrow>Payment history</CardEyebrow>
        <Card variant="primary" className="mt-3 !p-0">
          {overview.payments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Receipt size={20} className="text-slate" aria-hidden="true" />
              <p className="text-sm text-slate">No payments yet.</p>
            </div>
          ) : (
            <>
              {/* Below sm: stacked cards, not a horizontally-scrolled
                 table — spec section 83's "responsive tables" means an
                 actual different layout on mobile, not just overflow-x. */}
              <ul className="divide-y divide-mist sm:hidden">
                {overview.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-ink">{new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate">{p.amount != null ? `$${p.amount.toFixed(2)}` : "—"}</p>
                    </div>
                    <Badge tone={p.status === "completed" || p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "neutral"}>{p.status ?? "unknown"}</Badge>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full text-left text-sm sm:table">
                <thead className="border-b border-mist text-xs text-slate">
                  <tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium">Status</th></tr>
                </thead>
                <tbody>
                  {overview.payments.map((p) => (
                    <tr key={p.id} className="border-b border-mist last:border-0">
                      <td className="px-5 py-3 text-ink">{new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="px-5 py-3 font-mono text-ink">{p.amount != null ? `$${p.amount.toFixed(2)}` : "—"}</td>
                      <td className="px-5 py-3"><Badge tone={p.status === "completed" || p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "neutral"}>{p.status ?? "unknown"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}
