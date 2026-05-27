"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  BackgroundVariant,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useGraphStore } from "@/store/graphStore";
import { nodeTypes } from "@/components/nodes";
import { edgeTypes } from "@/components/edges";
import { DND_MIME } from "@/components/Palette";
import type { NodeType } from "@/lib/types";

const defaultEdgeOptions: DefaultEdgeOptions = { type: "data" };

export default function Canvas() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DND_MIME) as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      colorMode="dark"
      fitView
      fitViewOptions={{
        padding: { top: "110px", left: "230px", right: "48px", bottom: "60px" },
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls />
      <MiniMap pannable zoomable className="!bg-slate-800" />
    </ReactFlow>
  );
}
