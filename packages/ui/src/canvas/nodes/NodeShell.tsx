import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { Port } from '@toa/shared';

import { cn } from '../../lib/utils';

export type NodeStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting'
  | undefined;

export interface NodeShellProps {
  /** Lucide icon component rendered in the header. */
  icon: LucideIcon;
  /** Display label for the node. */
  label: string;
  /** Hex color for the left accent border and icon background. */
  color: string;
  /** Current execution status of this node. */
  status?: NodeStatus;
  /** Whether this node is currently selected on the canvas. */
  selected?: boolean;
  /** Whether this node is disabled (greyed out, no execution). */
  disabled?: boolean;
  /** Body content rendered below the header. */
  children?: React.ReactNode;
  /** Input ports — rendered as Handle components on the left side. */
  inputs?: Port[];
  /** Output ports — rendered as Handle components on the right side. */
  outputs?: Port[];
}

const statusColorMap: Record<NonNullable<NodeStatus>, string> = {
  idle: 'bg-gray-400',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  waiting: 'bg-amber-500',
};

/**
 * Common wrapper shell for all canvas node types.
 * Renders the colored left border, header with icon/label/status,
 * input/output handles, and a body area for type-specific content.
 */
export function NodeShell({
  icon: Icon,
  label,
  color,
  status,
  selected = false,
  disabled = false,
  children,
  inputs = [],
  outputs = [],
}: NodeShellProps) {
  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[280px] rounded-lg border border-border shadow-md',
        'border-l-4 transition-all duration-150',
        selected && 'shadow-lg shadow-primary/20 ring-2 ring-primary/40',
        disabled && 'opacity-50 pointer-events-none',
      )}
      style={{
        backgroundColor: 'var(--color-card, #0a0a0c)',
        color: 'var(--color-card-foreground, #fafafa)',
        borderLeftColor: color,
      }}
    >
      {/* Input Handles */}
      {inputs.map((port, index) => {
        const topPercent =
          inputs.length === 1
            ? 50
            : 20 + (60 / (inputs.length - 1)) * index;
        return (
          <Handle
            key={port.id}
            id={port.id}
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !rounded-full !border-2 !border-background"
            style={{ top: `${topPercent}%`, backgroundColor: color }}
            title={port.label}
          />
        );
      })}

      {/* Output Handles */}
      {outputs.map((port, index) => {
        const topPercent =
          outputs.length === 1
            ? 50
            : 20 + (60 / (outputs.length - 1)) * index;
        return (
          <Handle
            key={port.id}
            id={port.id}
            type="source"
            position={Position.Right}
            className="!w-3 !h-3 !rounded-full !border-2 !border-background"
            style={{ top: `${topPercent}%`, backgroundColor: color }}
            title={port.label}
          />
        );
      })}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <div
          className="rounded-md p-1 text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
        {status && (
          <div className="flex items-center" title={status}>
            {status === 'running' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
            ) : (
              <span
                className={cn(
                  'inline-block h-2.5 w-2.5 rounded-full',
                  statusColorMap[status],
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 py-2 text-xs text-muted-foreground space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}
