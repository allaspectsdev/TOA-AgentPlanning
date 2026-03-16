import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { TriggerNodeData } from '@toa/shared';

import { Badge } from '../../components/badge.js';
import { NodeShell, type NodeStatus } from './NodeShell.js';

const triggerTypeLabels: Record<TriggerNodeData['triggerType'], string> = {
  manual: 'Manual',
  webhook: 'Webhook',
  schedule: 'Schedule',
  event: 'Event',
};

export function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={Zap}
      label={nodeData.label}
      color="bg-green-500"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[]}
      outputs={[{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }]}
    >
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {triggerTypeLabels[nodeData.triggerType]}
      </Badge>
      {nodeData.triggerType === 'schedule' && nodeData.scheduleConfig && (
        <div className="text-muted-foreground/80 font-mono">
          {nodeData.scheduleConfig.cron}
        </div>
      )}
      {nodeData.triggerType === 'webhook' && nodeData.webhookConfig && (
        <div className="truncate text-muted-foreground/80 font-mono">
          {nodeData.webhookConfig.method} {nodeData.webhookConfig.path}
        </div>
      )}
      {nodeData.triggerType === 'event' && nodeData.eventConfig && (
        <div className="truncate text-muted-foreground/80">
          {nodeData.eventConfig.eventName}
        </div>
      )}
    </NodeShell>
  );
}
