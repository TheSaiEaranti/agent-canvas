import type { NodeProps } from "@xyflow/react";
import type { PromptNodeT } from "@/lib/types";
import { useGraphStore } from "@/store/graphStore";
import { useNodeRun } from "@/store/runStore";
import NodeShell, { fieldLabelClass, inputClass } from "./NodeShell";
import OutputPanel from "./OutputPanel";

const MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5-20251001",
  "gpt-4o",
  "gpt-4o-mini",
];

export default function PromptNode({ id, data, selected }: NodeProps<PromptNodeT>) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const { status, output, error } = useNodeRun(id);

  return (
    <NodeShell
      title={data.label}
      icon="✦"
      accent="bg-indigo-500/20 text-indigo-200"
      status={status}
      selected={selected}
    >
      <label className={fieldLabelClass}>Prompt</label>
      <textarea
        className={`${inputClass} h-20 resize-none`}
        value={data.prompt}
        onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
        placeholder="Prompt text… use {{input}} for upstream output"
      />

      <label className={fieldLabelClass}>Model</label>
      <select
        className={inputClass}
        value={data.model}
        onChange={(e) => updateNodeData(id, { model: e.target.value })}
      >
        {MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={fieldLabelClass}>Temp</label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            className={inputClass}
            value={data.temperature}
            onChange={(e) =>
              updateNodeData(id, { temperature: Number(e.target.value) })
            }
          />
        </div>
        <div className="flex-1">
          <label className={fieldLabelClass}>Max tokens</label>
          <input
            type="number"
            min={1}
            step={64}
            className={inputClass}
            value={data.maxTokens}
            onChange={(e) =>
              updateNodeData(id, { maxTokens: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <OutputPanel status={status} output={output} error={error} />
    </NodeShell>
  );
}
