import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentMemories, type MemoryMode } from "./service";
export async function getMemoryContext(botId:string,visitorId:string,conversationId:string,mode:MemoryMode){
 if(mode==="none")return ""; const memories=mode==="persistent"?await getAgentMemories(botId,visitorId):[]; const {data:summary}=await createAdminClient().from("conversation_summaries").select("summary").eq("conversation_id",conversationId).maybeSingle();
 const sections:string[]=[]; if(summary?.summary)sections.push(`Conversation summary:\n${summary.summary}`); if(memories.length)sections.push(`Known user-provided memory (use only when relevant):\n${memories.map(m=>`- ${m.key}: ${m.value}`).join("\n")}`); return sections.join("\n\n");
}
