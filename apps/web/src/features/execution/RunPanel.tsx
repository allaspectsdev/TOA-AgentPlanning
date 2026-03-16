'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Pause,
} from 'lucide-react';
import { useExecution } from '@/hooks/use-execution';

interface RunPanelProps {
  projectId: string;
  workflowId: string;
  executionId: string | null;
}

export function RunPanel({
  projectId,
  workflowId,
  executionId,
}: RunPanelProps) {
  const {
    status,
    steps,
    isRunning,
    isPaused,
    isTerminal,
    hasPendingGates,
    pendingGates,
    approveGate,
    rejectGate,
    reset,
  } = useExecution(executionId);

  const [isStarting, setIsStarting] = useState(false);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${API_URL}/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ input: {} }),
      });

      if (!res.ok) {
        throw new Error('Failed to start execution');
      }

      // The execution store will pick up events via WebSocket
    } catch (err) {
      console.error('Failed to start execution:', err);
    } finally {
      setIsStarting(false);
    }
  }, [workflowId]);

  const completedSteps = Object.values(steps).filter(
    (s) => s.status === 'completed',
  ).length;
  const totalSteps = Object.values(steps).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Execution</h3>
        {status && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
              status === 'completed'
                ? 'bg-green-500/15 text-green-400'
                : status === 'running'
                  ? 'bg-blue-500/15 text-blue-400'
                  : status === 'failed'
                    ? 'bg-red-500/15 text-red-400'
                    : status === 'paused'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-secondary text-muted-foreground'
            }`}
          >
            {status === 'running' && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {status === 'completed' && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {status === 'failed' && <XCircle className="h-3 w-3" />}
            {status === 'paused' && <Pause className="h-3 w-3" />}
            {status}
          </span>
        )}
      </div>

      {/* Progress */}
      {totalSteps > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>
              {completedSteps} / {totalSteps} steps
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{
                width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Pending gates */}
      {hasPendingGates && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-amber-400">
            Pending Approvals
          </h4>
          {pendingGates.map((gate) => (
            <div
              key={gate.id}
              className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2"
            >
              <p className="mb-2 text-xs text-muted-foreground">
                {gate.gateType} - {gate.nodeId}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => approveGate(gate.id)}
                  className="inline-flex h-6 items-center gap-1 rounded bg-green-600 px-2 text-[10px] font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </button>
                <button
                  onClick={() => rejectGate(gate.id)}
                  className="inline-flex h-6 items-center gap-1 rounded bg-red-600 px-2 text-[10px] font-medium text-white hover:bg-red-700"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isRunning && !isPaused && (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-green-600 text-xs font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
          >
            {isStarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Start Execution
          </button>
        )}

        {(isRunning || isPaused) && (
          <button
            onClick={reset}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground shadow-sm hover:bg-accent"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        )}
      </div>

      {/* Link to full runs page */}
      <Link
        href={`/projects/${projectId}/workflows/${workflowId}/runs`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        View all runs
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
