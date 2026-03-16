import * as React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { NoteNodeData } from '@toa/shared';

import { cn } from '../../lib/utils';

/**
 * Color map from the note's `color` field to tailwind background classes.
 * Falls back to yellow if the color is not recognized.
 */
const noteColorMap: Record<string, string> = {
  yellow: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700',
  blue: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
  green: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
  pink: 'bg-pink-100 dark:bg-pink-900/40 border-pink-300 dark:border-pink-700',
  purple: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
  orange: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700',
  gray: 'bg-gray-100 dark:bg-gray-800/40 border-gray-300 dark:border-gray-600',
};

const defaultNoteColor =
  'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700';

/**
 * Note node renders as a simple colored sticky note.
 * No ports/handles — it is purely for annotation.
 */
export function NoteNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NoteNodeData;
  const colorClasses = noteColorMap[nodeData.color] ?? defaultNoteColor;

  return (
    <div
      className={cn(
        'min-w-[160px] max-w-[300px] rounded-md border p-3 shadow-sm',
        colorClasses,
        selected && 'ring-2 ring-primary/40 shadow-md',
      )}
    >
      {nodeData.label && (
        <div className="mb-1 text-sm font-semibold text-foreground/90">
          {nodeData.label}
        </div>
      )}
      <div className="whitespace-pre-wrap text-xs text-foreground/75 leading-relaxed">
        {nodeData.content}
      </div>
    </div>
  );
}
