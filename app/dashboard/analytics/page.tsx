import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, DollarSign, MessageSquare, TrendingUp, Users, Clock, ArrowLeftRight } from "lucide-react";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getAdvancedAnalytics } from "@/lib/analytics/engine";
import { getConversationSeries } from "@/lib/analytics/dashboard";
import { ConversationsChart } from "@/components/dashboard/conversations-chart";
import { ChannelDistributionChart } from "@/components/analytics/channel-distribution-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams?: { days?: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  const requested = Number(searchParams?.days || 30);
  const days = [7,30,90].includes(requested) ? requested : 30;
  const [data, series] = await Promise.all([
    getAdvancedAnalytics(workspace.workspaceId, days),
    getConversationSeries(workspace.workspaceId, days),
  ]);
  return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Advanced Analytics</p><h1 className="mt-1 font-display text-2xl font-semibold text-ink">Understand your AI business</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Measure agent quality, usage, cost, customer outcomes, models, channels, and trends from one executive-ready view.</p></div><div className="flex items-center gap-2"><div className="flex rounded-xl border border-mist bg-surface p-1">{[7,30,90].map(d=><Link key={d} href={`/dashboard/analytics?days=${d}`} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${days===d?"bg-ink text-white":"text-slate hover:text-ink"}`}>{d}d</Link>)}</div><a href={`/api/analytics/export?days=${days}`} className="rounded-xl border border-mist bg-surface px-3 py-2 text-xs font-medium text-ink hover:bg-paper">Export CSV</a></div></div>

    {/* Top KPI cards — spec section 75: Conversations, Users, Success Rate, Average Response, AI Cost, Fallback Rate */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <Metric icon={<MessageSquare size={16}/>} label="Conversations" value={data.totalConversations.toLocaleString()} detail={`${days}d window`} />
      <Metric icon={<Users size={16}/>} label="Users" value={data.totalUsers.toLocaleString()} detail="unique visitors" />
      <Metric icon={<TrendingUp size={16}/>} label="Success rate" value={`${(100 - data.errorRate).toFixed(1)}%`} detail={`${data.errorRate}% error rate`} />
      <Metric icon={<Clock size={16}/>} label="Avg response" value={`${data.avgLatency}ms`} detail={`p95 ${data.p95}ms`} />
      <Metric icon={<DollarSign size={16}/>} label="AI cost" value={`$${data.cost.toFixed(4)}`} detail={`$${data.avgCostPerRun.toFixed(5)} / run`}/>
      <Metric icon={<ArrowLeftRight size={16}/>} label="Fallback rate" value={`${data.fallbackRate}%`} detail="runs that used fallback" />
    </div>

    <section className="mt-6 rounded-2xl border border-mist bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="font-display text-lg font-semibold text-ink">Conversations &amp; users over time</h2><p className="text-xs text-slate">Daily volume across every agent in this workspace</p></div>
        <span className="text-xs text-slate">Last {days} days</span>
      </div>
      <ConversationsChart data={series} />
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Panel title="Agent performance" subtitle="Quality, reliability, speed and cost by agent" icon={<Bot size={18}/>}>{data.agentPerformance.length===0?<Empty text="No agent activity yet."/>:data.agentPerformance.slice(0,8).map(a=><div key={a.id} className="border-b border-mist py-3 last:border-0"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><Link href={`/dashboard/bots/${a.id}/edit`} className="font-medium text-ink hover:text-ink">{a.name}</Link><p className="text-xs text-slate">{a.runs} runs · {a.avgLatency}ms avg · ${a.cost.toFixed(4)}</p></div><div className="text-right text-xs"><p className={a.errorRate>5?"text-danger":"text-success"}>{a.errorRate}% errors</p><p className="text-slate">{a.quality===null?"—":`${a.quality}/100`} quality</p></div></div></div>)}</Panel><Panel title="Model & provider performance" subtitle="Requests, latency, errors and token volume">{data.modelPerformance.length===0?<Empty text="No model activity yet."/>:<div className="space-y-3">{data.modelPerformance.slice(0,8).map(m=><div key={m.model} className="rounded-xl border border-mist p-3"><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-ink">{m.model}</span><span className="text-slate">{m.requests} requests</span></div><div className="mt-1 flex justify-between text-[11px] text-slate"><span>{m.avgLatency}ms avg · {m.errorRate}% errors</span><span>${m.cost.toFixed(4)}</span></div></div>)}</div>}</Panel></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3"><Panel title="Channels" subtitle="Where conversations are happening" icon={<MessageSquare size={18}/>}><ChannelDistributionChart data={data.channels} /></Panel><Panel title="AI efficiency" subtitle="Operational economics" icon={<DollarSign size={18}/>}><div className="grid grid-cols-2 gap-3"><Mini label="P95 latency" value={`${data.p95}ms`}/><Mini label="Avg latency" value={`${data.avgLatency}ms`}/><Mini label="Tokens" value={data.totalTokens.toLocaleString()}/><Mini label="Cost/run" value={`$${data.avgCostPerRun.toFixed(5)}`}/></div></Panel><Panel title="Customer outcomes" subtitle="Business events and feedback" icon={<Users size={18}/>}><div className="grid grid-cols-2 gap-3"><Mini label="Leads" value={data.leads.toLocaleString()}/><Mini label="Conversions" value={data.conversions.toLocaleString()}/><Mini label="Revenue" value={`$${data.revenue.toFixed(2)}`}/><Mini label="Positive feedback" value={data.feedbackScore===null?"—":`${data.feedbackScore}%`}/></div></Panel></div>
  </main>;
}
function Metric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="rounded-2xl border border-mist bg-surface p-5"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate">{icon}{label}</div><p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-slate">{detail}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-paper p-3"><p className="text-[11px] text-slate">{label}</p><p className="mt-1 font-display text-lg font-semibold text-ink">{value}</p></div>}
function Panel({title,subtitle,icon,children}:{title:string;subtitle:string;icon?:React.ReactNode;children:React.ReactNode}){return <section className="rounded-2xl border border-mist bg-surface p-5"><div className="mb-4 flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="font-display text-lg font-semibold text-ink">{title}</h2>{icon&&<span className="text-slate">{icon}</span>}</div><p className="text-xs text-slate">{subtitle}</p></div></div>{children}</section>}
function Empty({text}:{text:string}){return <p className="rounded-lg border border-dashed border-mist p-4 text-center text-sm text-slate">{text}</p>}
