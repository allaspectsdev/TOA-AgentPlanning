import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { ArrowRightFromLine } from 'lucide-react';
import type { OutputNodeData } from '@toa/shared';

import { Badge } from '../../components/badge.js';
import { NodeShell, type NodeStatus } from './NodeShell.js';

const outputTypeLabels: Record<OutputNodeData['outputType'], string> = {
  return: 'Return',
  webhook: 'Webhook',
  email: 'Email',
  store: 'Store',
  stream: 'Stream',
};

export function OutputNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as OutputNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={ArrowRightFromLine}
      label={nodeData.label}
      color="bg-rose-500"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[]}
    >
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {outputTypeLabels[nodeData.outputType]}
        </Badge>
        {nodeData.format && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {nodeData.format.toUpperCase()}
          </Badge>
        )}
      </div>
    </NodeShell>
  );
}
