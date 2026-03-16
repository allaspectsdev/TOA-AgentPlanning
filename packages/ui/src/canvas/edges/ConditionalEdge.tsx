import * as React from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

import { cn } from '../../lib/utils.js';

interface ConditionalEdgeData {
  conditionId: string;
  label: string;
  animated?: boolean;
}

/**
 * Custom React Flow edge for conditional connections.
 * Shows a small condition label badge on the edge path.
 */
export function ConditionalEdge({
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
  const edgeData = data as ConditionalEdgeData | undefined;
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
          'stroke-sky-400 stroke-[2px] transition-colors',
          selected && 'stroke-sky-600',
        )}
        style={
          isAnimated
            ? {
                strokeDasharray: '8 4',
                animation: 'conddashmove 0.5s linear infinite',
              }
            : {
                strokeDasharray: '6 3',
              }
        }
      />
      {edgeData?.label && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 14}
          width={100}
          height={28}
          requiredExtensions="http://www.w3.org/1999/xhtml"
          className="pointer-events-none overflow-visible"
        >
          <div className="flex items-center justify-center">
            <span
              className={cn(
                'rounded-md bg-sky-50 dark:bg-sky-950 border border-sky-300 dark:border-sky-700 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300 whitespace-nowrap shadow-sm',
                selected && 'border-sky-500 text-sky-800 dark:text-sky-200',
              )}
            >
              {edgeData.label}
            </span>
          </div>
        </foreignObject>
      )}
      {isAnimated && (
        <style>{`
          @keyframes conddashmove {
            from { stroke-dashoffset: 12; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      )}
    </>
  );
}
