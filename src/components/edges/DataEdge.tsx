import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { useRunStore } from "@/store/runStore";

// V1 data edge with run-aware styling (SPEC §8):
//  - data flowing in (target running): bright sky stroke + traveling dot
//  - done (both ends complete): solid emerald
//  - otherwise: idle gray
export default function DataEdge({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const sourceStatus = useRunStore((s) => s.nodeStatus[source] ?? "idle");
  const targetStatus = useRunStore((s) => s.nodeStatus[target] ?? "idle");

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const flowing = sourceStatus === "complete" && targetStatus === "running";
  const done = sourceStatus === "complete" && targetStatus === "complete";
  const stroke = flowing ? "#38bdf8" : done ? "#34d399" : "#64748b";

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ stroke, strokeWidth: flowing ? 2.5 : 2 }}
      />
      {flowing && (
        <circle
          r={4.5}
          fill="#7dd3fc"
          style={{ filter: "drop-shadow(0 0 5px #38bdf8)" }}
        >
          <animateMotion dur="1s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </>
  );
}
