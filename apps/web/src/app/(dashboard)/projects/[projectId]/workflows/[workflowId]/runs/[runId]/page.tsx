'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type {
  ExecutionStatus,
  StepStatus,
  ExecutionStepState,
  GateApproval,
} from '@toa/shared';

const STEP_STATUS_CONFIG: Record<
  StepStatus,
  { icon: typeof CheckCircle2; label: string; className: string }
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
  waiting_for_input: {
    icon: ShieldCheck,
    label: 'Waiting for Input',
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
  skipped: {
    icon: ChevronRight,
    label: 'Skipped',
    className: 'text-muted-foreground',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    className: 'text-muted-foreground',
  },
};

interface DemoStep {
  nodeId: string;
  nodeType: string;
  label: string;
  status: StepStatus;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: { code: string; message: string };
  logs: Array<{ timestamp: string; level: string; message: string }>;
}

const PLACEHOLDER_STEPS: DemoStep[] = [
  {
    nodeId: 'nd_1',
    nodeType: 'trigger',
    label: 'Manual Trigger',
    status: 'completed',
    durationMs: 12,
    output: { text: 'Customer complaint about billing issue' },
    logs: [
      {
        timestamp: '2026-03-15T10:30:00.012Z',
        level: 'info',
        message: 'Trigger fired: manual',
      },
    ],
  },
  {
    nodeId: 'nd_2',
    nodeType: 'agent',
    label: 'Classify Intent',
    status: 'completed',
    durationMs: 2340,
    input: { text: 'Customer complaint about billing issue' },
    output: { intent: 'billing_complaint', confidence: 0.95 },
    logs: [
      {
        timestamp: '2026-03-15T10:30:00.024Z',
        level: 'info',
        message: 'Agent started with model claude-sonnet-4-20250514',
      },
      {
        timestamp: '2026-03-15T10:30:02.364Z',
        level: 'info',
        message: 'Agent completed. Tokens used: 847',
      },
    ],
  },
  {
    nodeId: 'nd_3',
    nodeType: 'gate',
    label: 'Review Classification',
    status: 'waiting_for_input',
    input: { intent: 'billing_complaint', confidence: 0.95 },
    logs: [
      {
        timestamp: '2026-03-15T10:30:02.370Z',
        level: 'info',
        message: 'Gate opened. Awaiting approval from 1 assignee(s).',
      },
    ],
  },
  {
    nodeId: 'nd_4',
    nodeType: 'team',
    label: 'Response Team',
    status: 'pending',
    logs: [],
  },
];

const PLACEHOLDER_GATE: GateApproval = {
  id: 'gt_demo_1',
  executionId: 'ex_demo_2',
  nodeId: 'nd_3',
  status: 'waiting',
  gateType: 'approval',
  assignees: ['user@example.com'],
  assignmentStrategy: 'any',
  responses: [],
  reviewInstructions: 'Please review the classification result and confirm it is correct.',
  timeoutMinutes: 60,
  timeoutAction: 'approve',
  createdAt: '2026-03-15T10:30:02.370Z',
};

function StepCard({ step }: { step: DemoStep }) {
  const [expanded, setExpanded] = useState(false);
  const config = STEP_STATUS_CONFIG[step.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <StatusIcon
          className={`h-5 w-5 shrink-0 ${config.className} ${step.status === 'running' ? 'animate-spin' : ''}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {step.label}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {step.nodeType}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className={config.className}>{config.label}</span>
            {step.durationMs !== undefined && (
              <span>{step.durationMs}ms</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {/* Input */}
          {step.input && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                Input
              </h4>
              <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs text-foreground">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {step.output && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                Output
              </h4>
              <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs text-foreground">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {step.error && (
            <div>
              <h4 className="mb-1 flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Error
              </h4>
              <pre className="overflow-x-auto rounded-md bg-destructive/10 p-2 font-mono text-xs text-destructive">
                {step.error.code}: {step.error.message}
              </pre>
            </div>
          )}

          {/* Logs */}
          {step.logs.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                Logs
              </h4>
              <div className="space-y-1">
                {step.logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 font-mono text-xs"
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium uppercase ${
                        log.level === 'error'
                          ? 'bg-red-500/15 text-red-400'
                          : log.level === 'warn'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-blue-500/15 text-blue-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GateApprovalCard({ gate }: { gate: GateApproval }) {
  const [comment, setComment] = useState('');

  return (
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">
          Approval Required
        </h3>
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
          {gate.gateType}
        </span>
      </div>

      {gate.reviewInstructions && (
        <p className="mb-3 text-sm text-muted-foreground">
          {gate.reviewInstructions}
        </p>
      )}

      <div className="mb-3 space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white shadow hover:bg-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approve
        </button>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-medium text-white shadow hover:bg-red-700">
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}

export default function RunDetailPage() {
  const params = useParams<{
    projectId: string;
    workflowId: string;
    runId: string;
  }>();

  const overallStatus: ExecutionStatus = 'running';
  const steps = PLACEHOLDER_STEPS;
  const pendingGate = PLACEHOLDER_GATE;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/projects/${params.projectId}/workflows/${params.workflowId}/runs`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Runs
        </Link>

        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">
            Execution Detail
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {overallStatus}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {params.runId}
        </p>
      </div>

      {/* Gate approval card */}
      {pendingGate && (
        <div className="mb-6">
          <GateApprovalCard gate={pendingGate} />
        </div>
      )}

      {/* Steps timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Steps</h2>
        {steps.map((step) => (
          <StepCard key={step.nodeId} step={step} />
        ))}
      </div>
    </div>
  );
}
