import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

// V1 data edge. Visual hook for M2 (animate on data flow) lives here later.
export default function DataEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={{ stroke: "#64748b", strokeWidth: 2 }}
    />
  );
}
