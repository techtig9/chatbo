import {
  LayoutDashboard,
  Bot,
  BookOpen,
  MessagesSquare,
  Plug,
  Settings,
  CreditCard,
  Cpu,
  FlaskConical,
  Activity,
  TrendingUp,
  Radio,
  GitBranch,
  ShieldCheck,
  Network,
  Users,
  Store,
  Rocket,
  Gift,
  Key,
  Webhook,
  BarChart3,
  FileText,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown under the page title in the header (spec section 66's
   * "optional description"). Kept short — one line. */
  description?: string;
  /** A primary action rendered in the header for this page, if any.
   * Only set for top-level, ID-less pages — detail pages (a specific
   * bot's knowledge tab, etc.) need dynamic context the header doesn't
   * have, so they render their own in-page actions instead. */
  cta?: { label: string; href: string };
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Grouped per the Figma-redesign brief's suggested sidebar structure
 * (Workspace / Build / Observe / Manage), replacing the prior
 * Main/Developer/Organization grouping — every item that existed before
 * still exists here, just reorganized, per that same brief's explicit
 * "keep the functionality, but redesign presentation." A few real,
 * working pages don't have a named slot in the brief's own list:
 * Approvals is daily-use, so it joins Workspace; Launch Center and
 * Referrals are occasional/ops-y, so they join Manage. "Developers" is
 * named as a single item in the brief but is actually 4 distinct real
 * pages (API Keys, Webhooks, API Usage, Developer Docs) — kept as 4
 * separate entries under Manage rather than collapsed into a nested
 * flyout, so none of them lose their own direct link. Security Center
 * and the knowledge-base bot-picker stay reachable (cross-linked from
 * Security and Knowledge respectively) without their own top-level
 * slot, and Profile lives in the account menu in the header.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, cta: { label: "Create agent", href: "/dashboard/bots/new" } },
      { href: "/dashboard/bots", label: "Agents", icon: Bot, description: "Every agent in this workspace.", cta: { label: "Create agent", href: "/dashboard/bots/new" } },
      { href: "/dashboard/conversations", label: "Conversations", icon: MessagesSquare, description: "What your agents have been saying." },
      { href: "/dashboard/knowledge", label: "Knowledge", icon: BookOpen, description: "Sources your agents are grounded on." },
      { href: "/dashboard/workflows", label: "Workflows", icon: GitBranch, description: "Automations built on your agents.", cta: { label: "New workflow", href: "/dashboard/workflows/new" } },
      { href: "/dashboard/channels", label: "Channels", icon: Radio, description: "Where your agents are deployed." },
      { href: "/dashboard/approvals", label: "Approvals", icon: ShieldCheck, description: "Actions waiting on human sign-off." },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/dashboard/ai-gateway", label: "AI Gateway", icon: Cpu, description: "Model routing, usage, and cost." },
      { href: "/dashboard/multi-agent", label: "Multi-Agent", icon: Network, description: "Agents that delegate to each other." },
      { href: "/dashboard/evaluations", label: "Evaluations", icon: FlaskConical, description: "Test suites and quality scores." },
      { href: "/dashboard/integrations", label: "Integrations", icon: Plug, description: "Connected third-party accounts." },
      { href: "/dashboard/marketplace", label: "Marketplace", icon: Store, description: "Ready-made agent templates." },
    ],
  },
  {
    label: "Observe",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp, description: "Usage, cost, and quality over time." },
      { href: "/dashboard/observability", label: "Observability", icon: Activity, description: "Trace every agent run." },
      { href: "/dashboard/settings/activity", label: "Activity", icon: ScrollText, description: "Audit log of workspace changes." },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/dashboard/organization", label: "Team", icon: Users, description: "Members and their roles." },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard, description: "Plan, credits, and payment method." },
      { href: "/dashboard/organization/security", label: "Security", icon: ShieldCheck, description: "SSO, domains, and access control." },
      { href: "/dashboard/settings/api-keys", label: "API Keys", icon: Key, description: "Credentials for the public API." },
      { href: "/dashboard/settings/webhooks", label: "Webhooks", icon: Webhook, description: "Outbound event notifications." },
      { href: "/dashboard/developers/usage", label: "API Usage", icon: BarChart3, description: "Requests, latency, and cost." },
      { href: "/developers", label: "Developer Docs", icon: FileText },
      { href: "/dashboard/launch", label: "Launch Center", icon: Rocket },
      { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Flattened, longest-href-first so a lookup by pathname matches the most
 * specific nav item (e.g. /dashboard/settings/api-keys before
 * /dashboard/settings) rather than whichever happens to appear first. */
export const NAV_ITEMS_BY_SPECIFICITY: NavItem[] = NAV_GROUPS.flatMap((g) => g.items).sort(
  (a, b) => b.href.length - a.href.length
);

export function findNavItemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS_BY_SPECIFICITY.find((item) =>
    item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
  );
}
