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
};

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
