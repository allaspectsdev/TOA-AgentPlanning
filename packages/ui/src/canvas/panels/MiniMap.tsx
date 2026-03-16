import * as React from 'react';
import { MiniMap as ReactFlowMiniMap } from '@xyflow/react';
import { NODE_REGISTRY, type NodeType } from '@toa/shared';

import { cn } from '../../lib/utils';

/**
 * Map from tailwind bg-* class in the node registry to a hex color
 * for the MiniMap node indicators.
 */
const colorHexMap: Record<string, string> = {
  'bg-violet-500': '#8b5cf6',
  'bg-indigo-500': '#6366f1',
  'bg-amber-500': '#f59e0b',
  'bg-orange-500': '#f97316',
  'bg-cyan-500': '#06b6d4',
  'bg-emerald-500': '#10b981',
  'bg-pink-500': '#ec4899',
  'bg-blue-500': '#3b82f6',
  'bg-teal-500': '#14b8a6',
  'bg-gray-400': '#9ca3af',
  'bg-green-500': '#22c55e',
  'bg-sky-500': '#0ea5e9',
  'bg-rose-500': '#f43f5e',
};

/**
 * Returns a hex color for a given node by looking up its type in the registry.
 */
function nodeColor(node: { type?: string }): string {
  if (!node.type) return '#6b7280';
  const entry = NODE_REGISTRY[node.type as NodeType];
  if (!entry) return '#6b7280';
  return colorHexMap[entry.color] ?? '#6b7280';
}

export interface CanvasMiniMapProps {
  className?: string;
}

/**
 * Wrapper around React Flow's MiniMap with custom dark styling
 * and colored node indicators that match the node type.
 */
export function CanvasMiniMap({ className }: CanvasMiniMapProps) {
  return (
    <ReactFlowMiniMap
      className={cn('!bg-gray-950/90 !rounded-lg !border !border-border', className)}
      nodeColor={nodeColor}
      nodeStrokeWidth={3}
      maskColor="rgba(0, 0, 0, 0.6)"
      pannable
      zoomable
    />
  );
}
