"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_GROUPS } from "./nav-data";

/**
 * "More" bottom sheet — spec section 83's "collapsible sidebar" and
 * "bottom sheets" patterns in one: the full nav (all of the desktop
 * Sidebar's groups, reusing the same NAV_GROUPS data) reachable from a
 * sheet that slides up from the bottom rather than a full-screen page or
 * a desktop-style dropdown, which is the wrong gesture on a touch
 * screen.
 */
export function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    // Any navigation while the sheet is open should close it — otherwise
    // it's still sitting open over the newly-loaded page underneath.
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Navigation menu" className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-paper/70 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-modal-in absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-mist bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-mist bg-surface px-4 py-3">
          <span className="mx-auto h-1 w-10 rounded-full bg-mist" aria-hidden="true" />
          <button type="button" onClick={onClose} aria-label="Close menu" className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate hover:bg-elevated hover:text-ink">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-3 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4 last:mb-1">
              <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? "bg-signal text-ink" : "text-ink hover:bg-elevated"}`}
                  >
                    <Icon size={17} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
