# Agent Canvas — Product & Technical Spec

> A visual canvas for composing and debugging AI agents.

Drag out boxes (prompts, tool calls, outputs), connect them with arrows, hit **Run**, and watch each box light up and fill with output as the agent executes. The goal: make AI agent runs **visible and debuggable** instead of a wall of scrolling text.

Think *tldraw meets n8n meets Cline's chat*.

---

## 1. Audience & Goal

This is a **portfolio showpiece**. The primary audience is **hiring managers and recruiters**.

The one thing a visitor should walk away thinking: *"This person can ship a polished, real product."*

Optimization priorities, in order:
1. **Visual wow & clarity** — the canvas lighting up as an agent runs.
2. **A frictionless live demo** — works instantly, no signup, no key.
3. **A clean, credible technical story** — real LLM calls when you bring a key.

This biases every decision toward a bulletproof 2-minute demo video and a live URL that delivers an "I get it" moment in under 10 seconds.

---

## 2. Core User Flow (the first 60 seconds)

A brand-new visitor opening the live URL experiences this, with **zero setup**:

1. **Lands directly on the canvas** — no splash, no tutorial overlay, no signup. A finished demo flow is already laid out:

   ```
   [Prompt: "Research {{topic}}"] → [Tool: Web Search] → [Prompt: Summarize] → [Output]
   ```

2. **A subtly pulsing "Run" button** draws the eye.

3. **Hitting Run executes in scripted mode** (no API key required). Real **recorded** outputs stream into each node with realistic timing: the active node glows, its body fills token-by-token, the connecting edge animates as data flows downstream, completed nodes settle into a "done" state.

4. **After the run completes**, two non-intrusive hints appear:
   - *"Want to build your own? Drag from the node palette."*
   - *"Add your API key in Settings to run with a real model."*

Page-load → "oh, I get it" should take **under 10 seconds**.

---

## 3. Node Types (V1)

Exactly **three** node types ship in V1. Each renders with explicit visual states: **idle / running / complete / error**.

### 3.1 Prompt node — *is the LLM call*
- **Job:** calls the LLM and streams the response into its own body.
- **Inline config (editable on the node):** prompt text, model (Claude / OpenAI), temperature, max tokens.
- **Template variables:** prompt text supports `{{input}}` (and named refs), resolved to the upstream node's output at execution time.
- **Output:** the streamed model text, passed downstream via `data` edges.

### 3.2 Tool-call node — *non-LLM step*
- **Job:** executes a deterministic tool against an input. Tool chosen via a dropdown on the node.
- **Tools (V1):**
  - **Web search (Tavily):** input is a search query; output is a list of result snippets formatted as readable text.
  - **URL fetch:** input is a URL; output is the main article text extracted via Readability (or similar), truncated to **~4000 tokens** to avoid overflowing downstream LLM nodes.
- **Input resolution:** defaults to the upstream node's output. The user can override with a literal value or `{{input}}` template syntax on the node.
- **Execution location:** the backend proxy (see §6).
- **Errors** (rate limit, fetch failure, no results) surface as a clear **error state on the node** — never a thrown exception that crashes the run.

### 3.3 Output node — *terminal display*
- **Job:** displays a final result.
- **Affordances:** a **copy button**. Read-only.

---

## 4. Data Model

Graph state and execution state are deliberately separated (see §7). All shapes below are illustrative TypeScript.

### 4.1 Nodes

```ts
type NodeType = "prompt" | "tool" | "output";

interface BaseNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: PromptData | ToolData | OutputData;
}

interface PromptData {
  prompt: string;            // may contain {{input}}
  model: string;             // e.g. "claude-..." | "gpt-..."
  temperature: number;
  maxTokens: number;
}

interface ToolData {
  tool: "web_search" | "url_fetch";
  inputOverride?: string;    // literal or {{input}}; defaults to upstream output
}

interface OutputData {
  // display-only; result is read from execution state
}
```

### 4.2 Edges

Edges carry a **type** from day one, even though only `data` is used in V1.

```ts
type EdgeType =
  | "data"   // V1: passes upstream output as downstream input
  | "tool";  // V2 (reserved): declares a tool available to an LLM node

interface Edge {
  id: string;
  source: string;        // node id
  target: string;        // node id
  type: EdgeType;        // always "data" in V1
}
```

### 4.3 Runs & events

A run is a **flat, per-node event stream**, not a single output per node. This is the key forward-compat decision (see §5).

```ts
type RunStatus = "idle" | "running" | "complete" | "error" | "cancelled";
type NodeStatus = "idle" | "running" | "complete" | "error" | "cancelled";

interface NodeEvent {
  nodeId: string;
  kind: "start" | "token" | "tool_call" | "tool_result" | "complete" | "error";
  payload?: unknown;       // e.g. token text, tool args, error message
  at: number;              // ms timestamp
}

interface Run {
  id: string;
  status: RunStatus;
  events: NodeEvent[];     // flat stream across all nodes
  startedAt: number;
  endedAt?: number;
}
```

