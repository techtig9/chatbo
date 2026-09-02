import {
  CheckCircle2, Link2, ShieldCheck, Store, RefreshCw, type LucideIcon,
  MessagesSquare, ShoppingBag, CreditCard, Magnet, Cloud, LifeBuoy, Mail, AppWindow, NotebookText, MessageCircle,
} from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getIntegrationConnections, CATEGORY_LABELS } from "@/lib/data/integrations";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionMenu } from "@/components/integrations/connection-menu";

// Lucide has no brand logos, so each provider gets a distinct generic
// icon rather than every card in a category sharing one — spec section
// 79 asks for an icon per card, not per category.
const PROVIDER_ICONS: Record<string, LucideIcon> = {
  slack: MessagesSquare,
  shopify: ShoppingBag,
  stripe: CreditCard,
  hubspot: Magnet,
  salesforce: Cloud,
  zendesk: LifeBuoy,
  google_workspace: Mail,
  microsoft_365: AppWindow,
  notion: NotebookText,
  discord: MessageCircle,
};

const featureCards: [string, string, LucideIcon][] = [
  ["Agent-level access", "Grant each agent only the connected accounts and scopes it needs.", ShieldCheck],
  ["Connection health", "Track status, expiry and the last successful use of every connection.", RefreshCw],
  ["Marketplace-ready", "The catalog and OAuth abstraction are ready for additional first-party and custom providers.", Store],
];

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function IntegrationsPage({ searchParams }: { searchParams?: { connected?: string; error?: string } }) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return null;
  const connections = await getIntegrationConnections(workspace.workspaceId);
  const categories = Array.from(new Set(INTEGRATION_CATALOG.map((p) => p.category)));

  return <main className="mx-auto max-w-6xl px-6 py-8">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Integration marketplace</p>
    <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Connect the software your business already uses</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Securely connect SaaS accounts once, then grant individual agents only the integrations they need. OAuth credentials are encrypted at rest and never exposed to the browser.</p>
    {searchParams?.connected && <div className="mt-5 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success"><CheckCircle2 size={17} />Integration connected successfully.</div>}
    {searchParams?.error && <div className="mt-5 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">Connection error: {searchParams.error}</div>}

    <div className="mt-7 space-y-8">
      {categories.map((category) => (
        <section key={category}>
          <CardEyebrow>{CATEGORY_LABELS[category]}</CardEyebrow>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATION_CATALOG.filter((p) => p.category === category).map((provider) => {
              const Icon = PROVIDER_ICONS[provider.key] ?? Link2;
              const c = connections.get(provider.key);
              const isConnected = c?.status === "connected";
              return (
                <Card key={provider.key} variant="primary">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-soft text-ink">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{provider.name}</p>
                        {c && (
                          <Badge tone={c.status === "connected" ? "success" : c.status === "error" ? "danger" : c.status === "pending" ? "warning" : "neutral"}>
                            {c.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isConnected && <ConnectionMenu provider={provider.key} providerName={provider.name} />}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate">{provider.description}</p>

                  {isConnected ? (
                    <div className="mt-3 space-y-1 border-t border-mist pt-3 text-[11px] text-slate">
                      <div className="flex justify-between"><span>Last synced</span><span className="text-ink">{timeAgo(c.lastUsedAt)}</span></div>
                      <div className="flex justify-between"><span>Permissions</span><span className="text-ink">{c.grantedAgentCount} agent{c.grantedAgentCount === 1 ? "" : "s"}</span></div>
                    </div>
                  ) : c?.status === "error" ? (
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-mist pt-3">
                      <span className="truncate text-[11px] text-danger" title={c.lastError ?? undefined}>{c.lastError ?? "Connection error"}</span>
                      <a href={`/api/integrations/connect?provider=${encodeURIComponent(provider.key)}`} className="shrink-0 rounded-lg border border-mist bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink">Retry</a>
                    </div>
                  ) : (
                    <a href={`/api/integrations/connect?provider=${encodeURIComponent(provider.key)}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"><Link2 size={13} aria-hidden="true" />Connect</a>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>

    <section className="mt-9 grid gap-4 md:grid-cols-3">
      {featureCards.map(([title, text, Icon]) => <div key={title} className="rounded-2xl border border-mist bg-surface p-5"><Icon size={18} className="text-ink" aria-hidden="true" /><h3 className="mt-3 font-semibold text-ink">{title}</h3><p className="mt-1 text-xs leading-5 text-slate">{text}</p></div>)}
    </section>
    <p className="mt-6 text-xs text-slate">Provider OAuth credentials must be configured in the server environment before a connection can be completed. Never place provider secrets in client-side code.</p>
  </main>;
}
