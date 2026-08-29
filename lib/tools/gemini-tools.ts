import "server-only";
import type { ToolDefinition } from "./registry";

export function toGeminiFunctionDeclarations(tools: ToolDefinition[]) {
  return tools.map((tool) => ({
    name: tool.key,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}
