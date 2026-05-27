import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { AppNode, AppEdge, NodeType, NodeData } from "@/lib/types";
import { demoNodes, demoEdges } from "@/lib/demoFlow";
import { defaultNodeData } from "@/lib/defaults";
import { genId } from "@/lib/utils";

type GraphState = {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  resetToDemo: () => void;
  importGraph: (data: unknown) => boolean;
};

function isValidGraph(
  data: unknown,
): data is { nodes: AppNode[]; edges: AppEdge[] } {
  if (!data || typeof data !== "object") return false;
  const { nodes, edges } = data as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return false;
  const validNodes = nodes.every(
    (n) =>
      n &&
      typeof n.id === "string" &&
      typeof n.type === "string" &&
      n.position &&
      typeof n.position.x === "number" &&
      typeof n.position.y === "number" &&
      typeof n.data === "object",
  );
  const validEdges = edges.every(
    (e) => e && typeof e.source === "string" && typeof e.target === "string",
  );
  return validNodes && validEdges;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      nodes: demoNodes,
      edges: demoEdges,

      onNodesChange: (changes) =>
        set({ nodes: applyNodeChanges(changes, get().nodes) }),

      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges) }),

      onConnect: (connection) =>
        set({
          edges: addEdge<AppEdge>(
            { ...connection, type: "data" },
            get().edges,
          ),
        }),

      addNode: (type, position) => {
        const node = {
          id: genId(type),
          type,
          position,
          data: defaultNodeData(type),
        } as AppNode;
        set({ nodes: [...get().nodes, node] });
      },

      updateNodeData: (id, patch) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id
              ? ({ ...n, data: { ...n.data, ...patch } } as AppNode)
              : n,
          ),
        }),

      resetToDemo: () => set({ nodes: demoNodes, edges: demoEdges }),

      importGraph: (data) => {
        if (!isValidGraph(data)) return false;
        set({ nodes: data.nodes, edges: data.edges });
        return true;
      },
    }),
    {
      name: "agent-canvas-graph",
      // Persist graph state only (SPEC §4.4). Execution state lives elsewhere.
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      // Rehydrate manually after mount to avoid SSR hydration mismatch.
      skipHydration: true,
    },
  ),
);
