'use client';

import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  Undo2,
  Redo2,
  Save,
  Play,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  Loader2,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { useCanvas } from '@/hooks/use-canvas';

interface CanvasToolbarProps {
  workflowName?: string;
  projectId: string;
  workflowId: string;
  isSaving?: boolean;
  onSave?: () => void;
  onRun?: () => void;
}

export function CanvasToolbar({
  workflowName = 'Untitled Workflow',
  projectId,
  workflowId,
  isSaving = false,
  onSave,
  onRun,
}: CanvasToolbarProps) {
  const { undo, redo, canUndo, canRedo, isDirty, validate, zoomToFit } =
    useCanvas();
  const reactFlowInstance = useReactFlow();

  const [validationMsg, setValidationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  const handleValidate = useCallback(() => {
    const errors = validate();
    if (errors.length === 0) {
      setValidationMsg({ type: 'success', text: 'Workflow is valid' });
    } else {
      setValidationMsg({ type: 'error', text: `${errors.length} issue${errors.length > 1 ? 's' : ''} found` });
    }
    setTimeout(() => setValidationMsg(null), 3000);
  }, [validate]);

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-background px-3">
      {/* Left: Workflow name */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {workflowName}
        </h2>
        {isDirty && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            Unsaved
          </span>
        )}
      </div>

      {/* Center: Tools */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Zoom controls */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={zoomToFit}
          title="Fit to View"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Validate */}
        <button
          onClick={handleValidate}
          title="Validate Workflow"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <AlertCircle className="h-4 w-4" />
        </button>

        {/* Validation message badge */}
        {validationMsg && (
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              validationMsg.type === 'success'
                ? 'bg-green-500/15 text-green-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {validationMsg.text}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Runs history link */}
        <Link
          href={`/projects/${projectId}/workflows/${workflowId}/runs`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Execution History"
        >
          <History className="h-4 w-4" />
        </Link>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-40"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>

        {/* Run button */}
        <button
          onClick={onRun}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white shadow transition-colors hover:bg-green-700"
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      </div>
    </div>
  );
}
