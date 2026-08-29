import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction } from "@/lib/authz/rbac";
import { executeTool } from "@/lib/tools/executor";
import { getToolDefinition } from "@/lib/tools/registry";
import { z } from "zod";
const bodySchema=z.object({toolKey:z.string().min(1),input:z.record(z.unknown()).default({})});
export async function POST(request:NextRequest,{params}:{params:{botId:string}}){const {user,workspace}=await getCurrentUserAndWorkspace();if(!user||!workspace)return Response.json({error:"Not signed in."},{status:401});try{requireWorkspaceAction(workspace.role,"bot:edit");}catch{return Response.json({error:"Your role cannot execute tools."},{status:403});}const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message??"Invalid request."},{status:400});const definition=getToolDefinition(parsed.data.toolKey);if(!definition)return Response.json({error:"Unknown tool."},{status:404});const supabase=createClient();const {data:bot}=await supabase.from("bots").select("id").eq("id",params.botId).eq("workspace_id",workspace.workspaceId).maybeSingle();if(!bot)return Response.json({error:"Agent not found."},{status:404});try{const output=await executeTool({botId:params.botId,toolKey:parsed.data.toolKey,input:parsed.data.input});return Response.json({success:true,tool:definition.key,output});}catch(error){return Response.json({success:false,error:error instanceof Error?error.message:"Tool execution failed."},{status:422});}}
