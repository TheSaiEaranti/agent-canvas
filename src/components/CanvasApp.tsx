"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Canvas from "./Canvas";
import Palette from "./Palette";
import { useGraphStore } from "@/store/graphStore";
import { useRunStore } from "@/store/runStore";
import type { RunStatus } from "@/lib/types";

const RUN_LABEL: Record<RunStatus, string> = {
  idle: "Ready",
  running: "Running…",
  complete: "Complete",
  error: "Error",
  cancelled: "Cancelled",
};

const RUN_PILL: Record<RunStatus, string> = {
  idle: "bg-slate-700 text-slate-300",
  running: "bg-sky-500/20 text-sky-300",
  complete: "bg-emerald-500/20 text-emerald-300",
  error: "bg-rose-500/20 text-rose-300",
  cancelled: "bg-slate-600 text-slate-300",
};

export default function CanvasApp() {
  const [mounted, setMounted] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  const resetToDemo = useGraphStore((s) => s.resetToDemo);
  const runStatus = useRunStore((s) => s.runStatus);
  const startRun = useRunStore((s) => s.startRun);
  const stopRun = useRunStore((s) => s.stopRun);
  const resetRun = useRunStore((s) => s.resetRun);

  useEffect(() => {
    void useGraphStore.persist.rehydrate();
    setMounted(true);
  }, []);

  const isRunning = runStatus === "running";

  return (
    <main
      data-run-status={runStatus}
      className="relative h-screen w-screen overflow-hidden"
    >
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <h1 className="text-sm font-semibold text-slate-100">Agent Canvas</h1>
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
            M2
          </span>
          <span
            className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${RUN_PILL[runStatus]}`}
          >
            {RUN_LABEL[runStatus]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Reset the canvas to the demo flow?")) {
                resetRun();
                resetToDemo();
              }
            }}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-sky-400 hover:text-white"
          >
            Reset to demo
          </button>

          {isRunning ? (
            <button
              data-testid="stop-button"
              onClick={stopRun}
              className="rounded-md bg-rose-500 px-4 py-1 text-xs font-semibold text-white transition-colors hover:bg-rose-400"
            >
              ■ Stop
            </button>
          ) : (
            <button
              data-testid="run-button"
              onClick={startRun}
              className={`rounded-md bg-emerald-500 px-4 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-400 ${
                runStatus === "idle" ? "run-pulse" : ""
              }`}
            >
              ▶ Run
            </button>
          )}
        </div>
      </header>

      <ReactFlowProvider>
        {mounted && (
          <>
            <Palette />
            <Canvas />
          </>
        )}
      </ReactFlowProvider>

      {mounted && runStatus === "complete" && !hintDismissed && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-800/95 px-4 py-3 text-xs text-slate-200 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <span>
              ✨ Want to build your own? Drag from the palette · Add your API key
              in Settings for real runs.
            </span>
            <button
              onClick={() => setHintDismissed(true)}
              className="rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300 hover:border-sky-400 hover:text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
