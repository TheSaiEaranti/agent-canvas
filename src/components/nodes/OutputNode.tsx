import type { NodeProps } from "@xyflow/react";
import type { OutputNodeT } from "@/lib/types";
import NodeShell from "./NodeShell";

export default function OutputNode({ data, selected }: NodeProps<OutputNodeT>) {
  return (
    <NodeShell
      title={data.label}
      icon="▣"
      accent="bg-emerald-500/20 text-emerald-200"
      selected={selected}
      withSource={false}
    >
      <div className="flex min-h-16 items-center justify-center rounded-md border border-dashed border-slate-600 bg-slate-900/50 p-3 text-center text-[11px] text-slate-500">
        Final result appears here when the flow runs.
      </div>
    </NodeShell>
  );
}
