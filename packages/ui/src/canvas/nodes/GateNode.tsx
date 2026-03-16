import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { ShieldCheck } from 'lucide-react';
import type { GateNodeData } from '@toa/shared';

import { Badge } from '../../components/badge.js';
import { NodeShell, type NodeStatus } from './NodeShell.js';

const gateTypeLabels: Record<GateNodeData['gateType'], string> = {
  approval: 'Approval',
  review: 'Review',
  input: 'Input',
  escalation: 'Escalation',
};

export function GateNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as GateNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={ShieldCheck}
      label={nodeData.label}
      color="bg-amber-500"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[
        { id: 'approved', type: 'output', label: 'Approved', dataType: 'any' },
        { id: 'rejected', type: 'output', label: 'Rejected', dataType: 'any' },
      ]}
    >
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {gateTypeLabels[nodeData.gateType]}
      </Badge>
      <div className="text-muted-foreground">
        Timeout: {nodeData.timeoutMinutes}m
      </div>
      {nodeData.assignees && nodeData.assignees.length > 0 && (
        <div className="text-muted-foreground">
          {nodeData.assignees.length} assignee{nodeData.assignees.length !== 1 ? 's' : ''}
        </div>
      )}
    </NodeShell>
  );
}
