import { describe, expect, it } from "vitest";
import { getNodeStatus, describeNode } from "@/components/workflows/visual-builder";
import type { WorkflowNode } from "@/lib/workflows/types";

describe("getNodeStatus", () => {
  it("returns 'idle' when there is no run yet", () => {
    expect(getNodeStatus("n1", [])).toBe("idle");
  });

  it("returns 'queued' for every node once a run exists but no step has started", () => {
    expect(getNodeStatus("n1", [], { status: "queued", currentNodeId: null })).toBe("queued");
  });

  it("returns the step's own status once that node has a recorded step", () => {
    const steps = [{ nodeId: "n1", status: "succeeded" as const }, { nodeId: "n2", status: "failed" as const }];
    expect(getNodeStatus("n1", steps, { status: "running", currentNodeId: "n2" })).toBe("succeeded");
    expect(getNodeStatus("n2", steps, { status: "running", currentNodeId: "n2" })).toBe("failed");
  });

  it("returns 'waiting' for the current node when the run is awaiting approval, even without its own step status", () => {
    const steps = [{ nodeId: "approval-1", status: "succeeded" as const }]; // engine marks the approval step 'succeeded' once created
    expect(getNodeStatus("approval-1", steps, { status: "awaiting_approval", currentNodeId: "approval-1" })).toBe("waiting");
  });

  it("does not mark unrelated nodes as waiting during an awaiting_approval run", () => {
    expect(getNodeStatus("other-node", [], { status: "awaiting_approval", currentNodeId: "approval-1" })).toBe("idle");
  });
});

describe("describeNode", () => {
  function node(overrides: Partial<WorkflowNode>): WorkflowNode {
    return { id: "1", type: "http", name: "HTTP Request", config: {}, ...overrides };
  }

  it("summarizes a configured http node by its URL", () => {
    expect(describeNode(node({ type: "http", config: { url: "https://example.com/api" } }))).toBe("https://example.com/api");
  });

  it("prompts to configure an unconfigured tool node", () => {
    expect(describeNode(node({ type: "tool", config: {} }))).toBe("Choose a tool");
  });

  it("names the tool once toolKey is set", () => {
    expect(describeNode(node({ type: "tool", config: { toolKey: "send_email" } }))).toBe("Run send_email");
  });

  it("prompts to choose an agent for an unconfigured knowledge node", () => {
    expect(describeNode(node({ type: "knowledge", config: {} }))).toBe("Choose an agent to search");
  });

  it("truncates long values rather than overflowing the node card", () => {
    const longUrl = `https://example.com/${"a".repeat(60)}`;
    const result = describeNode(node({ type: "http", config: { url: longUrl } }));
    expect(result.length).toBeLessThan(longUrl.length);
    expect(result.endsWith("…")).toBe(true);
  });
});
