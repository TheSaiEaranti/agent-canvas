"use client";

import type { NodeType } from "@/lib/types";

export const DND_MIME = "application/agent-canvas-node";

const ITEMS: { type: NodeType; label: string; icon: string; accent: string }[] =
  [
    { type: "prompt", label: "Prompt", icon: "✦", accent: "text-indigo-300" },
    { type: "tool", label: "Tool call", icon: "⚙", accent: "text-amber-300" },
    { type: "output", label: "Output", icon: "▣", accent: "text-emerald-300" },
  ];

export default function Palette() {
  return (
    <aside className="absolute left-4 top-20 z-10 w-44 rounded-xl border border-slate-700 bg-slate-800/90 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Node palette
      </div>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DND_MIME, item.type);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 transition-colors hover:border-sky-400 active:cursor-grabbing"
          >
            <span className={`text-base ${item.accent}`}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-tight text-slate-500">
        Drag a node onto the canvas, then connect the dots.
      </p>
    </aside>
  );
}
