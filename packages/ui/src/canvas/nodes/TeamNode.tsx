import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Users } from 'lucide-react';
import type { TeamNodeData } from '@toa/shared';

import { Badge } from '../../components/badge';
import { NodeShell, type NodeStatus } from './NodeShell';

const patternLabels: Record<TeamNodeData['pattern'], string> = {
  sequential: 'Sequential',
  parallel: 'Parallel',
  supervisor: 'Supervisor',
  debate: 'Debate',
  round_robin: 'Round Robin',
  custom: 'Custom',
};

export function TeamNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TeamNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={Users}
      label={nodeData.label}
      color="#6366f1"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }]}
    >
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {patternLabels[nodeData.pattern]}
      </Badge>
      <div className="text-muted-foreground">
        {nodeData.agents.length} agent{nodeData.agents.length !== 1 ? 's' : ''}
      </div>
    </NodeShell>
  );
}
