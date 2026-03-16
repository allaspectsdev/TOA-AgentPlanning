import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import type { SubflowNodeData } from '@toa/shared';

import { Badge } from '../../components/badge';
import { NodeShell, type NodeStatus } from './NodeShell';

export function SubflowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SubflowNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={Workflow}
      label={nodeData.label}
      color="#8b5cf6"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }]}
    >
      <div className="truncate text-muted-foreground">
        Workflow: <span className="font-mono">{nodeData.workflowId}</span>
      </div>
      {nodeData.versionId && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          v{nodeData.versionId}
        </Badge>
      )}
      {!nodeData.waitForCompletion && (
        <Badge variant="warning" className="text-[10px] px-1.5 py-0">
          Fire & Forget
        </Badge>
      )}
    </NodeShell>
  );
}
