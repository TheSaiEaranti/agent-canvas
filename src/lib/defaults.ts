import type { NodeData, NodeType } from "./types";

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export function defaultNodeData(type: NodeType): NodeData {
  switch (type) {
    case "prompt":
      return {
        label: "Prompt",
        prompt: "Write a focused web search query about: {{input}}",
        model: DEFAULT_MODEL,
        temperature: 0.7,
        maxTokens: 1024,
      };
    case "tool":
      return {
        label: "Tool",
        tool: "web_search",
      };
    case "output":
      return {
        label: "Output",
      };
  }
}
