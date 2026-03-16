export { NodeShell, type NodeShellProps, type NodeStatus } from './NodeShell.js';
export { AgentNode } from './AgentNode.js';
export { TeamNode } from './TeamNode.js';
export { TriggerNode } from './TriggerNode.js';
export { GateNode } from './GateNode.js';
export { ConditionNode } from './ConditionNode.js';
export { ToolNode } from './ToolNode.js';
export { MemoryNode } from './MemoryNode.js';
export { OutputNode } from './OutputNode.js';
export { SubflowNode } from './SubflowNode.js';
export { NoteNode } from './NoteNode.js';

import { AgentNode } from './AgentNode.js';
import { TeamNode } from './TeamNode.js';
import { TriggerNode } from './TriggerNode.js';
import { GateNode } from './GateNode.js';
import { ConditionNode } from './ConditionNode.js';
import { ToolNode } from './ToolNode.js';
import { MemoryNode } from './MemoryNode.js';
import { OutputNode } from './OutputNode.js';
import { SubflowNode } from './SubflowNode.js';
import { NoteNode } from './NoteNode.js';

/**
 * Map of all custom node types for React Flow's `nodeTypes` prop.
 * Pass this directly to `<ReactFlow nodeTypes={nodeTypes} />`.
 */
export const nodeTypes = {
  agent: AgentNode,
  team: TeamNode,
  trigger: TriggerNode,
  gate: GateNode,
  condition: ConditionNode,
  tool: ToolNode,
  memory: MemoryNode,
  output: OutputNode,
  subflow: SubflowNode,
  note: NoteNode,
} as const;
