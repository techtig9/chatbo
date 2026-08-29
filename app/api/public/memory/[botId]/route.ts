import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOriginAllowed } from "@/lib/chat/origin-check";
import { z } from "zod";

const schema = z.object({ visitorId: z.string().trim().min(1).max(200), memoryId: z.string().uuid().optional(), memoryKey: z.string().trim().min(1).max(100).optional() }).refine(v => v.memoryId || v.memoryKey, { message: "memoryId or memoryKey is required" });
export async function DELETE(request: NextRequest, { params }: { params: { botId: string } }) {
  const origin=request.headers.get("origin"); const supabase=createAdminClient();
  const {data:bot}=await supabase.from("bots").select("id,allowed_domains").eq("id",params.botId).maybeSingle();
  if(!bot)return Response.json({error:"Bot not found"},{status:404});
  if(!isOriginAllowed(origin,bot.allowed_domains))return Response.json({error:"This domain is not allowed."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message},{status:400});
  let query=supabase.from("agent_memories").delete().eq("bot_id",params.botId).eq("visitor_id",parsed.data.visitorId);
  if(parsed.data.memoryId) query=query.eq("id",parsed.data.memoryId); else query=query.eq("memory_key",parsed.data.memoryKey!);
  const {error}=await query; if(error)return Response.json({error:"Couldn't forget that memory."},{status:500});
  return Response.json({ok:true});
}
