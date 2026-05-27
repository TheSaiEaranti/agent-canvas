# Agent Canvas — Milestone Plan

Four milestones, each **2–5 days** of work and **independently demoable**. See **[SPEC.md](./SPEC.md)** for the product/technical spec this plan implements.

Sequencing principle: every milestone ends with something you could screen-record. Risk is front-loaded onto the canvas (M1) and the execution engine (M2); the user-facing build experience (M3) and polish (M4) sit on top of a proven core.

---

## M1 — Static canvas (no execution) · ~2–3 days

**Goal:** a real, good-feeling node-graph canvas. No running anything.

**Scope**
- Next.js + TypeScript + Tailwind project scaffold.
- React Flow canvas with pan/zoom.
- The three **custom node components** (Prompt, Tool-call, Output) — rendering the **idle** visual state only, with their inline config UI (prompt text, model/temp/max-tokens; tool dropdown; output display).
- Drag nodes from a **palette**; connect them with `data` edges via handles.
- **Zustand graph store**; graph state persisted to **localStorage**.
- Data model types for nodes/edges in place (including the `EdgeType` field, `data`-only for now).

**Demo:** "Here's the canvas — I can drag out prompt/tool/output boxes, wire them together, and my layout survives a page refresh."

**Out:** any execution, run state, streaming, backend.

---

## M2 — One hardcoded demo flow runs end-to-end (scripted) · ~3–4 days

**Goal:** the **wow moment**. The pre-loaded demo flow runs in scripted mode and the canvas lights up.

**Scope**
- **Execution state** in Zustand (per-node status, output buffer, timing, run status), separate from graph state, in-memory.
- **Executor v1**: topological-order traversal of the DAG. Node execution returns an **async iterable of events** (the forward-compat shape from SPEC §5). Resolve `{{input}}` from upstream output.
- **Scripted run provider**: replays recorded events with realistic streaming timing — no backend, no key.
- The four **visual states** wired to execution state: node **glow/pulse** while running, **token-by-token** fill, **animated edges** on data flow, **complete** and **error** states.
- **Run** and **Stop** buttons; Stop cancels in-flight and marks nodes `cancelled`.
- Ship the canonical demo flow pre-loaded: *Research → Web Search → Summarize → Output*.

**Demo:** open the app, hit Run, watch the hardcoded research flow execute and light up — exactly the live-URL experience from SPEC §2.

**Out:** real LLM/tool calls; building your own flow from scratch (the demo flow is fixed).

---

## M3 — User builds their own flow and runs it (real + scripted) · ~4–5 days

**Goal:** it's a real tool — anyone can compose a flow and run it for real with their key.

**Scope**
- **Next.js API route streaming proxy** (SPEC §6): forwards LLM calls (Anthropic/OpenAI), executes tools, streams via **SSE**.
- **Tools:** Tavily web search; URL fetch via Readability (truncate ~4000 tokens).
- **Real run provider** behind the same async-iterable interface as the scripted provider, so the executor is unchanged.
- **Settings panel** for the user's own API key (sent per-request, never stored server-side).
- Robust **error handling**: tool/LLM errors surface as node `error` state; the run degrades gracefully, never crashes.
- **Export / import flow as JSON.**
- Empty-canvas building flow polished (palette, connect, validate before run).

**Demo:** start from a blank canvas, build a 3–4 node flow, add an API key, hit Run, watch real model output and a real web search stream in. Export it, reload, re-import.

**Out:** agentic loops, run history, undo/redo (all V2 per SPEC §10).

---

## M4 — Polish + demo video + launch · ~3–4 days

**Goal:** the portfolio artifact. Make it look effortless and ship it.

**Scope**
- **Visual polish pass:** timing/easing of glow, streaming, and edge animations; empty/first-run hints; loading and error affordances; consistent spacing/typography.
- **First-run experience** locked to SPEC §2 (pre-loaded flow, pulsing Run, post-run hints, no signup).
- **Real README** (replacing the M1 stub): hero GIF, what/why, live link, run-locally instructions, link to SPEC.
- **Deploy** the live URL (scripted mode default so it always works keyless).
- **Record the 2-minute demo video.**
- QA: cross-browser desktop, refresh persistence, Stop mid-run, error paths, import/export round-trip.

**Demo:** the launch itself — live URL + demo video + polished repo.

**Out:** anything in SPEC §10 (V2 backlog: agentic loops, multiplayer, auth, run history, undo/redo, mobile).

---

## At a glance

| Milestone | Outcome | Days |
|---|---|---|
| **M1** | Draggable, connectable canvas; persists to localStorage | 2–3 |
| **M2** | Hardcoded demo flow runs end-to-end in scripted mode, lights up | 3–4 |
| **M3** | Build-your-own flow + real LLM/tool runs via streaming proxy | 4–5 |
| **M4** | Polish, deploy, README, 2-min demo video, launch | 3–4 |
