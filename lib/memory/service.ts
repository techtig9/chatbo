import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemoryMode = "none" | "conversation" | "persistent";
export type AgentMemory = { id:string; botId:string; visitorId:string; category:string; key:string; value:string; confidence:number; sourceConversationId:string|null };
function clean(value:string){ return value.trim().replace(/\s+/g," ").slice(0,500); }
export function extractExplicitMemories(text:string){
  const candidates:Array<{category:string;key:string;value:string}> = [];
  const patterns:Array<[RegExp,string,string]> = [
    [/\bmy name is ([^.!?\n]{1,80})/i,"identity","name"],[/\bcall me ([^.!?\n]{1,80})/i,"identity","name"],
    [/\bi(?:'| a)m called ([^.!?\n]{1,80})/i,"identity","name"],[/\bmy company is ([^.!?\n]{1,120})/i,"business","company"],
    [/\bi work (?:at|for) ([^.!?\n]{1,120})/i,"business","employer"],[/\bi prefer ([^.!?\n]{1,160})/i,"preference","preference"],
    [/\bi like ([^.!?\n]{1,160})/i,"preference","likes"],[/\bi(?:'| a)m interested in ([^.!?\n]{1,160})/i,"interest","interests"],
    [/\bmy goal is ([^.!?\n]{1,160})/i,"goal","goal"],
  ];
  for(const [pattern,category,key] of patterns){const m=text.match(pattern);if(m?.[1]) candidates.push({category,key,value:clean(m[1])});}
  return candidates.slice(0,5);
}
export async function getAgentMemories(botId:string,visitorId:string,limit=20):Promise<AgentMemory[]>{
 const {data,error}=await createAdminClient().from("agent_memories").select("id, bot_id, visitor_id, category, memory_key, memory_value, confidence, source_conversation_id").eq("bot_id",botId).eq("visitor_id",visitorId).order("updated_at",{ascending:false}).limit(limit);
 if(error) throw new Error(`Failed to load agent memory: ${error.message}`);
 return (data??[]).map(r=>({id:r.id,botId:r.bot_id,visitorId:r.visitor_id,category:r.category,key:r.memory_key,value:r.memory_value,confidence:Number(r.confidence),sourceConversationId:r.source_conversation_id}));
}
export async function rememberExplicitFacts(botId:string,visitorId:string,conversationId:string,text:string){
 const facts=extractExplicitMemories(text); if(!facts.length)return 0; const supabase=createAdminClient();
 for(const fact of facts) await supabase.from("agent_memories").upsert({bot_id:botId,visitor_id:visitorId,category:fact.category,memory_key:fact.key,memory_value:fact.value,confidence:0.95,source_conversation_id:conversationId,last_confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"bot_id,visitor_id,memory_key"});
 return facts.length;
}
export async function updateConversationSummary(conversationId:string,botId:string,messages:Array<{role:string;content:string}>){
 if(messages.length<8)return; const supabase=createAdminClient(); const recent=messages.slice(-12).map(m=>`${m.role}: ${m.content}`).join("\n");
 await supabase.from("conversation_summaries").upsert({conversation_id:conversationId,bot_id:botId,summary:recent.slice(0,5000),covered_message_count:messages.length,updated_at:new Date().toISOString()},{onConflict:"conversation_id"});
}
