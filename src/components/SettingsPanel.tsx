"use client";

import { useSettingsStore, type RunMode } from "@/store/settingsStore";

const KEY_FIELDS: {
  name: "anthropicKey" | "openaiKey" | "tavilyKey";
  label: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    name: "anthropicKey",
    label: "Anthropic API key",
    placeholder: "sk-ant-…",
    hint: "For Claude prompt nodes",
  },
  {
    name: "openaiKey",
    label: "OpenAI API key",
    placeholder: "sk-…",
    hint: "For GPT prompt nodes",
  },
  {
    name: "tavilyKey",
    label: "Tavily API key",
    placeholder: "tvly-…",
    hint: "For the Web Search tool (URL Fetch needs no key)",
  },
];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const mode = useSettingsStore((s) => s.mode);
  const setMode = useSettingsStore((s) => s.setMode);
  const setKey = useSettingsStore((s) => s.setKey);
  const clearKeys = useSettingsStore((s) => s.clearKeys);
  const anthropicKey = useSettingsStore((s) => s.anthropicKey);
  const openaiKey = useSettingsStore((s) => s.openaiKey);
  const tavilyKey = useSettingsStore((s) => s.tavilyKey);
  const values = { anthropicKey, openaiKey, tavilyKey };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-400 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="mb-5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Run mode
          </div>
          <div className="flex rounded-lg border border-slate-700 p-1">
            {(["demo", "live"] as RunMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  mode === m
                    ? "bg-sky-500 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {m === "demo" ? "Demo (scripted)" : "Live (your keys)"}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
            {mode === "demo"
              ? "Replays recorded output — no key needed."
              : "Calls real models/tools through the proxy using the keys below."}
          </p>
        </div>

        <div className="space-y-3">
          {KEY_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {f.label}
              </label>
              <input
                type="password"
                autoComplete="off"
                value={values[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => setKey(f.name, e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
              />
              <p className="mt-0.5 text-[10px] text-slate-500">{f.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={clearKeys}
            className="text-[11px] text-slate-400 underline-offset-2 hover:text-rose-300 hover:underline"
          >
            Clear keys
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
          >
            Done
          </button>
        </div>

        <p className="mt-4 border-t border-slate-800 pt-3 text-[10px] leading-snug text-slate-500">
          🔒 Keys are stored only in this browser (localStorage) and sent
          per-request to the proxy. They are never persisted server-side.
        </p>
      </div>
    </div>
  );
}
