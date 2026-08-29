import type { ToolPermission } from "@/lib/supabase/types";
export type ToolDefinition = { key:string; name:string; description:string; permission:ToolPermission; category:"knowledge"|"communication"|"commerce"|"automation"|"utility"; inputSchema:Record<string,unknown> };
export const TOOL_REGISTRY: ToolDefinition[] = [
{key:"knowledge_search",name:"Search knowledge base",description:"Search the agent's connected knowledge sources for grounded information.",permission:"read",category:"knowledge",inputSchema:{type:"object",properties:{query:{type:"string"}},required:["query"]}},
{key:"send_email",name:"Send email",description:"Send an email on behalf of the workspace after the required permission is granted.",permission:"write",category:"communication",inputSchema:{type:"object",properties:{to:{type:"string"},subject:{type:"string"},body:{type:"string"}},required:["to","subject","body"]}},
{key:"create_support_ticket",name:"Create support ticket",description:"Create a support ticket for a human team to handle.",permission:"write",category:"automation",inputSchema:{type:"object",properties:{title:{type:"string"},description:{type:"string"},priority:{type:"string"}},required:["title","description"]}},
{key:"check_order_status",name:"Check order status",description:"Look up an order status through a configured commerce integration.",permission:"read",category:"commerce",inputSchema:{type:"object",properties:{orderId:{type:"string"}},required:["orderId"]}},
{key:"handoff_to_human",name:"Hand off to human",description:"Escalate the conversation to a human support workflow.",permission:"sensitive",category:"automation",inputSchema:{type:"object",properties:{reason:{type:"string"}},required:["reason"]}},
];
export function getToolDefinition(key:string){return TOOL_REGISTRY.find(t=>t.key===key)}
