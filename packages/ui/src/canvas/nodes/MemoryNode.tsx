import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';
import type { MemoryNodeData } from '@toa/shared';

import { Badge } from '../../components/badge.js';
import { NodeShell, type NodeStatus } from './NodeShell.js';

const memoryTypeLabels: Record<MemoryNodeData['memoryType'], string> = {
  conversation_buffer: 'Conversation',
  summary: 'Summary',
  vector_store: 'Vector Store',
  key_value: 'Key/Value',
};

const operationLabels: Record<MemoryNodeData['operation'], string> = {
  read: 'Read',
  write: 'Write',
  search: 'Search',
  clear: 'Clear',
};

export function MemoryNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as MemoryNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={Database}
      label={nodeData.label}
      color="bg-teal-500"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }]}
    >
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {memoryTypeLabels[nodeData.memoryType]}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {operationLabels[nodeData.operation]}
        </Badge>
      </div>
      {nodeData.namespace && (
        <div className="truncate text-muted-foreground/80 font-mono">
          ns: {nodeData.namespace}
        </div>
      )}
    </NodeShell>
  );
}
