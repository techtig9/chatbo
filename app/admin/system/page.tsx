import { runConciergeSeed } from "@/lib/actions/concierge";
import { FormMessage } from "@/components/form-message";

export default function AdminSystemPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">System</h1>
      <p className="mb-6 text-sm text-slate">
        One-time and maintenance actions — not customer-facing.
      </p>

      <div className="mb-6">
        <FormMessage error={searchParams.error} success={searchParams.success} />
      </div>

      <section className="rounded-2xl border border-mist bg-surface p-4">
        <h2 className="mb-1 text-sm font-medium text-ink">Concierge bot</h2>
        <p className="mb-3 text-xs text-slate">
          Creates chatbo.ai&rsquo;s own product-help bot (workspace &ldquo;chatbo.ai
          (internal)&rdquo;, bot &ldquo;Ask chatbo&rdquo;) if it doesn&rsquo;t exist yet, and
          re-ingests <code>/help</code> either way — safe to run again after editing the help
          center content to pick up changes immediately instead of waiting for the daily
          scheduled refresh.
        </p>
        <p className="mb-3 text-xs text-slate">
          After the first run, copy the returned bot id into{" "}
          <code>CONCIERGE_BOT_ID</code> so the scheduled Inngest refresh
          (<code>lib/inngest/functions.ts</code>) knows which bot to maintain.
        </p>
        <form action={runConciergeSeed}>
          <button
            type="submit"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Create / refresh concierge bot
          </button>
        </form>
      </section>
    </div>
  );
}