### 4.4 Persistence
- **Graph state** (nodes, edges, positions) is persisted to **localStorage** and can be **exported/imported as JSON**.
- **Execution state** (per-node status, streamed output buffer, timing, run status) is **in-memory only** and resets on reload.

---

## 5. Execution Model (V1 → V2 plan) — *read this*

**V1 is a linear DAG.** Nodes execute in **topological order**, one pass, no loops. Each `data` edge passes its upstream node's output as the downstream node's input.

This reads more like n8n than a true agent — by design, to guarantee a polished, predictable demo. **But** the executor and data model are built so that **agentic loops can be added in V2 without a rewrite.** The three enabling decisions:

1. **Node execution returns an async iterable of *events*, not a single output.** An LLM node can therefore emit multiple tool-call requests over time — the shape an agent loop needs.
2. **The run log is a flat per-node event stream** (§4.3), so a single node can legitimately have many execution events within one run.
3. **Edges have a `type`.** `data` edges feed outputs downstream (V1). `tool` edges will declare a tool *available to* an LLM node (V2). The field exists in the schema now; only `data` edges are created in V1.

**V2 (agentic loops), explicitly out of scope for V1:** a Prompt/LLM node, given `tool` edges to tool nodes, can decide to call those tools, observe results, and loop until done — the classic agent loop, visualized on the canvas. Because of the three decisions above, this is an additive change to the executor, not a re-architecture.

---

## 6. Hybrid Execution & Backend

Running a flow is **hybrid**:

- **Demo mode (default on the live URL):** scripted/recorded outputs replayed with realistic streaming timing. Bulletproof for the demo video, zero cost, no API key, no backend dependency for the happy path.
- **Real mode:** the user pastes **their own API key** into a Settings panel. The key is sent **per-request** and is **never stored server-side**.

**Backend:** a single **Next.js API route acting as a streaming proxy**. It:
1. Forwards LLM calls to **Anthropic / OpenAI**.
2. Executes tool calls (**Tavily** web search, **URL fetch** via Readability).
3. Streams responses back to the client via **SSE**.

Keeping the LLM/tool calls behind a proxy means keys never live in client bundles and CORS/provider browser restrictions are sidestepped.

---

## 7. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js + TypeScript** | API route doubles as the streaming proxy (§6). |
| Canvas | **React Flow (`@xyflow/react`)** | Custom node components per type for full design control over idle/running/complete/error states. The graph mechanics (drag, connect, pan/zoom) come free; the *wow* layer is ours. |
| State | **Zustand** | Clean split: **graph state** (nodes/edges/positions → localStorage) vs **execution state** (per-node status, output buffer, timing, run status → in-memory). React Flow officially uses/recommends Zustand. |
| Styling | **Tailwind CSS** | Fast iteration on the visual states that carry the demo. |
| Streaming | **SSE** | From the proxy to the client. |
| Tools | **Tavily** (search), **Readability** (fetch) | Executed in the proxy. |

**Rendering performance:** components subscribe to **narrow selectors** so per-token streaming updates to one node don't re-render the whole canvas.

---

## 8. Visual Design (the differentiation)

The mechanics are boring; the *feel* is the product. Every node has four explicit visual states, and the canvas animates the run:

- **idle** — neutral, inviting.
- **running** — the node **glows/pulses**; its body fills with streamed tokens; the **incoming edge animates** as data arrives.
- **complete** — settles into a calm "done" state; output retained.
- **error** — clear, non-alarming error styling with the error message inline (run continues / stops gracefully, never crashes).

A **Stop** button can cancel an in-flight run mid-stream, marking running nodes as `cancelled`.

---

## 9. In Scope (V1)

- The **three node types** (Prompt, Tool-call, Output).
- **Hybrid run:** scripted demo mode (default) + real mode with BYO key.
- **Streaming proxy** API route (LLM + tools, SSE).
- **Settings panel** for the user's own API key (per-request, never stored).
- **Pre-loaded demo flow**, runnable instantly with no key.
- **Stop / cancel a run.**
- **Export / import flow as JSON.**
- **localStorage** persistence of the graph.
- The four per-node **visual states** and run animations.

---

## 10. Out of Scope (V1)

Explicitly **not** in V1 (most are candidate V2 work):

- **Agentic loops** — V1 is a one-pass DAG (§5); loops are the headline V2 feature.
- **Multiplayer / real-time collaboration.**
- **Auth / accounts.**
- **Server-side persistence** — localStorage only.
- **Additional / "fancy" node types** beyond the three.
- **Undo / redo** on canvas edits.
- **Run history / re-inspecting past runs** — only the current/last run is in memory.
- **Branching / conditionals** in the graph.
- **Mobile-optimized layout** — desktop-first.

---

## 11. Milestones

See **[PLAN.md](./PLAN.md)** for the full milestone breakdown (M1–M4), each 2–5 days and independently demoable.
