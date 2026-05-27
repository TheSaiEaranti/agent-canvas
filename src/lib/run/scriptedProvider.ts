import type {
  AppNode,
  NodeEvent,
  PromptData,
  ToolData,
} from "@/lib/types";
import type { RunProvider } from "./provider";
import { sleep, rand, chunkText, truncate } from "./streaming";

// Recorded outputs for the canonical demo flow (SPEC §2). These are the
// "real recorded outputs" that stream in when running without an API key.
const RECORDED: Record<string, string> = {
  demo_research:
    "best practices for building reliable autonomous AI agents in production 2026",

  demo_search: `Top results:

1. Building Reliable AI Agents — Anthropic Engineering
   Reliable agents come from tight tool scoping, explicit stop conditions, and
   observable intermediate steps. Teams that log every tool call debug ~3x faster.

2. The State of Autonomous Agents in 2026 — a16z
   Production agents are converging on smaller, well-defined tool sets and
   human-in-the-loop checkpoints rather than fully open-ended loops.

3. Patterns for Agent Orchestration — Latent Space
   The most robust deployments treat an agent run as an inspectable graph: each
   step is a node with typed inputs/outputs, making failures easy to localize.`,

  demo_summarize: `• Reliability comes from constraint — scope tools tightly, define explicit stop conditions, and keep a human in the loop at key checkpoints.
• Observability is the debugging unlock: logging every tool call and model decision lets teams pinpoint failures dramatically faster.
• Treating an agent run as an inspectable graph of typed steps — exactly what this canvas does — makes failures easy to localize.`,
};

function resolveToolArg(data: ToolData, input: string): string {
  const override = data.inputOverride;
  if (override && override.trim()) {
    return override.includes("{{input}}")
      ? override.replace(/\{\{input\}\}/g, input)
      : override;
  }
  return input;
}

function textFor(node: AppNode, input: string): string {
  if (node.type === "output") return input || "(no upstream output)";

  const recorded = RECORDED[node.id];
  if (recorded) return recorded;

  // Generic fallback so user-built flows still "run" in scripted mode.
  if (node.type === "prompt") {
    const data = node.data as PromptData;
    const prompt = data.prompt.replace(/\{\{input\}\}/g, input).trim();
    return `Simulated response (scripted demo mode).

This is what the model would generate for:
"${truncate(prompt, 160)}"

Add your API key in Settings to run this node for real.`;
  }

  const data = node.data as ToolData;
  const arg = resolveToolArg(data, input);
  if (data.tool === "web_search") {
    return `Simulated web search results for "${truncate(arg, 80)}":

1. Example result — a relevant snippet about the query.
2. Example result — another supporting snippet.
3. Example result — additional context.`;
  }
  return `Simulated fetched content from ${truncate(arg, 80)}:

Extracted article text would appear here (via Readability), truncated to ~4000 tokens.`;
}

async function* runNode(
  node: AppNode,
  input: string,
  signal: AbortSignal,
): AsyncIterable<NodeEvent> {
  const now = () => Date.now();
  yield { nodeId: node.id, kind: "start", at: now() };

  // Tool nodes show a call + a little latency before results stream.
  if (node.type === "tool") {
    const data = node.data as ToolData;
    const args = resolveToolArg(data, input);
    yield { nodeId: node.id, kind: "tool_call", tool: data.tool, args, at: now() };
    await sleep(rand(550, 850), signal);
    if (signal.aborted) return;
  } else {
    await sleep(rand(150, 350), signal);
    if (signal.aborted) return;
  }

  const text = textFor(node, input);
  for (const chunk of chunkText(text)) {
    if (signal.aborted) return;
    await sleep(rand(16, 38), signal);
    yield { nodeId: node.id, kind: "token", text: chunk, at: now() };
  }

  if (node.type === "tool") {
    yield { nodeId: node.id, kind: "tool_result", result: text, at: now() };
  }
  yield { nodeId: node.id, kind: "complete", output: text, at: now() };
}

export const scriptedProvider: RunProvider = { runNode };
