export { NodeShell, type NodeShellProps, type NodeStatus } from './NodeShell';
export { AgentNode } from './AgentNode';
export { TeamNode } from './TeamNode';
export { TriggerNode } from './TriggerNode';
export { GateNode } from './GateNode';
export { ConditionNode } from './ConditionNode';
export { ToolNode } from './ToolNode';
export { MemoryNode } from './MemoryNode';
export { OutputNode } from './OutputNode';
export { SubflowNode } from './SubflowNode';
export { NoteNode } from './NoteNode';

import { AgentNode } from './AgentNode';
import { TeamNode } from './TeamNode';
import { TriggerNode } from './TriggerNode';
import { GateNode } from './GateNode';
import { ConditionNode } from './ConditionNode';
import { ToolNode } from './ToolNode';
import { MemoryNode } from './MemoryNode';
import { OutputNode } from './OutputNode';
import { SubflowNode } from './SubflowNode';
import { NoteNode } from './NoteNode';

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
