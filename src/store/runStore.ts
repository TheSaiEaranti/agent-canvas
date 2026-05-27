import { create } from "zustand";
import type { NodeEvent, NodeStatus, RunStatus } from "@/lib/types";
import { useGraphStore } from "./graphStore";
import { executeGraph } from "@/lib/run/executor";
import { scriptedProvider } from "@/lib/run/scriptedProvider";

// AbortController is non-serializable and the run store is in-memory only
// (SPEC §4.4 / §7), so we keep the controller in a module ref, not in state.
let abortController: AbortController | null = null;

type RunState = {
  runStatus: RunStatus;
  nodeStatus: Record<string, NodeStatus>;
  nodeOutput: Record<string, string>;
  nodeError: Record<string, string>;
  events: NodeEvent[];
  hasRun: boolean;
  startRun: () => Promise<void>;
  stopRun: () => void;
  resetRun: () => void;
  applyEvent: (ev: NodeEvent) => void;
};

function omit(obj: Record<string, string>, key: string): Record<string, string> {
  if (!(key in obj)) return obj;
  const { [key]: _drop, ...rest } = obj;
  return rest;
}

export const useRunStore = create<RunState>((set, get) => ({
  runStatus: "idle",
  nodeStatus: {},
  nodeOutput: {},
  nodeError: {},
  events: [],
  hasRun: false,

  resetRun: () => {
    abortController?.abort();
    abortController = null;
    set({
      runStatus: "idle",
      nodeStatus: {},
      nodeOutput: {},
      nodeError: {},
      events: [],
    });
  },

  applyEvent: (ev) =>
    set((s) => {
      const events = [...s.events, ev];
      switch (ev.kind) {
        case "start":
          return {
            events,
            nodeStatus: { ...s.nodeStatus, [ev.nodeId]: "running" },
            nodeOutput: { ...s.nodeOutput, [ev.nodeId]: "" },
            nodeError: omit(s.nodeError, ev.nodeId),
          };
        case "token":
          return {
            events,
            nodeOutput: {
              ...s.nodeOutput,
              [ev.nodeId]: (s.nodeOutput[ev.nodeId] ?? "") + ev.text,
            },
          };
        case "complete":
          return {
            events,
            nodeStatus: { ...s.nodeStatus, [ev.nodeId]: "complete" },
            nodeOutput: { ...s.nodeOutput, [ev.nodeId]: ev.output },
          };
        case "error":
          return {
            events,
            runStatus: "error",
            nodeStatus: { ...s.nodeStatus, [ev.nodeId]: "error" },
            nodeError: { ...s.nodeError, [ev.nodeId]: ev.message },
          };
        // tool_call / tool_result are recorded in the flat log only (M2);
        // dedicated UI for them is V2.
        default:
          return { events };
      }
    }),

  startRun: async () => {
    const { nodes, edges } = useGraphStore.getState();
    get().resetRun();

    const controller = new AbortController();
    abortController = controller;
    set({ runStatus: "running", hasRun: true });

    try {
      for await (const ev of executeGraph(
        nodes,
        edges,
        scriptedProvider,
        controller.signal,
      )) {
        get().applyEvent(ev);
      }
    } catch {
      if (abortController === controller) set({ runStatus: "error" });
      return;
    }

    // Ignore a superseded run (a newer Run/Reset took over).
    if (abortController !== controller) return;
    if (controller.signal.aborted) {
      set({ runStatus: "cancelled" });
    } else {
      set((s) => (s.runStatus === "error" ? {} : { runStatus: "complete" }));
    }
  },

  stopRun: () => {
    abortController?.abort();
    set((s) => {
      const nodeStatus = { ...s.nodeStatus };
      for (const id of Object.keys(nodeStatus)) {
        if (nodeStatus[id] === "running") nodeStatus[id] = "cancelled";
      }
      return { nodeStatus, runStatus: "cancelled" };
    });
  },
}));

// Narrow per-node selectors so a streaming token update to one node only
// re-renders that node (SPEC §7).
export function useNodeRun(id: string) {
  const status = useRunStore((s) => s.nodeStatus[id] ?? "idle");
  const output = useRunStore((s) => s.nodeOutput[id] ?? "");
  const error = useRunStore((s) => s.nodeError[id]);
  return { status, output, error };
}
