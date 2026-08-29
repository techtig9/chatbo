import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function since(days: number) { return new Date(Date.now() - days * 86400000).toISOString(); }

export async function getProductionObservability(workspaceId: string, days = 7) {
  const from = since(days);
  const db = createAdminClient();
  const { data: botRows } = await db.from("bots").select("id").eq("workspace_id", workspaceId);
  const botIds = (botRows || []).map(b => b.id);
  const { data: conversationRows } = await db.from("conversations").select("id").in("bot_id", botIds.length ? botIds : ["00000000-0000-0000-0000-000000000000"]);
  const conversationIds = (conversationRows || []).map(c => c.id);
  const [{ data: runs }, { data: usage }, { data: tools }, { data: feedback }, { data: events }, { data: bots }] = await Promise.all([
    db.from("agent_runs").select("id,bot_id,status,duration_ms,total_steps,tool_calls,model_calls,input_tokens,output_tokens,cached_tokens,estimated_cost_usd,provider,model,created_at:started_at,error_message").eq("workspace_id", workspaceId).gte("started_at", from).order("started_at", { ascending: false }).limit(5000),
    db.from("ai_usage_records").select("provider,model,input_tokens,output_tokens,cached_tokens,estimated_cost_usd,latency_ms,success,created_at").eq("workspace_id", workspaceId).gte("created_at", from).limit(5000),
    db.from("tool_executions").select("tool_key,status,duration_ms,created_at").in("bot_id", botIds.length ? botIds : ["00000000-0000-0000-0000-000000000000"]).gte("created_at", from).limit(5000),
    db.from("messages").select("feedback,created_at,conversation_id").in("conversation_id", conversationIds.length ? conversationIds : ["00000000-0000-0000-0000-000000000000"]).gte("created_at", from).limit(10000),
    db.from("agent_business_events").select("event_type,value,currency,created_at").eq("workspace_id", workspaceId).gte("created_at", from).limit(5000),
    db.from("bots").select("id,name,status").eq("workspace_id", workspaceId),
  ]);
  const rs = runs || []; const us = usage || []; const ts = tools || [];
  const totalRuns = rs.length;
  const failedRuns = rs.filter(r => r.status === "failed").length;
  const succeededRuns = rs.filter(r => r.status === "succeeded").length;
  const avgLatency = totalRuns ? Math.round(rs.reduce((s,r) => s + Number(r.duration_ms || 0),0) / totalRuns) : 0;
  const sortedLatencies = rs.map(r => Number(r.duration_ms || 0)).sort((a,b)=>a-b);
  const p95 = sortedLatencies.length ? sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * .95))] : 0;
  const cost = us.reduce((s,r)=>s + Number(r.estimated_cost_usd || 0),0);
  const toolCalls = ts.length; const toolFailures = ts.filter(t=>t.status === "failed").length;
  const up = (feedback || []).filter(f=>f.feedback === "up").length; const down = (feedback || []).filter(f=>f.feedback === "down").length;
  const satisfaction = up + down ? Math.round((up / (up + down)) * 100) : null;
  const providerMap = new Map<string, { requests:number; cost:number; failures:number; latency:number }>();
  for (const r of us) { const p = r.provider; const x = providerMap.get(p) || {requests:0,cost:0,failures:0,latency:0}; x.requests++; x.cost += Number(r.estimated_cost_usd||0); x.failures += r.success ? 0 : 1; x.latency += Number(r.latency_ms||0); providerMap.set(p,x); }
  const providers = [...providerMap.entries()].map(([provider,x])=>({provider,...x,avgLatency:x.requests?Math.round(x.latency/x.requests):0})).sort((a,b)=>b.requests-a.requests);
  const botMap = new Map<string, {runs:number; failed:number; cost:number; latency:number}>();
  for (const r of rs) { const x=botMap.get(r.bot_id)||{runs:0,failed:0,cost:0,latency:0}; x.runs++; x.failed += r.status === "failed" ? 1 : 0; x.cost += Number(r.estimated_cost_usd||0); x.latency += Number(r.duration_ms||0); botMap.set(r.bot_id,x); }
  const botPerformance = (bots||[]).map(b=>{const x=botMap.get(b.id)||{runs:0,failed:0,cost:0,latency:0}; return {id:b.id,name:b.name,status:b.status,runs:x.runs,failed:x.failed,errorRate:x.runs?Math.round((x.failed/x.runs)*100):0,cost:x.cost,avgLatency:x.runs?Math.round(x.latency/x.runs):0};}).sort((a,b)=>b.runs-a.runs);
  const business = (events || []).reduce((acc,e)=>{acc[e.event_type]=(acc[e.event_type]||0)+1; return acc;}, {} as Record<string,number>);
  return { days,totalRuns,failedRuns,succeededRuns,errorRate:totalRuns?Math.round(failedRuns/totalRuns*100):0,avgLatency,p95,cost,toolCalls,toolFailures,toolFailureRate:toolCalls?Math.round(toolFailures/toolCalls*100):0,satisfaction,providers,botPerformance,business, recentRuns:rs.slice(0,20) };
}

export async function getTrace(runId: string, workspaceId: string) {
  const db = createAdminClient();
  const { data: run } = await db.from("agent_runs").select("*").eq("id",runId).eq("workspace_id",workspaceId).maybeSingle();
  const { data: events } = await db.from("agent_trace_events").select("*").eq("run_id",runId).eq("workspace_id",workspaceId).order("step_index",{ascending:true}).order("created_at",{ascending:true});
  return { run, events: events || [] };
}
