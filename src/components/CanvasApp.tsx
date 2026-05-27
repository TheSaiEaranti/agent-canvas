"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Canvas from "./Canvas";
import Palette from "./Palette";
import { useGraphStore } from "@/store/graphStore";

export default function CanvasApp() {
  const [mounted, setMounted] = useState(false);
  const resetToDemo = useGraphStore((s) => s.resetToDemo);

  // Rehydrate persisted graph on the client only (store uses skipHydration).
  useEffect(() => {
    void useGraphStore.persist.rehydrate();
    setMounted(true);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <h1 className="text-sm font-semibold text-slate-100">
            Agent Canvas
          </h1>
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
            M1
          </span>
        </div>
        <button
          onClick={() => {
            if (confirm("Reset the canvas to the demo flow?")) resetToDemo();
          }}
          className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-sky-400 hover:text-white"
        >
          Reset to demo
        </button>
      </header>

      <ReactFlowProvider>
        {mounted && (
          <>
            <Palette />
            <Canvas />
          </>
        )}
      </ReactFlowProvider>
    </main>
  );
}
