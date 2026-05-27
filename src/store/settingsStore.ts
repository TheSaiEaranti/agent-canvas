import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RunMode = "demo" | "live";
export type KeyName = "anthropicKey" | "openaiKey" | "tavilyKey";

type SettingsState = {
  mode: RunMode;
  anthropicKey: string;
  openaiKey: string;
  tavilyKey: string;
  setMode: (mode: RunMode) => void;
  setKey: (name: KeyName, value: string) => void;
  clearKeys: () => void;
};

// BYO keys live only in the user's browser (localStorage) and are sent
// per-request to the proxy, never stored server-side (SPEC §6).
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mode: "demo",
      anthropicKey: "",
      openaiKey: "",
      tavilyKey: "",
      setMode: (mode) => set({ mode }),
      setKey: (name, value) => set({ [name]: value } as Partial<SettingsState>),
      clearKeys: () => set({ anthropicKey: "", openaiKey: "", tavilyKey: "" }),
    }),
    {
      name: "agent-canvas-settings",
      skipHydration: true,
    },
  ),
);
