'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  User,
  Workflow,
  Filter,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GateStatus = 'pending' | 'approved' | 'rejected' | 'timed_out' | 'escalated';

interface Approval {
  id: string;
  gateType: 'approval' | 'review' | 'input' | 'escalation';
  status: GateStatus;
  workflowName: string;
  workflowId: string;
  executionId: string;
  nodeName: string;
  assignedTo: string;
  createdAt: string;
  timeoutAt: string;
  reviewInstructions?: string;
  contextPreview?: string;
}

// ---------------------------------------------------------------------------
// Sample / fallback data
// ---------------------------------------------------------------------------

const SAMPLE_APPROVALS: Approval[] = [
  {
    id: 'gate_1',
    gateType: 'approval',
    status: 'pending',
    workflowName: 'Customer Support Triage',
    workflowId: 'wf_1',
    executionId: 'exec_1',
    nodeName: 'Manager Approval',
    assignedTo: 'You',
    createdAt: '2026-03-16T14:30:00Z',
    timeoutAt: '2026-03-16T18:30:00Z',
    reviewInstructions: 'Review the AI-generated response before sending to the customer.',
    contextPreview: 'Customer reported billing issue with subscription renewal. Agent drafted refund approval for $49.99...',
  },
  {
    id: 'gate_2',
    gateType: 'review',
    status: 'pending',
    workflowName: 'Blog Post Pipeline',
    workflowId: 'wf_2',
    executionId: 'exec_2',
    nodeName: 'Editor Review',
    assignedTo: 'You',
    createdAt: '2026-03-16T12:00:00Z',
    timeoutAt: '2026-03-17T12:00:00Z',
    reviewInstructions: 'Review the draft blog post for accuracy and tone. You may edit before approving.',
    contextPreview: 'Draft: "10 Ways AI Agents Are Transforming Software Development in 2026"...',
  },
  {
    id: 'gate_3',
    gateType: 'approval',
    status: 'approved',
    workflowName: 'Code Review Agent',
    workflowId: 'wf_3',
    executionId: 'exec_3',
    nodeName: 'Security Sign-off',
    assignedTo: 'You',
    createdAt: '2026-03-15T09:00:00Z',
    timeoutAt: '2026-03-15T17:00:00Z',
    contextPreview: 'No critical vulnerabilities found in PR #847. 2 low-severity suggestions.',
  },
  {
    id: 'gate_4',
    gateType: 'escalation',
    status: 'escalated',
    workflowName: 'Customer Support Triage',
    workflowId: 'wf_1',
    executionId: 'exec_4',
    nodeName: 'Escalation Review',
    assignedTo: 'You',
    createdAt: '2026-03-15T16:00:00Z',
    timeoutAt: '2026-03-15T20:00:00Z',
    reviewInstructions: 'Original assignee did not respond. Please review urgently.',
    contextPreview: 'Customer threatening legal action over data privacy concern...',
  },
  {
    id: 'gate_5',
    gateType: 'approval',
    status: 'timed_out',
    workflowName: 'Data Extraction Pipeline',
    workflowId: 'wf_4',
    executionId: 'exec_5',
    nodeName: 'Data Validation',
    assignedTo: 'You',
    createdAt: '2026-03-14T08:00:00Z',
    timeoutAt: '2026-03-14T12:00:00Z',
    contextPreview: 'Extracted 1,847 records from uploaded CSV. Auto-approved after timeout.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<GateStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'text-amber-500 bg-amber-500/10' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'text-green-500 bg-green-500/10' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'text-red-500 bg-red-500/10' },
  timed_out: { label: 'Timed Out', icon: Clock, className: 'text-muted-foreground bg-muted' },
  escalated: { label: 'Escalated', icon: AlertTriangle, className: 'text-orange-500 bg-orange-500/10' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function timeRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days}d left`;
}

/** Map API GateApproval to our Approval shape */
function mapApiApproval(a: any): Approval {
  return {
    id: a.id,
    gateType: a.gateType ?? a.payload?.gateType ?? 'approval',
    status: (a.status ?? 'pending') as GateStatus,
    workflowName: a.workflowName ?? a.payload?.workflowName ?? 'Workflow',
    workflowId: a.workflowId ?? a.payload?.workflowId ?? '',
    executionId: a.executionId ?? '',
    nodeName: a.nodeName ?? a.gateNodeId ?? a.stepId ?? 'Gate',
    assignedTo: a.assignedTo ?? 'You',
    createdAt: a.createdAt ?? new Date().toISOString(),
    timeoutAt: a.timeoutAt ?? new Date().toISOString(),
    reviewInstructions: a.reviewInstructions ?? a.payload?.reviewInstructions,
    contextPreview: a.contextPreview ?? a.payload?.contextPreview,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type FilterTab = 'pending' | 'all' | 'resolved';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');

  // --- tRPC: fetch pending approvals ---
  const utils = trpc.useUtils();
  const { data: pendingApprovals, isLoading: loadingPending, error: pendingError } = trpc.gate.getPending.useQuery(undefined, {
    retry: false,
  });

  // --- tRPC: approve & reject mutations ---
  const approveMutation = trpc.gate.approve.useMutation({
    onSuccess: () => {
      utils.gate.getPending.invalidate();
    },
    onError: (err: any) => {
      alert(`Failed to approve: ${err.message}`);
    },
  });

  const rejectMutation = trpc.gate.reject.useMutation({
    onSuccess: () => {
      utils.gate.getPending.invalidate();
    },
    onError: (err: any) => {
      alert(`Failed to reject: ${err.message}`);
    },
  });

  // Use API data if available, otherwise fall back to sample data
  const apiApprovals: Approval[] = pendingApprovals
    ? (pendingApprovals as any[]).map(mapApiApproval)
    : [];

  const allApprovals = apiApprovals.length > 0 || (!pendingError && !loadingPending)
    ? apiApprovals
    : SAMPLE_APPROVALS;

  const filtered = allApprovals.filter((a) => {
    if (activeTab === 'pending') return a.status === 'pending' || a.status === 'escalated';
    if (activeTab === 'resolved') return a.status === 'approved' || a.status === 'rejected' || a.status === 'timed_out';
    return true;
  });

  const pendingCount = allApprovals.filter(
    (a) => a.status === 'pending' || a.status === 'escalated',
  ).length;

  // --- Handlers ---
  function handleApprove(approval: Approval) {
    approveMutation.mutate({ approvalId: approval.id });
  }

  function handleReject(approval: Approval) {
    const reason = prompt('Rejection reason (optional):');
    rejectMutation.mutate({ approvalId: approval.id, reason: reason ?? undefined });
  }

  function handleViewDetails(approval: Approval) {
    if (approval.executionId) {
      // Navigate to execution; we may not have projectId/workflowId from the approval data
      alert(`Execution details: ${approval.executionId}\n\nFull navigation requires project and workflow context which is not available from the approval object.`);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Approvals
          {pendingCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and respond to human-in-the-loop gate requests across all workflows
        </p>
      </div>

      {/* Loading state */}
      {loadingPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading approvals...
        </div>
      )}

      {/* Fallback notice */}
      {pendingError && !loadingPending && (
        <div className="rounded-md bg-muted/50 border border-border px-4 py-2 text-xs text-muted-foreground">
          Could not load approvals from API. Showing sample data.
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { id: 'pending' as const, label: 'Needs Action', count: pendingCount },
          { id: 'all' as const, label: 'All', count: allApprovals.length },
          { id: 'resolved' as const, label: 'Resolved', count: allApprovals.length - pendingCount },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Approval List */}
      <div className="space-y-3">
        {filtered.map((approval) => {
          const config = statusConfig[approval.status];
          const StatusIcon = config.icon;
          const isPending = approval.status === 'pending' || approval.status === 'escalated';
          const isMutating =
            (approveMutation.isPending && approveMutation.variables?.approvalId === approval.id) ||
            (rejectMutation.isPending && rejectMutation.variables?.approvalId === approval.id);

          return (
            <div
              key={approval.id}
              className={`rounded-lg border bg-card p-4 transition-all hover:border-ring ${
                isPending ? 'border-border' : 'border-border/50 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Status badge */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">
                      {approval.nodeName}
                    </h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
                      {config.label}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                      {approval.gateType}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Workflow className="h-3 w-3" />
                      {approval.workflowName}
                    </span>
                    <span>{timeAgo(approval.createdAt)}</span>
                    {isPending && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        {timeRemaining(approval.timeoutAt)}
                      </span>
                    )}
                  </div>

                  {approval.contextPreview && (
                    <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                      {approval.contextPreview}
                    </p>
                  )}

                  {approval.reviewInstructions && isPending && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {approval.reviewInstructions}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {isPending && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(approval)}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {approveMutation.isPending && approveMutation.variables?.approvalId === approval.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval)}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {rejectMutation.isPending && rejectMutation.variables?.approvalId === approval.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => handleViewDetails(approval)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        View Details
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !loadingPending && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500/30" />
          <p className="mt-3 text-sm font-medium text-foreground">
            All caught up
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No pending approvals require your attention
          </p>
        </div>
      )}
    </div>
  );
}
