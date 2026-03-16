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

interface RunSummary {
  id: string;
  status: ExecutionStatus;
  triggeredBy: string;
  triggerType: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

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

const PLACEHOLDER_RUNS: RunSummary[] = [
  {
    id: 'ex_demo_1',
    status: 'completed',
    triggeredBy: 'user@example.com',
    triggerType: 'manual',
    startedAt: '2026-03-15T10:30:00Z',
    completedAt: '2026-03-15T10:30:45Z',
    durationMs: 45_000,
  },
  {
    id: 'ex_demo_2',
    status: 'running',
    triggeredBy: 'user@example.com',
    triggerType: 'manual',
    startedAt: '2026-03-16T09:15:00Z',
  },
  {
    id: 'ex_demo_3',
    status: 'failed',
    triggeredBy: 'webhook',
    triggerType: 'webhook',
    startedAt: '2026-03-14T16:00:00Z',
    completedAt: '2026-03-14T16:00:12Z',
    durationMs: 12_000,
  },
];

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
  const runs = PLACEHOLDER_RUNS;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/projects/${params.projectId}/workflows/${params.workflowId}/editor`}
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
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <Play className="h-4 w-4" />
            Run Workflow
          </button>
        </div>
      </div>

      {/* Runs table */}
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
            {runs.map((run) => {
              const config = STATUS_CONFIG[run.status];
              const StatusIcon = config.icon;
              const startedDate = new Date(run.startedAt).toLocaleString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                },
              );

              return (
                <tr
                  key={run.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${params.projectId}/workflows/${params.workflowId}/runs/${run.id}`}
                      className="inline-flex items-center gap-2"
                    >
                      <StatusIcon
                        className={`h-4 w-4 ${config.className} ${run.status === 'running' ? 'animate-spin' : ''}`}
                      />
                      <span className={`font-medium ${config.className}`}>
                        {config.label}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${params.projectId}/workflows/${params.workflowId}/runs/${run.id}`}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      {run.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs">
                      {run.triggerType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {startedDate}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {run.durationMs ? formatDuration(run.durationMs) : '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
