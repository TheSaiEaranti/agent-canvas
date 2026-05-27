import type { NodeStatus } from "@/lib/types";

// Shows streamed output inside a node during/after a run (SPEC §8).
export default function OutputPanel({
  status,
  output,
  error,
}: {
  status: NodeStatus;
  output: string;
  error?: string;
}) {
  if (status === "idle") return null;

  if (status === "error") {
    return (
      <div className="rounded-md border border-rose-500/50 bg-rose-950/40 px-2 py-1.5 text-[11px] text-rose-200">
        {error ?? "Something went wrong."}
      </div>
    );
  }

  return (
    <div className="max-h-40 overflow-auto rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5">
      <pre className="whitespace-pre-wrap break-words font-sans text-[11px] leading-snug text-slate-200">
        {output}
        {status === "running" && (
          <span className="cursor-blink ml-0.5 text-sky-400">▋</span>
        )}
      </pre>
    </div>
  );
}
