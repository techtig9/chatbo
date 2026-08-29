import Link from "next/link";
import { Check, ArrowRight, Mail } from "lucide-react";
import { PLAN_LIMITS, PLAN_PRICES_USD } from "@/lib/billing/plans";
import type { Plan } from "@/lib/supabase/types";

// Spec section 81 names exactly 4 cards (Starter/Professional/Business/
// Enterprise) — the app's actual plan model is free/starter/pro/business
// (matches Paddle price IDs; can't rename the underlying data model just
// for display). "pro" is labeled "Professional" here to match the spec's
// wording without touching the real Plan type anywhere else. Free isn't
// dropped, just moved to a lighter mention near the top — it's the
// signup default, not a plan someone chooses.
const paidPlans: Plan[] = ["starter", "pro", "business"];
const labels: Record<Plan, string> = { free: "Free", starter: "Starter", pro: "Professional", business: "Business" };
const highlights: Record<Plan, string> = {
  free: "Build and test your first agent.",
  starter: "For individuals putting AI to work.",
  pro: "For growing teams and real workflows.",
  business: "For organizations that need control and scale.",
};

export default function PricingPage() {
  return <main className="min-h-screen bg-paper px-5 py-16 text-ink sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="text-sm font-medium text-ink hover:underline">← Back to chatbo.ai</Link>
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Simple, scalable pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Start small. Grow into an AI operating system.</h1>
        <p className="mt-4 text-base leading-7 text-slate">Every plan includes the core agent builder. Upgrade when you need more agents, knowledge, collaboration, integrations, and control.</p>
        <p className="mt-3 text-sm text-slate">New here? <Link href="/signup" className="font-medium text-ink hover:underline">Start free</Link> — no credit card required, {PLAN_LIMITS.free.monthlyCredits.toLocaleString()} credits/mo, upgrade anytime.</p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-4">
        {paidPlans.map((plan) => {
          const l = PLAN_LIMITS[plan];
          const isHighlighted = plan === "pro";
          return (
            <section key={plan} className={`rounded-2xl border p-6 ${isHighlighted ? "border-signal bg-signal/5 shadow-glow-sm" : "border-mist bg-surface"}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{labels[plan]}</h2>
                {isHighlighted && <span className="rounded-full bg-signal px-2.5 py-1 text-[10px] font-bold text-ink">POPULAR</span>}
              </div>
              <p className="mt-2 min-h-10 text-sm text-slate">{highlights[plan]}</p>
              <p className="mt-5 font-display text-3xl font-semibold">${PLAN_PRICES_USD[plan]}<span className="text-sm font-normal text-slate">/month</span></p>
              <p className="mt-1 text-xs text-slate">Billed monthly · cancel anytime</p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate">
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />{l.monthlyCredits.toLocaleString()} monthly credits</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />{l.maxBots === null ? "Unlimited" : l.maxBots} AI agents</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />{l.maxSeats === null ? "Unlimited" : l.maxSeats} team seats</li>
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />{l.maxKnowledgeDocsPerBot === null ? "Unlimited" : l.maxKnowledgeDocsPerBot} knowledge docs / agent</li>
                {l.features.channelIntegrations && <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Channel integrations</li>}
                {l.features.publicApi !== "none" && <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Public API ({l.features.publicApi})</li>}
                {l.features.auditLogs && <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Audit logs</li>}
              </ul>
              <Link href={"/signup?plan=" + plan} className="mt-7 flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/90">
                Start with {labels[plan]} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </section>
          );
        })}

        {/* Enterprise — not a purchasable Paddle tier, so no fixed price
           or specific feature claims that aren't actually built (e.g. no
           SSO exists in the app today, so it isn't listed as included). */}
        <section className="rounded-2xl border border-mist bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Enterprise</h2>
          <p className="mt-2 min-h-10 text-sm text-slate">For organizations with custom requirements.</p>
          <p className="mt-5 font-display text-3xl font-semibold">Custom</p>
          <p className="mt-1 text-xs text-slate">Volume-based, negotiated with our team</p>
          <ul className="mt-6 space-y-2.5 text-sm text-slate">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Everything in Business</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Volume credit pricing</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Dedicated support</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-ink" />Custom contract &amp; procurement</li>
          </ul>
          <a href="mailto:sales@chatbo.ai" className="mt-7 flex items-center justify-center gap-2 rounded-lg border border-mist px-4 py-2.5 text-sm font-medium text-ink hover:bg-elevated">
            Contact sales <Mail size={15} aria-hidden="true" />
          </a>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-slate">AI provider usage, external services, and taxes may be subject to separate limits or charges. Final billing is handled by your configured payment provider.</p>
    </div>
  </main>;
}
