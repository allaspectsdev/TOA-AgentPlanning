// ---------------------------------------------------------------------------
// Gate (Human-in-the-Loop) Types
// ---------------------------------------------------------------------------

/** Current status of a gate within an execution. */
export type GateStatus =
  | 'pending'
  | 'waiting'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'timed_out';

/** An individual response from an assignee on a gate. */
export interface GateResponse {
  userId: string;
  action: 'approve' | 'reject' | 'request_changes';
  comment?: string;
  /** Arbitrary data submitted via input fields. */
  inputData?: Record<string, unknown>;
  respondedAt: string;
}

/** Full state of a gate approval request within an execution. */
export interface GateApproval {
  id: string;
  executionId: string;
  nodeId: string;
  status: GateStatus;
  gateType: 'approval' | 'review' | 'input' | 'escalation';
  assignees: string[];
  assignmentStrategy: 'all' | 'any' | 'round_robin';
  responses: GateResponse[];
  reviewInstructions?: string;
  inputFields?: Array<{
    name: string;
    type: 'text' | 'select' | 'boolean' | 'number';
    required: boolean;
    options?: string[];
  }>;
  timeoutMinutes: number;
  timeoutAction: 'approve' | 'reject' | 'escalate' | 'fallback_node';
  escalationConfig?: {
    afterMinutes: number;
    escalateTo: string[];
  };
  createdAt: string;
  resolvedAt?: string;
  /** Snapshot of the execution context at the moment the gate was reached. */
  contextSnapshot?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Gate Actions — commands the UI / API can send
// ---------------------------------------------------------------------------

export type GateAction =
  | GateApproveAction
  | GateRejectAction
  | GateRequestChangesAction
  | GateEscalateAction
  | GateSubmitInputAction;

interface BaseGateAction<T extends string> {
  type: T;
  gateId: string;
  userId: string;
}

export interface GateApproveAction extends BaseGateAction<'approve'> {
  comment?: string;
}

export interface GateRejectAction extends BaseGateAction<'reject'> {
  comment?: string;
}

export interface GateRequestChangesAction extends BaseGateAction<'request_changes'> {
  comment: string;
}

export interface GateEscalateAction extends BaseGateAction<'escalate'> {
  escalateTo: string[];
  reason: string;
}

export interface GateSubmitInputAction extends BaseGateAction<'submit_input'> {
  data: Record<string, unknown>;
}
