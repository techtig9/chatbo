export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type WorkflowTrigger = "manual" | "webhook" | "conversation" | "schedule";
export type WorkflowNodeType = "trigger" | "ai" | "knowledge" | "condition" | "tool" | "http" | "email" | "delay" | "transform" | "webhook" | "human_approval" | "agent" | "end";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  x?: number;
  y?: number;
}

export interface WorkflowEdge { id: string; source: string; target: string; label?: string; }
export interface WorkflowDefinition { nodes: WorkflowNode[]; edges: WorkflowEdge[]; }
