import type { AppNode, NodeEvent } from "@/lib/types";

// A RunProvider executes a single node and yields a stream of events.
// V1 has a scripted provider (M2) and a real proxy-backed provider (M3),
// both behind this interface so the executor never changes.
export interface RunProvider {
  runNode(
    node: AppNode,
    input: string,
    signal: AbortSignal,
  ): AsyncIterable<NodeEvent>;
}
