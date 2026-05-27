import type { AppNode, NodeEvent, PromptData, ToolData } from "@/lib/types";
import type { RunProvider } from "./provider";

export type ApiKeys = {
  anthropic: string;
  openai: string;
  tavily: string;
};

type StreamMsg =
  | { type: "token"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

function providerForModel(model: string): "anthropic" | "openai" {
  return model.startsWith("gpt") ? "openai" : "anthropic";
}

function resolveToolArg(data: ToolData, input: string): string {
  const override = data.inputOverride;
  if (override && override.trim()) {
    return override.includes("{{input}}")
      ? override.replace(/\{\{input\}\}/g, input)
      : override;
  }
  return input;
}

// Parse the proxy's text/event-stream into typed messages.
async function* parseSSE(
  res: Response,
  signal: AbortSignal,
): AsyncGenerator<StreamMsg> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        try {
          yield JSON.parse(json) as StreamMsg;
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

// Real provider: calls the streaming proxy and re-emits NodeEvents, so the
// executor and store are identical to scripted mode (SPEC §5/§6).
export function createRealProvider(keys: ApiKeys): RunProvider {
  return {
    async *runNode(node: AppNode, input, signal) {
      const now = () => Date.now();
      yield { nodeId: node.id, kind: "start", at: now() };

      // Output nodes just display upstream output — no server round-trip.
      if (node.type === "output") {
        yield {
          nodeId: node.id,
          kind: "complete",
          output: input || "(no upstream output)",
          at: now(),
        };
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      let payload: unknown;

      if (node.type === "prompt") {
        const data = node.data as PromptData;
        const provider = providerForModel(data.model);
        const key = provider === "openai" ? keys.openai : keys.anthropic;
        if (!key) {
          yield {
            nodeId: node.id,
            kind: "error",
            message: `Add your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key in Settings.`,
            at: now(),
          };
          return;
        }
        headers["x-llm-key"] = key;
        payload = {
          kind: "llm",
          model: data.model,
          prompt: data.prompt.replace(/\{\{input\}\}/g, input),
          temperature: data.temperature,
          maxTokens: data.maxTokens,
        };
      } else {
        const data = node.data as ToolData;
        const arg = resolveToolArg(data, input);
        if (data.tool === "web_search") {
          if (!keys.tavily) {
            yield {
              nodeId: node.id,
              kind: "error",
              message: "Add your Tavily API key in Settings.",
              at: now(),
            };
            return;
          }
          headers["x-tavily-key"] = keys.tavily;
        }
        yield {
          nodeId: node.id,
          kind: "tool_call",
          tool: data.tool,
          args: arg,
          at: now(),
        };
        payload = { kind: "tool", tool: data.tool, input: arg };
      }

      let res: Response;
      try {
        res = await fetch("/api/run", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal,
        });
      } catch (err) {
        if (signal.aborted) return;
        yield {
          nodeId: node.id,
          kind: "error",
          message: err instanceof Error ? err.message : "Network error",
          at: now(),
        };
        return;
      }

      if (!res.ok || !res.body) {
        yield {
          nodeId: node.id,
          kind: "error",
          message: `Proxy error (${res.status}).`,
          at: now(),
        };
        return;
      }

      let output = "";
      for await (const msg of parseSSE(res, signal)) {
        if (signal.aborted) return;
        if (msg.type === "token") {
          output += msg.text;
          yield { nodeId: node.id, kind: "token", text: msg.text, at: now() };
        } else if (msg.type === "error") {
          yield {
            nodeId: node.id,
            kind: "error",
            message: msg.message,
            at: now(),
          };
          return;
        } else if (msg.type === "done") {
          break;
        }
      }

      if (node.type === "tool") {
        yield { nodeId: node.id, kind: "tool_result", result: output, at: now() };
      }
      yield { nodeId: node.id, kind: "complete", output, at: now() };
    },
  };
}
