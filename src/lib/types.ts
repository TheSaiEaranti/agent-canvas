import type { Node, Edge } from "@xyflow/react";

// ---- Node data shapes (SPEC §4.1) ----

export type NodeType = "prompt" | "tool" | "output";
export type ToolName = "web_search" | "url_fetch";

export type PromptData = {
  label: string;
  prompt: string; // may contain {{input}}
  model: string;
  temperature: number;
  maxTokens: number;
};

export type ToolData = {
  label: string;
  tool: ToolName;
  inputOverride?: string; // literal or {{input}}; defaults to upstream output
};

export type OutputData = {
  label: string;
};

export type NodeData = PromptData | ToolData | OutputData;

export type PromptNodeT = Node<PromptData, "prompt">;
export type ToolNodeT = Node<ToolData, "tool">;
export type OutputNodeT = Node<OutputData, "output">;
export type AppNode = PromptNodeT | ToolNodeT | OutputNodeT;

// ---- Edges (SPEC §4.2) ----
// Edges carry a type from day one; only "data" is used in V1.
// "tool" is reserved for V2 agentic loops.
export type EdgeType = "data" | "tool";
export type AppEdge = Edge<Record<string, unknown>, EdgeType>;

// ---- Runs & events (SPEC §4.3) ----
// Node execution returns an async iterable of events, not a single output,
// so a node can emit multiple events over time (forward-compat for V2 loops).
export type NodeStatus =
  | "idle"
  | "running"
  | "complete"
  | "error"
  | "cancelled";
export type RunStatus = NodeStatus;

export type NodeEvent =
  | { nodeId: string; kind: "start"; at: number }
  | { nodeId: string; kind: "token"; text: string; at: number }
  | { nodeId: string; kind: "tool_call"; tool: string; args: string; at: number }
  | { nodeId: string; kind: "tool_result"; result: string; at: number }
  | { nodeId: string; kind: "complete"; output: string; at: number }
  | { nodeId: string; kind: "error"; message: string; at: number };
