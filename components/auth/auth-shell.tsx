import Link from "next/link";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";
import { LogoMark } from "@/components/branding/logo";

const PANEL_POINTS = [
  { icon: Sparkles, text: "Describe the job — chatbo drafts the agent" },
  { icon: ShieldCheck, text: "Grounded in your knowledge, not a guess" },
  { icon: Zap, text: "Test before it ever talks to a customer" },
];

/**
 * Shared split-panel auth shell — a branded black+lime left panel (the
 * "premium modern SaaS auth" pattern the redesign brief asks for)
 * alongside the actual form, which every auth page supplies as
 * children. Hidden below lg so mobile stays a clean single column
 * rather than squeezing two panels into a narrow screen.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_20%_20%,rgba(195,245,60,0.16),transparent_55%)]" />
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <LogoMark size={24} variant="onDark" />
          chat<span className="text-signal">bo</span>.ai
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">{eyebrow}</p>
          <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold leading-tight tracking-tight">{title}</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-paper/65">{subtitle}</p>
          <ul className="mt-8 space-y-3">
            {PANEL_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-paper/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal/15 text-signal"><Icon size={13} aria-hidden="true" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-paper/40">Build useful AI, not just another chat window.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <Link href="/" className="mb-8 flex items-center gap-2 font-display text-lg font-semibold text-ink lg:hidden">
          <LogoMark size={22} />
          chat<span className="text-ink">bo</span>.ai
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
