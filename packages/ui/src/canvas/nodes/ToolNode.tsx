import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import type { ToolNodeData } from '@toa/shared';

import { Badge } from '../../components/badge';
import { NodeShell, type NodeStatus } from './NodeShell';

const toolTypeLabels: Record<ToolNodeData['toolType'], string> = {
  http_request: 'HTTP',
  code_execution: 'Code',
  file_io: 'File I/O',
  database: 'Database',
  mcp: 'MCP',
};

export function ToolNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData & { status?: NodeStatus };
  return (
    <NodeShell
      icon={Wrench}
      label={nodeData.label}
      color="bg-orange-500"
      status={nodeData.status}
      selected={selected}
      disabled={nodeData.disabled}
      inputs={[{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }]}
      outputs={[{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }]}
    >
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {toolTypeLabels[nodeData.toolType]}
      </Badge>
      {nodeData.toolType === 'http_request' && nodeData.httpConfig && (
        <div className="truncate text-muted-foreground/80 font-mono">
          {nodeData.httpConfig.method} {nodeData.httpConfig.url}
        </div>
      )}
      {nodeData.toolType === 'code_execution' && nodeData.codeConfig && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {nodeData.codeConfig.language}
        </Badge>
      )}
      {nodeData.toolType === 'mcp' && nodeData.mcpConfig && (
        <div className="truncate text-muted-foreground/80">
          {nodeData.mcpConfig.toolName}
        </div>
      )}
    </NodeShell>
  );
}
