import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getCurrentUserAndWorkspace();

  if (!user) redirect("/login");
  if (!user.isPlatformAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-mist bg-ink px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-6">
          <span className="font-display text-sm font-semibold text-paper">
            chatbo.ai — Admin
          </span>
          <nav className="flex gap-4 text-sm text-paper/80">
            <Link href="/admin/users" className="hover:text-paper">Users</Link>
            <Link href="/admin/subscriptions" className="hover:text-paper">Subscriptions</Link>
            <Link href="/admin/payments" className="hover:text-paper">Payments</Link>
            <Link href="/admin/system" className="hover:text-paper">System</Link>
            <Link href="/admin/marketplace" className="hover:text-paper">Marketplace</Link>
            <Link href="/dashboard" className="ml-auto hover:text-paper">← Back to app</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
