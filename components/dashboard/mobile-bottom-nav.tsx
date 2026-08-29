"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, MessagesSquare, Plus, Menu } from "lucide-react";
import { MobileNavDrawer } from "./mobile-nav-drawer";

/**
 * Bottom navigation (spec section 83's exact 5-item list: Home / Agents
 * / Chats / Create / More) — mobile only. The desktop Sidebar is hidden
 * below the md breakpoint; this plus MobileNavDrawer's "More" sheet
 * together replace it, rather than mobile just being a squeezed copy of
 * the desktop shell.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isHome = pathname === "/dashboard";
  const isAgents = pathname.startsWith("/dashboard/bots") && pathname !== "/dashboard/bots/new";
  const isChats = pathname.startsWith("/dashboard/conversations");

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-mist bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Link href="/dashboard" className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${isHome ? "text-ink" : "text-slate"}`}>
          <LayoutDashboard size={20} aria-hidden="true" />
          Home
        </Link>
        <Link href="/dashboard/bots" className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${isAgents ? "text-ink" : "text-slate"}`}>
          <Bot size={20} aria-hidden="true" />
          Agents
        </Link>

        {/* Prominent, centered, raised — spec: "The primary Create button
           can be a prominent centered action." */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <Link
            href="/dashboard/bots/new"
            aria-label="Create agent"
            className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-accent-gradient text-ink shadow-glow"
          >
            <Plus size={22} aria-hidden="true" />
          </Link>
        </div>

        <Link href="/dashboard/conversations" className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${isChats ? "text-ink" : "text-slate"}`}>
          <MessagesSquare size={20} aria-hidden="true" />
          Chats
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="More"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-slate"
        >
          <Menu size={20} aria-hidden="true" />
          More
        </button>
      </nav>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
