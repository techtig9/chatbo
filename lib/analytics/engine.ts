import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 86400000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

function round(n: number, digits = 2) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function bucket(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export async function getAdvancedAnalytics(workspaceId: string, days = 30) {
  const from = since(Math.min(Math.max(days, 1), 365));
  const db = createAdminClient();
  const { data: bots } = await db.from("bots").select("id,name,status").eq("workspace_id", workspaceId);
  const botIds = (bots || []).map(b => b.id);
  const empty = "00000000-0000-0000-0000-000000000000";
  const { data: conversations } = await db.from("conversations").select("id,bot_id,channel,visitor_id,created_at").in("bot_id", botIds.length ? botIds : [empty]).gte("created_at", from).limit(50000);
  const conversationIds = (conversations || []).map(c => c.id);

  const [{ data: runs }, { data: usage }, { data: feedback }, { data: business }, { data: evalResults }] = await Promise.all([
    db.from("agent_runs").select("id,bot_id,status,duration_ms,estimated_cost_usd,provider,model,input_tokens,output_tokens,quality_score,feedback,started_at,channel,used_fallback").eq("workspace_id", workspaceId).gte("started_at", from).limit(50000),
    db.from("ai_usage_records").select("provider,model,input_tokens,output_tokens,estimated_cost_usd,latency_ms,success,created_at").eq("workspace_id", workspaceId).gte("created_at", from).limit(50000),
    db.from("messages").select("feedback,created_at,conversation_id").in("conversation_id", conversationIds.length ? conversationIds : [empty]).gte("created_at", from).limit(50000),
    db.from("agent_business_events").select("event_type,value,currency,created_at,bot_id").eq("workspace_id", workspaceId).gte("created_at", from).limit(50000),
    db.from("eval_results").select("score,task_score,groundedness_score,tool_score,safety_score,efficiency_score,created_at").gte("created_at", from).limit(50000),
  ]);

  const rs = runs || [], us = usage || [], bs = business || [];
  const totalRuns = rs.length;
  const successful = rs.filter(r => r.status === "succeeded").length;
  const failed = rs.filter(r => r.status === "failed").length;
  const totalConversations = conversations?.length ?? 0;
  const totalUsers = new Set((conversations ?? []).map(c => c.visitor_id)).size;
  const fallbackRuns = rs.filter(r => r.used_fallback).length;
  const fallbackRate = totalRuns ? round(fallbackRuns / totalRuns * 100) : 0;
  const costs = us.reduce((s,r)=>s+Number(r.estimated_cost_usd||0),0) || rs.reduce((s,r)=>s+Number(r.estimated_cost_usd||0),0);
  const latency = rs.map(r=>Number(r.duration_ms||0)).filter(Boolean).sort((a,b)=>a-b);
  const p95 = latency.length ? latency[Math.min(latency.length-1, Math.floor(latency.length*.95))] : 0;
  const up = (feedback||[]).filter(f=>f.feedback === "up").length;
  const down = (feedback||[]).filter(f=>f.feedback === "down").length;
  const qualityScores = rs.map(r=>Number(r.quality_score)).filter(Number.isFinite).filter(x=>x>0);
  const evalScores = (evalResults||[]).map(e=>Number(e.score)).filter(Number.isFinite);
  const aiQuality = qualityScores.length ? round(qualityScores.reduce((a,b)=>a+b,0)/qualityScores.length) : evalScores.length ? round(evalScores.reduce((a,b)=>a+b,0)/evalScores.length) : null;

  const daily = new Map<string,{date:string;runs:number;failed:number;cost:number;conversations:number;leads:number;conversions:number;revenue:number}>();
  for (let i=Math.ceil(days)-1;i>=0;i--) { const d=bucket(new Date(Date.now()-i*DAY).toISOString()); daily.set(d,{date:d,runs:0,failed:0,cost:0,conversations:0,leads:0,conversions:0,revenue:0}); }
  for (const r of rs) { const d=daily.get(bucket(r.started_at)); if(d){d.runs++; if(r.status==='failed')d.failed++; d.cost+=Number(r.estimated_cost_usd||0);} }
  for (const c of conversations||[]) { const d=daily.get(bucket(c.created_at)); if(d)d.conversations++; }
  for (const e of bs) { const d=daily.get(bucket(e.created_at)); if(d){ if(e.event_type==='lead')d.leads++; if(e.event_type==='conversion')d.conversions++; d.revenue += Number(e.value||0); } }

  const botMap = new Map<string,{runs:number;failed:number;cost:number;latency:number;quality:number;qualityCount:number}>();
  for(const r of rs){const x=botMap.get(r.bot_id)||{runs:0,failed:0,cost:0,latency:0,quality:0,qualityCount:0}; x.runs++; x.failed+=r.status==='failed'?1:0; x.cost+=Number(r.estimated_cost_usd||0); x.latency+=Number(r.duration_ms||0); if(Number.isFinite(Number(r.quality_score))){x.quality+=Number(r.quality_score);x.qualityCount++;} botMap.set(r.bot_id,x);}
  const agentPerformance=(bots||[]).map(b=>{const x=botMap.get(b.id)||{runs:0,failed:0,cost:0,latency:0,quality:0,qualityCount:0};return{id:b.id,name:b.name,status:b.status,runs:x.runs,failed:x.failed,errorRate:x.runs?round(x.failed/x.runs*100):0,cost:round(x.cost,4),avgLatency:x.runs?Math.round(x.latency/x.runs):0,quality:x.qualityCount?round(x.quality/x.qualityCount):null};}).sort((a,b)=>b.runs-a.runs);

  const modelMap=new Map<string,{requests:number;cost:number;failures:number;latency:number;tokens:number}>();
  for(const r of us){const key=`${r.provider||'unknown'} / ${r.model||'unknown'}`;const x=modelMap.get(key)||{requests:0,cost:0,failures:0,latency:0,tokens:0};x.requests++;x.cost+=Number(r.estimated_cost_usd||0);x.failures+=r.success?0:1;x.latency+=Number(r.latency_ms||0);x.tokens+=Number(r.input_tokens||0)+Number(r.output_tokens||0);modelMap.set(key,x);}
  const modelPerformance=[...modelMap.entries()].map(([model,x])=>({model,...x,avgLatency:x.requests?Math.round(x.latency/x.requests):0,errorRate:x.requests?round(x.failures/x.requests*100):0})).sort((a,b)=>b.requests-a.requests);

  const channelMap=new Map<string,number>();
  for(const r of rs) channelMap.set(r.channel||'unknown',(channelMap.get(r.channel||'unknown')||0)+1);
  const channels=[...channelMap.entries()].map(([channel,runs])=>({channel,runs,share:totalRuns?round(runs/totalRuns*100):0})).sort((a,b)=>b.runs-a.runs);

  const revenue=bs.filter(e=>e.event_type==='conversion').reduce((s,e)=>s+Number(e.value||0),0);
  const leads=bs.filter(e=>e.event_type==='lead').length;
  const conversions=bs.filter(e=>e.event_type==='conversion').length;
  const conversionRate=leads?round(conversions/leads*100):null;
  const feedbackScore=up+down?round(up/(up+down)*100):null;
  const avgCostPerRun=totalRuns?costs/totalRuns:0;
  const totalTokens=us.reduce((s,r)=>s+Number(r.input_tokens||0)+Number(r.output_tokens||0),0);

  return {
    days,totalRuns,successful,failed,errorRate:totalRuns?round(failed/totalRuns*100):0,cost:round(costs,4),avgCostPerRun:round(avgCostPerRun,5),p95,avgLatency:latency.length?Math.round(latency.reduce((a,b)=>a+b,0)/latency.length):0,
    totalTokens,aiQuality,feedbackScore,leads,conversions,revenue:round(revenue,2),conversionRate,channels,agentPerformance,modelPerformance,daily:[...daily.values()],businessEvents:bs.length,
    totalConversations,totalUsers,fallbackRate,
  };
}
