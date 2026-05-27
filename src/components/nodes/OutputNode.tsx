import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { OutputNodeT } from "@/lib/types";
import { useNodeRun } from "@/store/runStore";
import NodeShell from "./NodeShell";

export default function OutputNode({ id, data, selected }: NodeProps<OutputNodeT>) {
  const { status, output, error } = useNodeRun(id);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <NodeShell
      title={data.label}
      icon="▣"
      accent="bg-emerald-500/20 text-emerald-200"
      status={status}
      selected={selected}
      withSource={false}
    >
      {status === "idle" && (
        <div className="flex min-h-16 items-center justify-center rounded-md border border-dashed border-slate-600 bg-slate-900/50 p-3 text-center text-[11px] text-slate-500">
          Final result appears here when the flow runs.
        </div>
      )}

      {status === "error" && (
        <div className="rounded-md border border-rose-500/50 bg-rose-950/40 px-2 py-1.5 text-[11px] text-rose-200">
          {error ?? "Upstream node failed."}
        </div>
      )}

      {status !== "idle" && status !== "error" && (
        <div className="space-y-2">
          <div className="max-h-44 overflow-auto rounded-md border border-emerald-700/40 bg-slate-950/60 px-2 py-1.5">
            <pre className="whitespace-pre-wrap break-words font-sans text-[11px] leading-snug text-slate-100">
              {output}
              {status === "running" && (
                <span className="cursor-blink ml-0.5 text-emerald-400">▋</span>
              )}
            </pre>
          </div>
          {status === "complete" && (
            <button
              onClick={copy}
              className="nodrag w-full rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-200 transition-colors hover:border-emerald-400 hover:text-white"
            >
              {copied ? "Copied ✓" : "Copy result"}
            </button>
          )}
        </div>
      )}
    </NodeShell>
  );
}
