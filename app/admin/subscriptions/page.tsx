import { listAllSubscriptions } from "@/lib/data/admin";
import { overrideSubscription } from "@/lib/actions/admin";
import { FormMessage } from "@/components/form-message";

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const subscriptions = await listAllSubscriptions();

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">Subscriptions</h1>
      <p className="mb-4 text-sm text-slate">{subscriptions.length} total</p>

      <div className="mb-4">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      <div className="flex flex-col gap-3">
        {subscriptions.map((s) => (
          <form
            key={s.id}
            action={overrideSubscription.bind(null, s.id)}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-mist bg-surface p-4"
          >
            <div className="min-w-[180px] flex-1">
              <p className="text-sm font-medium text-ink">{s.workspaceName}</p>
              <p className="text-xs text-slate">{s.ownerEmail}</p>
            </div>
            <select
              name="plan"
              defaultValue={s.plan}
              className="bg-surface text-ink rounded-lg border border-mist px-2 py-1.5 text-sm"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
            <input
              type="number"
              name="creditsRemaining"
              defaultValue={s.creditsRemaining}
              min={0}
              className="bg-surface text-ink w-28 rounded-lg border border-mist px-2 py-1.5 text-sm font-mono"
            />
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                s.status === "active" ? "bg-success-soft text-success-ink" : "bg-neutral-soft text-slate"
              }`}
            >
              {s.status}
            </span>
            <button
              type="submit"
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-ink/90"
            >
              Save
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
