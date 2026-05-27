import { Handle, Position } from "@xyflow/react";
import type { NodeStatus } from "@/lib/types";

type NodeShellProps = {
  title: string;
  accent: string; // tailwind color classes for the title bar
  icon: string;
  status?: NodeStatus;
  selected?: boolean;
  withTarget?: boolean;
  withSource?: boolean;
  children: React.ReactNode;
};

const handleClass =
  "!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-300 hover:!bg-white";

const STATUS_RING: Record<NodeStatus, string> = {
  idle: "border-slate-700",
  running: "border-sky-400 node-glow-running",
  complete: "border-emerald-400/70",
  error: "border-rose-400/80 node-glow-error",
  cancelled: "border-slate-500 border-dashed",
};

function StatusDot({ status }: { status: NodeStatus }) {
  if (status === "idle") return null;
  const map: Record<NodeStatus, { cls: string; glyph: string }> = {
    idle: { cls: "", glyph: "" },
    running: { cls: "bg-sky-400 animate-pulse", glyph: "" },
    complete: { cls: "bg-emerald-400 text-slate-900", glyph: "✓" },
    error: { cls: "bg-rose-400 text-slate-900", glyph: "✕" },
    cancelled: { cls: "bg-slate-400 text-slate-900", glyph: "⦸" },
  };
  const { cls, glyph } = map[status];
  return (
    <span
      className={`ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${cls}`}
    >
      {glyph}
    </span>
  );
}

export default function NodeShell({
  title,
  accent,
  icon,
  status = "idle",
  selected,
  withTarget = true,
  withSource = true,
  children,
}: NodeShellProps) {
  const ring =
    status === "idle"
      ? selected
        ? "border-sky-400"
        : "border-slate-700"
      : STATUS_RING[status];

  return (
    <div
      className={`w-64 overflow-hidden rounded-xl border bg-slate-800/90 shadow-lg shadow-black/40 backdrop-blur transition-shadow ${ring}`}
    >
      {withTarget && (
        <Handle type="target" position={Position.Left} className={handleClass} />
      )}

      <div
        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold ${accent}`}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="truncate">{title}</span>
        <StatusDot status={status} />
      </div>

      <div className="space-y-2 px-3 py-3 text-xs text-slate-200">
        {children}
      </div>

      {withSource && (
        <Handle
          type="source"
          position={Position.Right}
          className={handleClass}
        />
      )}
    </div>
  );
}

export const fieldLabelClass =
  "block text-[10px] font-medium uppercase tracking-wide text-slate-400";
export const inputClass =
  "nodrag w-full rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-400";
