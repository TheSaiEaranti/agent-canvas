import { Handle, Position } from "@xyflow/react";

type NodeShellProps = {
  title: string;
  accent: string; // tailwind color classes for the title bar
  icon: string;
  selected?: boolean;
  withTarget?: boolean;
  withSource?: boolean;
  children: React.ReactNode;
};

const handleClass =
  "!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-300 hover:!bg-white";

export default function NodeShell({
  title,
  accent,
  icon,
  selected,
  withTarget = true,
  withSource = true,
  children,
}: NodeShellProps) {
  return (
    <div
      className={`w-64 overflow-hidden rounded-xl border bg-slate-800/90 shadow-lg backdrop-blur transition-shadow ${
        selected
          ? "border-sky-400 shadow-sky-500/20"
          : "border-slate-700 shadow-black/40"
      }`}
    >
      {withTarget && (
        <Handle type="target" position={Position.Left} className={handleClass} />
      )}

      <div
        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold ${accent}`}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="truncate">{title}</span>
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
