import type { AppNode, AppEdge, NodeEvent } from "@/lib/types";
import type { RunProvider } from "./provider";

// Kahn's algorithm. V1 is a linear DAG; if a cycle sneaks in we still run the
// leftover nodes (best-effort) rather than crashing the whole run.
export function topoSort(nodes: AppNode[], edges: AppEdge[]): string[] {
  const ids = nodes.map((n) => n.id);
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));

  for (const e of edges) {
    if (!indeg.has(e.source) || !indeg.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id)!) {
      const d = (indeg.get(next) ?? 0) - 1;
      indeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  if (order.length !== ids.length) {
    for (const id of ids) if (!order.includes(id)) order.push(id);
  }
  return order;
}

// A node's input is the concatenation of its upstream nodes' outputs (SPEC §5).
export function resolveInput(
  nodeId: string,
  edges: AppEdge[],
  outputs: Record<string, string>,
): string {
  return edges
    .filter((e) => e.target === nodeId)
    .map((e) => outputs[e.source])
    .filter((o): o is string => Boolean(o))
    .join("\n\n");
}

// Executes the graph in topological order and yields a single flat event
// stream across all nodes (SPEC §4.3 / §5). The provider decides how each
// node runs; the executor only orchestrates order, input wiring, and errors.
export async function* executeGraph(
  nodes: AppNode[],
  edges: AppEdge[],
  provider: RunProvider,
  signal: AbortSignal,
): AsyncGenerator<NodeEvent> {
  const order = topoSort(nodes, edges);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outputs: Record<string, string> = {};

  for (const id of order) {
    if (signal.aborted) return;
    const node = byId.get(id);
    if (!node) continue;

    const input = resolveInput(id, edges, outputs);
    let output = "";

    try {
      for await (const ev of provider.runNode(node, input, signal)) {
        if (ev.kind === "complete") output = ev.output;
        yield ev;
        if (signal.aborted) return;
      }
    } catch (err) {
      yield {
        nodeId: id,
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
        at: Date.now(),
      };
      return; // linear DAG: a failed node blocks everything downstream
    }

    outputs[id] = output;
  }
}
