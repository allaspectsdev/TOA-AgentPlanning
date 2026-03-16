import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import type { ConditionNodeData } from '@toa/shared';

import { Badge } from '../../components/badge';
import { NodeShell, type NodeStatus } from './NodeShell';

const conditionTypeLabels: Record<ConditionNodeData['conditionType'], string> = {
  if_else: 'If/Else',
  switch: 'Switch',
  llm_router: 'LLM Router',
};

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionNodeData & { status?: NodeStatus };
  const branchCount =
    nodeData.conditionType === 'llm_router'
      ? nodeData.llmRouterConfig?.options.length ?? 0
      : nodeData.conditions?.length ?? 0;

  // Build output ports from conditions
  const outputs =
    nodeData.conditionType === 'if_else'
      ? [
          { id: 'true', type: 'output' as const, label: 'True', dataType: 'any' as const },
          { id: 'false', type: 'output' as const, label: 'False', dataType: 'any' as const },
        ]
      : (nodeData.conditions ?? []).map((c) => ({
          id: c.outputPortId,
          type: 'output' as const,
          label: c.label,
          dataType: 'any' as const,
        }));

  return (
    <NodeShell
      icon={GitBranch}
      label={nodeData.label}
      color="#0ea5e9"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={outputs}
    >
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {conditionTypeLabels[nodeData.conditionType]}
      </Badge>
      <div className="text-muted-foreground">
        {branchCount} branch{branchCount !== 1 ? 'es' : ''}
      </div>
    </NodeShell>
  );
}
