'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Loader2,
  Timer,
} from 'lucide-react';
import type { ExecutionStatus } from '@toa/shared';
import { trpc } from '@/lib/trpc/react';

const STATUS_CONFIG: Record<
  ExecutionStatus,
  { icon: typeof Play; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'text-muted-foreground',
  },
  running: {
    icon: Loader2,
    label: 'Running',
    className: 'text-blue-400',
  },
  paused: {
    icon: Pause,
    label: 'Paused',
    className: 'text-amber-400',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    className: 'text-green-400',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    className: 'text-red-400',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    className: 'text-muted-foreground',
  },
  timed_out: {
    icon: Timer,
    label: 'Timed Out',
    className: 'text-amber-400',
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function RunsPage() {
  const params = useParams<{ projectId: string; workflowId: string }>();
  const { projectId, workflowId } = params;

  const utils = trpc.useUtils();

  // Fetch runs from API
  const { data: runs, isLoading } = trpc.execution.list.useQuery({ workflowId });

  // Start execution mutation
  const startExecution = trpc.execution.start.useMutation({
    onSuccess: () => {
      utils.execution.list.invalidate();
    },
  });

  function handleRunWorkflow() {
    startExecution.mutate({ workflowId });
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/workflows/${workflowId}/editor`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Editor
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Execution History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View past and current workflow executions
            </p>
          </div>
          <button
            onClick={handleRunWorkflow}
            disabled={startExecution.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {startExecution.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Workflow
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading runs...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!runs || runs.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border py-12">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No executions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run this workflow to see execution history here.
          </p>
        </div>
      )}

      {/* Runs table */}
      {!isLoading && runs && runs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Run ID
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Trigger
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Started
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run: any) => {
                const status: ExecutionStatus = run.status ?? 'pending';
                const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                const startedRaw = run.startedAt ?? run.createdAt;
                const startedDate = startedRaw
                  ? new Date(startedRaw).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '--';

                const durationMs =
                  run.durationMs ??
                  (run.completedAt && startedRaw
                    ? new Date(run.completedAt).getTime() - new Date(startedRaw).getTime()
                    : undefined);

                return (
                  <tr
                    key={run.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${projectId}/workflows/${workflowId}/runs/${run.id}`}
                        className="inline-flex items-center gap-2"
                      >
                        <StatusIcon
                          className={`h-4 w-4 ${config.className} ${status === 'running' ? 'animate-spin' : ''}`}
                        />
                        <span className={`font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${projectId}/workflows/${workflowId}/runs/${run.id}`}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        {run.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs">
                        {run.triggerType ?? 'manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {startedDate}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {durationMs ? formatDuration(durationMs) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
