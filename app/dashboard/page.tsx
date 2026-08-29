import Link from "next/link";
import { MessagesSquare, TrendingUp, Bot, DollarSign, ThumbsUp, ThumbsDown, BookOpen, Rocket, GitBranch, Plug, FlaskConical, ShieldCheck, Sparkles, Store, ArrowRight } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getWorkspaceAnalytics } from "@/lib/analytics/queries";
import { getDashboardMetrics, getConversationSeries, getTopAgents, getRecentConversations, getActivityFeed, type ActivityItem } from "@/lib/analytics/dashboard";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ConversationsChart } from "@/components/dashboard/conversations-chart";

const ACTIVITY_ICONS: Record<ActivityItem["category"], typeof BookOpen> = {
  knowledge: BookOpen,
  agent: Rocket,
  workflow: GitBranch,
  integration: Plug,
  evaluation: FlaskConical,
  security: ShieldCheck,
  other: Sparkles,
};

const QUICK_ACTIONS = [
  { label: "New Agent", icon: Bot, href: "/dashboard/bots/new" },
  { label: "Add Knowledge", icon: BookOpen, href: "/dashboard/knowledge" },
  { label: "Connect Integration", icon: Plug, href: "/dashboard/integrations" },
  { label: "Build Workflow", icon: GitBranch, href: "/dashboard/workflows" },
  { label: "Run Evaluation", icon: FlaskConical, href: "/dashboard/evaluations" },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, workspace } = await getCurrentUserAndWorkspace();

  if (!workspace) return null; // dashboard layout already handles this case

  const [analytics, metrics, series, topAgents, recentConversations, activity] = await Promise.all([
    getWorkspaceAnalytics(workspace.workspaceId),
    getDashboardMetrics(workspace.workspaceId),
    getConversationSeries(workspace.workspaceId, 30),
    getTopAgents(workspace.workspaceId),
    getRecentConversations(workspace.workspaceId),
    getActivityFeed(workspace.workspaceId),
  ]);

  if (analytics.totalBots === 0) {
    return (
      <main className="px-6 py-8">
        <EmptyState
          icon={Bot}
          title="Build your first AI agent"
          description="Describe what it should do — Chatbo generates the instructions, knowledge setup, and tools for you."
          action={<Button variant="primary" size="md">
            <Link href="/dashboard/bots/new">Create your first agent</Link>
          </Button>}
        />
      </main>
    );
  }

  const monthlyCredits = PLAN_LIMITS[workspace.plan].monthlyCredits;
  const creditsUsed = Math.max(0, monthlyCredits - workspace.creditsRemaining);
  const usagePct = monthlyCredits > 0 ? Math.min(100, Math.round((creditsUsed / monthlyCredits) * 100)) : 0;
  const firstName = user?.name?.split(" ")[0];

  return (
    <main className="space-y-6 px-6 py-6">
      {/* Command-center header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {greeting()}{firstName ? `, ${firstName}` : ""}. What will you automate today?
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/dashboard/bots/new" className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink shadow-glow-sm hover:brightness-105">
            <Bot size={15} aria-hidden="true" /> Create Agent
          </Link>
          <Link href="/dashboard/marketplace" className="inline-flex items-center gap-1.5 rounded-lg border border-mist bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-signal">
            <Store size={15} aria-hidden="true" /> Explore Marketplace
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={MessagesSquare} label="Total Conversations" value={metrics.totalConversations.toLocaleString()} trendPct={metrics.conversationsTrendPct} />
        <MetricCard
          icon={TrendingUp}
          label="Success Rate"
          value={metrics.successRatePct !== null ? `${metrics.successRatePct}%` : "—"}
          comparisonPeriod={metrics.successRatePct !== null ? "of rated responses" : "No ratings yet"}
        />
        <MetricCard icon={Bot} label="Total Agents" value={metrics.totalAgents.toString()} comparisonPeriod={`${metrics.totalAgentsPublished} published`} />
        <MetricCard icon={DollarSign} label="AI Cost" value={`$${metrics.aiCostUsd.toFixed(2)}`} trendPct={metrics.aiCostTrendPct} />
      </div>

      {/* Your agents — richer cards than the ranked list further down */}
      <Card variant="primary">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardEyebrow>Your agents</CardEyebrow>
            <h2 className="font-display text-base font-semibold text-ink">Recently active</h2>
          </div>
          <Link href="/dashboard/bots" className="text-xs font-semibold text-ink hover:text-ink">View all</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topAgents.slice(0, 3).map((agent) => (
            <Link key={agent.id} href={`/dashboard/bots/${agent.id}/edit`} className="rounded-xl border border-mist bg-surface p-4 transition hover:border-signal/50">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated font-mono text-xs font-medium text-ink">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
                <Badge tone={agent.status === "published" ? "success" : "neutral"}>{agent.status}</Badge>
              </div>
              <p className="mt-3 truncate text-sm font-medium text-ink">{agent.name}</p>
              <p className="text-xs text-slate">{agent.conversationCount.toLocaleString()} conversations · created {timeAgo(agent.createdAt)}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="primary" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardEyebrow>Volume</CardEyebrow>
              <h2 className="font-display text-base font-semibold text-ink">Conversations</h2>
            </div>
            <span className="text-xs text-slate">Last 30 days</span>
          </div>
          <ConversationsChart data={series} />
        </Card>

        <Card variant="primary">
          <CardEyebrow>Plan &amp; credits</CardEyebrow>
          <h2 className="mb-4 font-display text-base font-semibold text-ink">Usage</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize text-ink">{workspace.plan} plan</span>
            <Link href="/dashboard/billing" className="text-xs font-semibold text-ink hover:text-ink">Manage</Link>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
            <div className={`h-full rounded-full ${usagePct >= 90 ? "bg-danger" : "bg-signal"}`} style={{ width: `${usagePct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate">{creditsUsed.toLocaleString()} / {monthlyCredits.toLocaleString()} credits used this period</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="primary" className="lg:col-span-2">
          <CardEyebrow>Latest activity</CardEyebrow>
          <h2 className="mb-4 font-display text-base font-semibold text-ink">Recent Conversations</h2>
          {recentConversations.length === 0 ? (
            <p className="text-sm text-slate">No conversations yet.</p>
          ) : (
            <ul className="divide-y divide-mist">
              {recentConversations.map((conv) => (
                <li key={conv.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{conv.topic}</p>
                    <p className="text-xs text-slate">{conv.botName} · {timeAgo(conv.timestamp)}</p>
                  </div>
                  {conv.sentiment && (
                    conv.sentiment === "up"
                      ? <ThumbsUp size={14} className="shrink-0 text-success" aria-label="Positive feedback" />
                      : <ThumbsDown size={14} className="shrink-0 text-danger" aria-label="Negative feedback" />
                  )}
                  <Badge tone={conv.status === "active" ? "info" : "neutral"}>{conv.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="primary">
          <CardEyebrow>Workspace timeline</CardEyebrow>
          <h2 className="mb-4 font-display text-base font-semibold text-ink">Activity Feed</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-slate">Nothing to show yet — activity will appear here as your workspace grows.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.category];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-elevated text-slate">
                      <Icon size={12} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{item.label}</p>
                      <p className="text-xs text-slate">{timeAgo(item.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card variant="primary">
        <CardEyebrow>Quick actions</CardEyebrow>
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Jump straight in</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href} className="group flex flex-col items-start gap-2 rounded-xl border border-mist bg-surface p-4 transition hover:border-signal/50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/15 text-ink">
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-xs text-slate group-hover:text-ink">Open <ArrowRight size={11} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
