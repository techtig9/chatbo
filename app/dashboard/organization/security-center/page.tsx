import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, FileDown, ShieldCheck } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getOrganizationForWorkspace } from "@/lib/enterprise";
import { listIdentityConfig } from "@/lib/enterprise-identity";
import { createClient } from "@/lib/supabase/server";
import { securityScore } from "@/lib/security/compliance";

export const dynamic = "force-dynamic";

export default async function SecurityCenterPage() {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");
  const org = await getOrganizationForWorkspace(workspace.workspaceId);
  if (!org) redirect("/dashboard/organization/security");
  const identity = await listIdentityConfig(org.id);
  const supabase = createClient();
  const [{ data: domains }, { data: tokens }, { data: events }] = await Promise.all([
    supabase.from("organization_domains").select("id,domain,status").eq("organization_id", org.id),
    supabase.from("organization_scim_tokens").select("id").eq("organization_id", org.id),
    supabase.from("organization_audit_events").select("id,event_type,action,result,created_at,actor_user_id,target_type,target_id").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const security = identity.security ?? { require_mfa: false, enforce_sso: false, restrict_to_verified_domains: false, ip_allowlist: [], session_timeout_minutes: 480 };
  const hasVerifiedDomain = (domains ?? []).some(d => d.status === "verified");
  const hasSso = (identity.sso ?? []).some(s => s.enabled);
  const score = securityScore({ requireMfa: security.require_mfa, enforceSso: security.enforce_sso, restrictDomains: security.restrict_to_verified_domains, hasVerifiedDomain, hasSso, hasScim: (tokens ?? []).length > 0, hasIpPolicy: (security.ip_allowlist ?? []).length > 0 });
  const failures = (events ?? []).filter(e => e.result !== "success").length;
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink"><ShieldCheck size={14}/> Enterprise Security Center</p><h1 className="font-display text-2xl font-semibold text-ink">Security & compliance</h1><p className="mt-1 text-sm text-slate">Monitor organization security, audit activity and compliance readiness.</p></div><Link href="/dashboard/organization/privacy" className="mr-2 inline-flex items-center gap-2 rounded-md border border-mist px-3 py-2 text-sm">Privacy Center</Link><Link href="/dashboard/api/keys" className="inline-flex items-center gap-2 rounded-md border border-mist px-3 py-2 text-sm"><FileDown size={15}/> Export workspace audit</Link></div>
    <section className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-mist bg-surface p-5"><p className="text-xs text-slate">Security score</p><p className="mt-1 text-3xl font-semibold text-ink">{score}%</p><p className="mt-1 text-xs text-slate">Based on configured controls</p></div>
      <div className="rounded-2xl border border-mist bg-surface p-5"><p className="text-xs text-slate">Verified domains</p><p className="mt-1 text-3xl font-semibold text-ink">{domains?.filter(d => d.status === "verified").length ?? 0}</p></div>
      <div className="rounded-2xl border border-mist bg-surface p-5"><p className="text-xs text-slate">SCIM connections</p><p className="mt-1 text-3xl font-semibold text-ink">{tokens?.length ?? 0}</p></div>
      <div className="rounded-2xl border border-mist bg-surface p-5"><p className="text-xs text-slate">Recent failures</p><p className="mt-1 flex items-center gap-2 text-3xl font-semibold text-ink">{failures}{failures > 0 ? <AlertTriangle size={20} className="text-danger"/> : <CheckCircle2 size={20} className="text-success"/>}</p></div>
    </section>
    <section className="mt-6 rounded-2xl border border-mist bg-surface p-5"><div className="mb-4 flex items-center gap-2"><Activity size={18}/><h2 className="font-medium text-ink">Security controls</h2></div><div className="grid gap-3 md:grid-cols-3">{[["MFA enforcement",security.require_mfa],["SSO enforcement",security.enforce_sso],["Verified-domain restriction",security.restrict_to_verified_domains],["Verified domain",hasVerifiedDomain],["SSO provider",hasSso],["SCIM provisioning",(tokens ?? []).length > 0],["IP allowlist",(security.ip_allowlist ?? []).length > 0]].map(([label,ok])=><div key={String(label)} className="flex items-center justify-between rounded-lg border border-mist px-3 py-3"><span className="text-sm">{label}</span>{ok ? <CheckCircle2 size={17} className="text-ink"/> : <span className="text-xs text-slate">Not configured</span>}</div>)}</div></section>
    <section className="mt-6 rounded-2xl border border-mist bg-surface p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-medium text-ink">Organization audit trail</h2><p className="text-xs text-slate">Recent security-sensitive activity.</p></div><span className="text-xs text-slate">Last 50 events</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-mist text-xs text-slate"><tr><th className="py-2">Time</th><th>Event</th><th>Action</th><th>Target</th><th>Result</th></tr></thead><tbody>{(events ?? []).map(e=><tr key={e.id} className="border-b border-mist last:border-0"><td className="py-3 text-xs text-slate">{new Date(e.created_at).toLocaleString()}</td><td>{e.event_type}</td><td>{e.action}</td><td className="text-xs">{e.target_type ?? "—"}{e.target_id ? ` · ${e.target_id.slice(0,8)}` : ""}</td><td><span className={`rounded-full px-2 py-1 text-[11px] ${e.result === "success" ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink"}`}>{e.result}</span></td></tr>)}{!(events ?? []).length && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate">No organization audit events recorded yet.</td></tr>}</tbody></table></div></section>
    <p className="mt-4 text-xs text-slate">Compliance controls are configuration and evidence foundations; certifications such as SOC 2 or ISO 27001 require independent organizational audits.</p>
  </main>;
}
