import type { NodeTypes } from "@xyflow/react";
import PromptNode from "./PromptNode";
import ToolNode from "./ToolNode";
import OutputNode from "./OutputNode";

export const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  tool: ToolNode,
  output: OutputNode,
};
