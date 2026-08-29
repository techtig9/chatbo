"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

/**
 * Bridges the app's existing ?success=/?error= redirect pattern — used
 * by dozens of server actions since Phase 1 (Knowledge indexed,
 * Integration connected, Workflow deployed, Invitation sent, and many
 * more) — into a real toast, without touching any of those actions or
 * their FormMessage inline banners. Mounted once at the dashboard
 * layout: every existing redirect(...&success=...) flow gets a toast
 * for free. Strips the param from the URL afterward so a refresh or
 * back-navigation doesn't re-fire it.
 */
export function SearchParamToastBridge() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const key = `${pathname}?${searchParams.toString()}`;
    if ((!success && !error) || handled.current === key) return;
    handled.current = key;

    if (success) showToast("success", success);
    else if (error) showToast("error", error);

    // The inline FormMessage banner reads these same params, so
    // stripping them immediately would make it flash for a single paint
    // frame rather than actually being readable — both spec section 89's
    // toast AND inline status should be genuinely visible together for a
    // moment, not one accidentally erasing the other.
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("success");
      next.delete("error");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname]);

  return null;
}
