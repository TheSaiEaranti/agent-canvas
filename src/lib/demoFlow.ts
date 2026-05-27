import type { AppNode, AppEdge } from "./types";
import { DEFAULT_MODEL } from "./defaults";

// The canonical pre-loaded demo flow (SPEC §2):
// Research → Web Search → Summarize → Output
export const demoNodes: AppNode[] = [
  {
    id: "demo_research",
    type: "prompt",
    position: { x: 0, y: 80 },
    data: {
      label: "Research",
      prompt:
        "Suggest one focused web search query to research the future of AI agents. Return only the query.",
      model: DEFAULT_MODEL,
      temperature: 0.7,
      maxTokens: 256,
    },
  },
  {
    id: "demo_search",
    type: "tool",
    position: { x: 340, y: 80 },
    data: {
      label: "Web Search",
      tool: "web_search",
    },
  },
  {
    id: "demo_summarize",
    type: "prompt",
    position: { x: 680, y: 80 },
    data: {
      label: "Summarize",
      prompt:
        "Summarize these search results into 3 concise bullet points:\n\n{{input}}",
      model: DEFAULT_MODEL,
      temperature: 0.4,
      maxTokens: 1024,
    },
  },
  {
    id: "demo_output",
    type: "output",
    position: { x: 1020, y: 80 },
    data: {
      label: "Output",
    },
  },
];

export const demoEdges: AppEdge[] = [
  { id: "e1", source: "demo_research", target: "demo_search", type: "data" },
  { id: "e2", source: "demo_search", target: "demo_summarize", type: "data" },
  { id: "e3", source: "demo_summarize", target: "demo_output", type: "data" },
];
