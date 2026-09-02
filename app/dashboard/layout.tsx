import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace, listWorkspacesForUser } from "@/lib/data/workspace";
import { listPendingInvitesForUser } from "@/lib/data/members";
import { listRecentNotifications } from "@/lib/data/notifications";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/topnav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { ConciergeLauncher } from "@/components/concierge/launcher";
import { ToastProvider } from "@/components/ui/toast";
import { SearchParamToastBridge } from "@/components/dashboard/search-param-toast-bridge";

// Every page under /dashboard depends on the session cookie — never
// statically prerender this layout or its children.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await getCurrentUserAndWorkspace();

  // Belt-and-suspenders: middleware already redirects unauthenticated
  // requests before they get here, but this layout has to be safe to
  // reason about on its own too, not just in combination with it.
  if (!user) {
    redirect("/login");
  }

  if (!workspace) {
    // Should be unreachable in production — the Phase 1.1 signup trigger
    // always creates a workspace — but a user record with no workspace
    // is a real state a support engineer could hit (a failed trigger,
    // manual DB edit, etc.), so fail with a clear message, not a crash.
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-2 font-display text-lg font-semibold text-ink">
          No workspace found
        </h1>
        <p className="text-sm text-slate">
          Your account isn&rsquo;t linked to a workspace. Contact support —
          this shouldn&rsquo;t happen for a normal signup.
        </p>
      </main>
    );
  }

  const [workspaces, pendingInvites, { notifications, unreadCount }] = await Promise.all([
    listWorkspacesForUser(user.id),
    listPendingInvitesForUser(user.id),
    listRecentNotifications(user.id),
  ]);

  // If we've reached this point, middleware has already forced anyone
  // with an enrolled factor through /mfa/verify to reach aal2 — so a
  // currentLevel below aal2 here specifically means "no factor enrolled
  // at all," not "mid-challenge." That's what distinguishes a member
  // who needs the org's MFA requirement nudge from one who's already
  // fully authenticated.
  let needsMfaEnrollment = false;
  if (workspace.requireMfa) {
    const supabase = createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfaEnrollment = aal?.currentLevel !== "aal2";
  }

  return (
    <div className="flex h-screen">
      <ToastProvider>
      <Suspense fallback={null}>
        <SearchParamToastBridge />
      </Suspense>
      <Sidebar
        workspaceName={workspace.workspaceName}
        workspaces={workspaces}
        pendingInviteCount={pendingInvites.length}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          userName={user.name}
          userEmail={user.email}
          plan={workspace.plan}
          creditsRemaining={workspace.creditsRemaining}
          isPlatformAdmin={user.isPlatformAdmin}
          notifications={notifications}
          unreadCount={unreadCount}
        />
        {needsMfaEnrollment && (
          <div className="flex items-center gap-2 border-b border-warning-border bg-warning-soft px-6 py-2 text-sm text-ink">
            <ShieldAlert size={15} className="shrink-0 text-ember-ink" />
            This workspace requires two-factor authentication.{" "}
            <Link href="/dashboard/profile" className="font-medium text-ember-ink hover:underline">
              Set it up now
            </Link>
            — not doing so may limit what you can do here soon.
          </div>
        )}
        <div className="flex-1 overflow-y-auto bg-paper pb-16 md:pb-0">{children}</div>
      </div>
      <MobileBottomNav />
      <CommandPalette />
      {process.env.CONCIERGE_BOT_ID && (
        <ConciergeLauncher botId={process.env.CONCIERGE_BOT_ID} />
      )}
      </ToastProvider>
    </div>
  );
}
