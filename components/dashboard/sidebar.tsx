"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Search, Mail } from "lucide-react";
import { LogoMark } from "@/components/branding/logo";
import { switchActiveWorkspace } from "@/lib/actions/workspace-switch";
import type { WorkspaceMembership } from "@/lib/data/workspace";
import { NAV_GROUPS, type NavItem } from "@/components/dashboard/nav-data";

function isItemActive(href: string, pathname: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function NavLink({ href, label, icon: Icon, badge }: { href: string; label: string; icon: NavItem["icon"]; badge?: number }) {
  const pathname = usePathname();
  const isActive = isItemActive(href, pathname);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-signal text-ink shadow-glow-sm"
          : "text-slate hover:bg-elevated hover:text-ink"
      }`}
    >
      <Icon size={17} strokeWidth={2} aria-hidden="true" />
      {label}
      {badge ? (
        <span className="ml-auto rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({
  workspaceName,
  workspaces,
  pendingInviteCount,
}: {
  workspaceName: string;
  workspaces: WorkspaceMembership[];
  pendingInviteCount: number;
}) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return NAV_GROUPS;
    const q = query.trim().toLowerCase();
    return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) })).filter(
      (g) => g.items.length > 0
    );
  }, [query]);

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-mist bg-surface md:flex">
      <div className="border-b border-mist px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink">
          <LogoMark size={20} />
          chat<span className="text-ink">bo</span>.ai
        </Link>

        {workspaces.length > 1 ? (
          <form action={(fd) => switchActiveWorkspace(fd.get("workspaceId") as string)}>
            <div className="relative mt-1.5">
              <select
                name="workspaceId"
                defaultValue={workspaces.find((w) => w.workspaceName === workspaceName)?.workspaceId}
                onChange={(e) => e.target.form?.requestSubmit()}
                className="w-full appearance-none truncate rounded-md border border-mist bg-elevated py-1 pl-1.5 pr-6 text-xs text-slate outline-none"
              >
                {workspaces.map((w) => (
                  <option key={w.workspaceId} value={w.workspaceId}>
                    {w.workspaceName}
                  </option>
                ))}
              </select>
              <ChevronsUpDown
                size={12}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate"
              />
            </div>
          </form>
        ) : (
          <p className="mt-0.5 truncate text-xs text-slate">{workspaceName}</p>
        )}

        <label className="relative mt-3 block">
          <Search size={13} strokeWidth={2} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to…"
            aria-label="Filter navigation"
            className="w-full rounded-md border border-mist bg-elevated py-1.5 pl-8 pr-2 text-xs text-ink placeholder:text-slate/70 outline-none focus:border-signal"
          />
        </label>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
              {group.label === "Organization" && pendingInviteCount > 0 && (
                <NavLink href="/dashboard/invites" label="Invites" icon={Mail} badge={pendingInviteCount} />
              )}
            </div>
          </div>
        ))}
        {query.trim() && filteredGroups.length === 0 && (
          <p className="px-3 text-xs text-slate">No matches for &ldquo;{query}&rdquo;.</p>
        )}
      </nav>
    </aside>
  );
}
