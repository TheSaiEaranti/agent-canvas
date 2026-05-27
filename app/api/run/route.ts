import type { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

// Readability needs a DOM (linkedom) + Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

// ---- Wire protocol (SSE, proxy -> client) ----
type StreamMsg =
  | { type: "token"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

type LLMBody = {
  kind: "llm";
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};
type ToolBody = {
  kind: "tool";
  tool: "web_search" | "url_fetch";
  input: string;
};
type RunBody = LLMBody | ToolBody;

// Opus 4.7 removed sampling params — sending temperature returns a 400.
const NO_SAMPLING_PARAMS = new Set(["claude-opus-4-7"]);
const URL_FETCH_CHAR_LIMIT = 16000; // ~4000 tokens, per SPEC §3.2

function sseLine(msg: StreamMsg): string {
  return `data: ${JSON.stringify(msg)}\n\n`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    return `${err.status ?? ""} ${err.message}`.trim();
  }
  if (err instanceof OpenAI.APIError) {
    return `${err.status ?? ""} ${err.message}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RunBody;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (msg: StreamMsg) =>
        controller.enqueue(encoder.encode(sseLine(msg)));

      try {
        if (body.kind === "llm") {
          await runLLM(body, req, send);
        } else if (body.kind === "tool") {
          await runTool(body, req, send);
        } else {
          send({ type: "error", message: "Unknown request kind." });
        }
      } catch (err) {
        send({ type: "error", message: errorMessage(err) });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function runLLM(
  body: LLMBody,
  req: NextRequest,
  send: (m: StreamMsg) => void,
) {
  const provider = body.model.startsWith("gpt") ? "openai" : "anthropic";
  const key = req.headers.get("x-llm-key") ?? "";
  if (!key) {
    send({
      type: "error",
      message: `Add your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key in Settings.`,
    });
    return;
  }
  const maxTokens = body.maxTokens ?? 1024;
  const messages = [{ role: "user" as const, content: body.prompt }];

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: key });
    const params: Anthropic.MessageStreamParams = {
      model: body.model,
      max_tokens: maxTokens,
      messages,
      // Cache the prompt prefix: re-running the same flow reads from cache
      // (only kicks in once the prefix exceeds the model's cacheable minimum).
      cache_control: { type: "ephemeral" },
      ...(NO_SAMPLING_PARAMS.has(body.model)
        ? {}
        : { temperature: body.temperature ?? 0.7 }),
    };
    const messageStream = client.messages.stream(params);
    for await (const event of messageStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        send({ type: "token", text: event.delta.text });
      }
    }
    await messageStream.finalMessage(); // surfaces late errors
  } else {
    const client = new OpenAI({ apiKey: key });
    const completion = await client.chat.completions.create({
      model: body.model,
      max_tokens: maxTokens,
      temperature: body.temperature ?? 0.7,
      messages,
      stream: true,
    });
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) send({ type: "token", text });
    }
  }
}

async function runTool(
  body: ToolBody,
  req: NextRequest,
  send: (m: StreamMsg) => void,
) {
  if (body.tool === "web_search") {
    const key = req.headers.get("x-tavily-key") ?? "";
    if (!key) {
      send({ type: "error", message: "Add your Tavily API key in Settings." });
      return;
    }
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: body.input,
        max_results: 5,
        search_depth: "basic",
      }),
    });
    if (!res.ok) {
      send({ type: "error", message: `Tavily search failed (${res.status}).` });
      return;
    }
    const data = (await res.json()) as {
      results?: { title: string; url: string; content: string }[];
    };
    const results = data.results ?? [];
    if (results.length === 0) {
      send({ type: "token", text: "No results found." });
      return;
    }
    const text = results
      .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.content}`)
      .join("\n\n");
    send({ type: "token", text });
    return;
  }

  // url_fetch
  let parsed: URL;
  try {
    parsed = new URL(body.input.trim());
  } catch {
    send({ type: "error", message: `Invalid URL: ${body.input}` });
    return;
  }
  let res: Response;
  try {
    res = await fetch(parsed, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgentCanvas/1.0)" },
    });
  } catch (err) {
    send({ type: "error", message: `Could not reach ${parsed.host}: ${errorMessage(err)}` });
    return;
  }
  if (!res.ok) {
    send({ type: "error", message: `Fetch failed (${res.status}).` });
    return;
  }
  const html = await res.text();
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  const content = (article?.textContent ?? "").trim();
  if (!content) {
    send({ type: "error", message: "Could not extract readable text from that page." });
    return;
  }
  const truncated =
    content.length > URL_FETCH_CHAR_LIMIT
      ? content.slice(0, URL_FETCH_CHAR_LIMIT) + "\n\n…[truncated]"
      : content;
  const title = article?.title ? `${article.title}\n\n` : "";
  send({ type: "token", text: title + truncated });
}
