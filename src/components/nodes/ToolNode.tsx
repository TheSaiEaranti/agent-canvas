import type { NodeProps } from "@xyflow/react";
import type { ToolNodeT, ToolName } from "@/lib/types";
import { useGraphStore } from "@/store/graphStore";
import NodeShell, { fieldLabelClass, inputClass } from "./NodeShell";

const TOOLS: { value: ToolName; label: string; hint: string }[] = [
  { value: "web_search", label: "Web Search (Tavily)", hint: "query" },
  { value: "url_fetch", label: "URL Fetch", hint: "url" },
];

export default function ToolNode({ id, data, selected }: NodeProps<ToolNodeT>) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const active = TOOLS.find((t) => t.value === data.tool) ?? TOOLS[0];

  return (
    <NodeShell
      title={data.label}
      icon="⚙"
      accent="bg-amber-500/20 text-amber-200"
      selected={selected}
    >
      <label className={fieldLabelClass}>Tool</label>
      <select
        className={inputClass}
        value={data.tool}
        onChange={(e) =>
          updateNodeData(id, { tool: e.target.value as ToolName })
        }
      >
        {TOOLS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <label className={fieldLabelClass}>Input ({active.hint})</label>
      <input
        className={inputClass}
        value={data.inputOverride ?? ""}
        onChange={(e) => updateNodeData(id, { inputOverride: e.target.value })}
        placeholder="Defaults to upstream output ({{input}})"
      />
    </NodeShell>
  );
}
