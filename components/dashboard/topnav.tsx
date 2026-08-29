"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, ChevronDown, HelpCircle, ChevronRight } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/data/notifications";
import { findNavItemForPath } from "@/components/dashboard/nav-data";
import { CommandShortcutHint } from "@/components/dashboard/command-palette";

export function TopNav({
  userName,
  userEmail,
  plan,
  creditsRemaining,
  isPlatformAdmin,
  notifications,
  unreadCount,
}: {
  userName: string | null;
  userEmail: string;
  plan: string;
  creditsRemaining: number;
  isPlatformAdmin: boolean;
  notifications: NotificationRow[];
  unreadCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = (userName ?? userEmail).charAt(0).toUpperCase();
  const navItem = findNavItemForPath(pathname);
  const isHome = pathname === "/dashboard";
  const firstName = userName?.split(" ")[0];
  const title = navItem?.label ?? "Chatbo";
  const description = isHome && firstName ? `Welcome back, ${firstName} 👋` : navItem?.description;

  function openCommandPalette() {
    // The command palette owns its own open state and listens globally
    // for Cmd/Ctrl+K — dispatching the same keydown it already listens
    // for keeps "click search" and "press ⌘K" going through one code
    // path instead of two.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-mist bg-surface px-6 py-2.5">
      <div className="min-w-0">
        {navItem && navItem.href !== "/dashboard" && (
          <div className="mb-0.5 flex items-center gap-1 text-xs text-slate">
            <Link href="/dashboard" className="hover:text-ink">Home</Link>
            <ChevronRight size={12} aria-hidden="true" />
            <span className="text-ink">{title}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-base font-semibold text-ink">{title}</h1>
        </div>
        {description && <p className="truncate text-xs text-slate">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Search — press Command K"
          className="hidden w-56 items-center gap-2 rounded-lg border border-mist bg-elevated px-3 py-1.5 text-left text-sm text-slate/70 transition hover:border-signal/40 sm:flex"
        >
          <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          <span className="flex-1 truncate">Search bots, conversations…</span>
          <CommandShortcutHint />
        </button>
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Search"
          className="rounded-lg p-2 text-slate hover:bg-elevated hover:text-ink sm:hidden"
        >
          <Search size={18} strokeWidth={2} />
        </button>

        <span className="hidden rounded-full border border-mist px-2.5 py-1 font-mono text-xs text-slate lg:inline">
          {creditsRemaining.toLocaleString()} credits
        </span>

        <Link
          href="/help"
          aria-label="Help"
          className="rounded-lg p-2 text-slate hover:bg-elevated hover:text-ink"
        >
          <HelpCircle size={18} strokeWidth={2} />
        </Link>

        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifOpen((open) => !open)}
            aria-expanded={notifOpen}
            className="relative rounded-lg p-2 text-slate hover:bg-elevated hover:text-ink"
          >
            <Bell size={18} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-2 w-80 rounded-lg border border-mist bg-surface py-1 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-mist px-3 py-2">
                <p className="text-sm font-medium text-ink">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => startTransition(() => markAllNotificationsRead())}
                    className="text-xs text-ink hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate">No notifications yet.</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`border-b border-mist px-3 py-2.5 last:border-0 ${
                        n.readAt ? "" : "bg-signal/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.readAt) startTransition(() => markNotificationRead(n.id));
                        }}
                        className="w-full text-left"
                      >
                        <p className="text-sm text-ink">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-slate">{n.body}</p>}
                        <p className="mt-0.5 text-xs text-slate">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {navItem?.cta && (
          <Link
            href={navItem.cta.href}
            className="hidden items-center rounded-lg bg-accent-gradient px-3.5 py-1.5 text-sm font-semibold text-ink shadow-glow-sm transition hover:shadow-glow hover:brightness-105 md:inline-flex"
          >
            {navItem.cta.label}
          </Link>
        )}

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-elevated"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-xs font-medium text-paper">
              {initial}
            </span>
            <ChevronDown size={14} strokeWidth={2} className="text-slate" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-mist bg-surface py-1 shadow-lg"
            >
              <div className="border-b border-mist px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">
                  {userName ?? userEmail}
                </p>
                <p className="truncate text-xs text-slate">{userEmail}</p>
                <p className="mt-1 text-xs capitalize text-ink">{plan} plan</p>
              </div>
              {isPlatformAdmin && (
                <Link
                  href="/admin"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-elevated"
                >
                  Admin panel
                </Link>
              )}
              <Link
                href="/dashboard/profile"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-elevated"
              >
                Profile
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-elevated"
                >
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
