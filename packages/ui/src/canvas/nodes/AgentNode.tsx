import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Brain } from 'lucide-react';
import type { AgentNodeData } from '@toa/shared';
import { getModelById } from '@toa/shared';

import { Badge } from '../../components/badge';
import { NodeShell, type NodeStatus } from './NodeShell';

export function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData & { status?: NodeStatus };
  const model = getModelById(nodeData.model);
  const modelName = model?.name ?? nodeData.model;

  return (
    <NodeShell
      icon={Brain}
      label={nodeData.label}
      color="bg-violet-500"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }]}
    >
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {modelName}
      </Badge>
      {nodeData.systemPrompt && (
        <p className="line-clamp-2 leading-relaxed text-muted-foreground/80">
          {nodeData.systemPrompt}
        </p>
      )}
      {nodeData.tools.length > 0 && (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {nodeData.tools.length} tool{nodeData.tools.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}
    </NodeShell>
  );
}
