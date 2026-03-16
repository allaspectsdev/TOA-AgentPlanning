import * as React from 'react';
import {
  Bot,
  Users,
  Zap,
  ShieldCheck,
  GitBranch,
  Wrench,
  Database,
  Send,
  Workflow,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { NODE_REGISTRY, getNodesByCategory, type NodeType } from '@toa/shared';

import { cn } from '../../lib/utils';
import { ScrollArea } from '../../components/scroll-area';
import { Separator } from '../../components/separator';

/**
 * Map from the icon name string stored in NODE_REGISTRY to
 * the actual Lucide icon component.
 */
const iconMap: Record<string, LucideIcon> = {
  Bot,
  Users,
  Zap,
  ShieldCheck,
  GitBranch,
  Wrench,
  Database,
  Send,
  Workflow,
  StickyNote,
};

/** Human-readable labels for each category. */
const categoryLabels: Record<string, string> = {
  triggers: 'Triggers',
  agents: 'AI',
  logic: 'Flow Control',
  tools: 'Integration',
  memory: 'Data',
  output: 'Output',
  other: 'Annotation',
};

/** Display order for categories in the palette. */
const categoryOrder: string[] = [
  'agents',
  'logic',
  'triggers',
  'tools',
  'memory',
  'output',
  'other',
];

export interface NodePaletteProps {
  className?: string;
}

/**
 * Left sidebar panel showing draggable node types organized by category.
 * Each item shows icon + label and can be dragged onto the React Flow canvas.
 *
 * The drag event sets `application/reactflow` data with the node type
 * so the canvas drop handler can create the appropriate node.
 */
export function NodePalette({ className }: NodePaletteProps) {
  const grouped = getNodesByCategory();

  const onDragStart = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>, nodeType: NodeType) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  return (
    <div
      className={cn(
        'flex flex-col w-60 border-r border-border bg-background',
        className,
      )}
    >
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Node Palette</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Drag nodes onto the canvas
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {categoryOrder.map((category, catIdx) => {
            const types = grouped[category as keyof typeof grouped];
            if (!types || types.length === 0) return null;

            return (
              <div key={category}>
                {catIdx > 0 && <Separator className="mb-3" />}
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {categoryLabels[category] ?? category}
                </div>
                <div className="space-y-1">
                  {types.map((nodeType) => {
                    const entry = NODE_REGISTRY[nodeType];
                    const Icon = iconMap[entry.icon];

                    return (
                      <div
                        key={nodeType}
                        draggable
                        onDragStart={(e) => onDragStart(e, nodeType)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2.5 py-2 cursor-grab',
                          'hover:bg-accent/50 active:cursor-grabbing transition-colors',
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center rounded-md p-1.5',
                            entry.color,
                            'text-white',
                          )}
                        >
                          {Icon ? (
                            <Icon className="h-3.5 w-3.5" />
                          ) : (
                            <div className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {entry.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
