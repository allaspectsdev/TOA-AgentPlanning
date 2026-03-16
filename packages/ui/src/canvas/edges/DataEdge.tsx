import * as React from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

import { cn } from '../../lib/utils.js';

interface DataEdgeData {
  label?: string;
  dataTransform?: string;
  animated?: boolean;
}

/**
 * Custom React Flow edge for data connections.
 * Renders a smooth bezier curve with an optional label.
 * Animates with a dashed stroke when the `animated` data flag is set.
 */
export function DataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as DataEdgeData | undefined;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAnimated = edgeData?.animated ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={cn(
          'stroke-border stroke-[2px] transition-colors',
          selected && 'stroke-primary',
          isAnimated && 'animate-pulse',
        )}
        style={
          isAnimated
            ? {
                strokeDasharray: '8 4',
                animation: 'dashmove 0.5s linear infinite',
              }
            : undefined
        }
      />
      {edgeData?.label && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 12}
          width={80}
          height={24}
          requiredExtensions="http://www.w3.org/1999/xhtml"
          className="pointer-events-none overflow-visible"
        >
          <div className="flex items-center justify-center">
            <span
              className={cn(
                'rounded-full bg-background border border-border px-2 py-0.5 text-[10px] text-muted-foreground whitespace-nowrap',
                selected && 'border-primary text-primary',
              )}
            >
              {edgeData.label}
            </span>
          </div>
        </foreignObject>
      )}
      {/* Inline keyframes for dash animation */}
      {isAnimated && (
        <style>{`
          @keyframes dashmove {
            from { stroke-dashoffset: 12; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      )}
    </>
  );
}
