"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { NAV_GROUPS } from "@/components/dashboard/nav-data";

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));

/**
 * Chatbo design system — command palette (spec section 66's "command
 * shortcut"). Cmd/Ctrl+K opens it from anywhere in the dashboard; typing
 * filters the same nav list the sidebar search already filters, so
 * there's one navigation dataset behind both, not two.
 *
 * Modal treatment per spec section 86: dark surface, rounded corners,
 * subtle border, backdrop blur, escape-to-close, focus trap (the input
 * autofocuses on open and Escape is the only way out other than a
 * selection or a backdrop click).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus trap: the input grabs focus the instant the palette opens,
      // and there's nothing else tab-reachable in the overlay to escape
      // to except the results themselves.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-paper/70 backdrop-blur-sm pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-mist bg-elevated shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="flex items-center gap-3 border-b border-mist px-4 py-3">
          <Search size={16} className="shrink-0 text-slate" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter" && results[activeIndex]) { go(results[activeIndex].href); }
            }}
            placeholder="Jump to a page…"
            aria-label="Search pages"
            className="w-full bg-transparent text-sm text-ink placeholder:text-slate/70 outline-none"
          />
          <kbd className="shrink-0 rounded border border-mist px-1.5 py-0.5 text-[10px] text-slate">Esc</kbd>
        </label>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate">No matches for &ldquo;{query}&rdquo;.</p>}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  i === activeIndex ? "bg-signal text-ink" : "text-ink hover:bg-surface"
                }`}
              >
                <Icon size={16} aria-hidden="true" className={i === activeIndex ? "text-ink" : "text-slate"} />
                {item.label}
                <span className={`ml-auto text-xs ${i === activeIndex ? "text-ink/70" : "text-slate"}`}>{item.group}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Small "⌘K" hint chip — renders next to the (now-functional) header
 * search box so the shortcut is discoverable, not just documented. */
export function CommandShortcutHint() {
  return (
    <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-mist px-1.5 py-0.5 font-mono text-[10px] text-slate sm:flex">
      <span aria-hidden="true">⌘</span>K
    </kbd>
  );
}
