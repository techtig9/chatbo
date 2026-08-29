import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { retrieveForQuery } from "@/lib/knowledge/retrieve";
import { getToolDefinition } from "./registry";
import { decryptConfig } from "./integration-config";
import { inspectToolCall } from "@/lib/security/guardrails";
import type { BotRow } from "@/lib/data/bots";

const TOOL_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : {}; } catch { /* plain text */ }
  if (!response.ok) throw new Error(`Integration returned HTTP ${response.status}.`);
  return { ok: true, data: body };
}

export async function executeTool(params:{botId:string;conversationId?:string;toolKey:string;input:Record<string,unknown>}){
 const definition=getToolDefinition(params.toolKey); const supabase=createAdminClient(); const started=Date.now();
 if(!definition) throw new Error(`Unknown tool: ${params.toolKey}`);
 const { data:bot } = await supabase.from("bots").select("*").eq("id",params.botId).maybeSingle();
 if (!bot) throw new Error("Agent not found.");
 const {data:configured}=await supabase.from("agent_tools").select("enabled, permission, config").eq("bot_id",params.botId).eq("tool_key",params.toolKey).maybeSingle();
 const guardrail = inspectToolCall(bot as unknown as BotRow, (configured?.permission ?? definition.permission) as any, params.input);
 if (!guardrail.allowed) { await supabase.from("tool_executions").insert({bot_id:params.botId,conversation_id:params.conversationId??null,tool_key:params.toolKey,status:"blocked",input:params.input,error_message:guardrail.message,duration_ms:Date.now()-started}); await supabase.from("security_incidents").insert({workspace_id:bot.workspace_id,bot_id:bot.id,conversation_id:params.conversationId??null,code:guardrail.code,severity:guardrail.code.includes("SECRET")?"high":"medium",message:guardrail.message,metadata:{tool:params.toolKey}}); throw new Error(guardrail.message); }
 if(!configured?.enabled){await supabase.from("tool_executions").insert({bot_id:params.botId,conversation_id:params.conversationId??null,tool_key:params.toolKey,status:"blocked",input:params.input,error_message:"Tool is not enabled for this agent.",duration_ms:Date.now()-started}); throw new Error("This tool is not enabled for the agent.");}
 try{
  const config=decryptConfig((configured.config ?? {}) as Record<string,unknown>);
  let output:Record<string,unknown>;
  if(params.toolKey==="knowledge_search"){
   const query=typeof params.input.query==="string"?params.input.query:""; if(!query)throw new Error("A search query is required.");
   const result=await retrieveForQuery(params.botId,query);
   output={found:!result.useFallback,sources:result.chunks.map(c=>({title:c.sourceTitle,content:c.content,similarity:c.similarity}))};
  } else if(params.toolKey==="send_email"){
   const apiKey=typeof config.apiKey==="string"?config.apiKey:process.env.RESEND_API_KEY;
   const from=typeof config.from==="string"?config.from:process.env.TOOL_EMAIL_FROM;
   if(!apiKey||!from) throw new Error("Email integration is not configured. Add an API key and sender address.");
   const response=await fetchWithTimeout("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:params.input.to,subject:params.input.subject,text:params.input.body})});
   output=await parseResponse(response);
  } else if(params.toolKey==="check_order_status"){
   const base=typeof config.url==="string"?config.url:""; if(!base) throw new Error("Order-status integration is not configured.");
   const headers:Record<string,string>={Accept:"application/json"}; if(typeof config.apiKey==="string") headers.Authorization=`Bearer ${config.apiKey}`;
   const url=new URL(base); url.searchParams.set("orderId",String(params.input.orderId));
   output=await parseResponse(await fetchWithTimeout(url.toString(),{headers}));
  } else if(params.toolKey==="create_support_ticket"){
   const url=typeof config.url==="string"?config.url:""; if(!url) throw new Error("Support-ticket integration is not configured.");
   const headers:Record<string,string>={"Content-Type":"application/json"}; if(typeof config.apiKey==="string") headers.Authorization=`Bearer ${config.apiKey}`;
   output=await parseResponse(await fetchWithTimeout(url,{method:"POST",headers,body:JSON.stringify(params.input)}));
  } else if(params.toolKey==="handoff_to_human"){
   const url=typeof config.url==="string"?config.url:""; if(!url) throw new Error("Human-handoff integration is not configured.");
   const headers:Record<string,string>={"Content-Type":"application/json"}; if(typeof config.apiKey==="string") headers.Authorization=`Bearer ${config.apiKey}`;
   output=await parseResponse(await fetchWithTimeout(url,{method:"POST",headers,body:JSON.stringify({conversationId:params.conversationId,...params.input})}));
  } else {
   throw new Error(`No executor is configured for ${definition.name}.`);
  }
  await supabase.from("tool_executions").insert({bot_id:params.botId,conversation_id:params.conversationId??null,tool_key:params.toolKey,status:"succeeded",input:params.input,output,duration_ms:Date.now()-started});return output;
 }catch(error){const message=error instanceof Error?error.message:"Tool execution failed";await supabase.from("tool_executions").insert({bot_id:params.botId,conversation_id:params.conversationId??null,tool_key:params.toolKey,status:"failed",input:params.input,error_message:message,duration_ms:Date.now()-started});throw error;}
}
