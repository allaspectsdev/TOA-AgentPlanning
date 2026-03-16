// ---------------------------------------------------------------------------
// Gate Runner — manages HITL gate lifecycle
// ---------------------------------------------------------------------------

import type { GateNode, GateApproval, GateStatus, GateResponse } from '@toa/shared';
import type { ExecutionContext } from './context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateRunnerResult {
  /** The gate approval record created for this node. */
  gateApproval: GateApproval;
  /** Whether the gate is resolved (approved/rejected) or still waiting. */
  resolved: boolean;
  /** If resolved, the outcome. */
  outcome?: 'approved' | 'rejected' | 'escalated' | 'timed_out';
  /** Data submitted by the responder(s), if any. */
  responseData?: Record<string, unknown>;
}

export interface GateResolutionResult {
  /** Updated gate status. */
  status: GateStatus;
  /** Whether the gate is fully resolved. */
  resolved: boolean;
  /** Which output port to activate: 'approved' or 'rejected'. */
  activePortId: string;
  /** Collected response data from all respondents. */
  responseData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Gate Approval Creation
// ---------------------------------------------------------------------------

let gateIdCounter = 0;

function generateGateId(): string {
  gateIdCounter++;
  return `gt_${Date.now()}_${gateIdCounter}`;
}

/**
 * Create a GateApproval record for a gate node. This record is persisted
 * and used to track the state of the human-in-the-loop interaction.
 */
export function createGateApproval(
  node: GateNode,
  executionId: string,
  context: ExecutionContext,
): GateApproval {
  const inputs = context.getInputsFor(node.id);

  return {
    id: generateGateId(),
    executionId,
    nodeId: node.id,
    status: 'waiting',
    gateType: node.data.gateType,
    assignees: node.data.assignees ?? [],
    assignmentStrategy: node.data.assignmentStrategy,
    responses: [],
    reviewInstructions: node.data.reviewInstructions,
    inputFields: node.data.inputFields,
    timeoutMinutes: node.data.timeoutMinutes,
    timeoutAction: node.data.timeoutAction,
    escalationConfig: node.data.escalationConfig,
    createdAt: new Date().toISOString(),
    contextSnapshot: {
      ...inputs,
      _executionContext: context.getSharedContext(),
    },
  };
}

// ---------------------------------------------------------------------------
// Gate Resolution Logic
// ---------------------------------------------------------------------------

/**
 * Determine whether a gate is resolved based on the assignment strategy
 * and the responses received so far.
 */
export function evaluateGateResponses(
  gate: GateApproval,
): GateResolutionResult {
  const { responses, assignmentStrategy, assignees } = gate;

  if (responses.length === 0) {
    return {
      status: 'waiting',
      resolved: false,
      activePortId: 'approved', // doesn't matter yet
      responseData: {},
    };
  }

  // Collect all response data
  const responseData: Record<string, unknown> = {};
  for (const response of responses) {
    if (response.inputData) {
      Object.assign(responseData, response.inputData);
    }
    if (response.comment) {
      responseData[`comment_${response.userId}`] = response.comment;
    }
  }

  switch (assignmentStrategy) {
    case 'any': {
      // Any single response resolves the gate
      const firstResponse = responses[0]!;
      const approved = firstResponse.action === 'approve';
      return {
        status: approved ? 'approved' : 'rejected',
        resolved: true,
        activePortId: approved ? 'approved' : 'rejected',
        responseData,
      };
    }

    case 'all': {
      // All assignees must respond
      const respondedUserIds = new Set(responses.map((r) => r.userId));
      const allResponded =
        assignees.length > 0
          ? assignees.every((a) => respondedUserIds.has(a))
          : responses.length > 0;

      if (!allResponded) {
        return {
          status: 'waiting',
          resolved: false,
          activePortId: 'approved',
          responseData,
        };
      }

      // Check if any response is a rejection
      const hasRejection = responses.some((r) => r.action === 'reject');
      const hasRequestChanges = responses.some(
        (r) => r.action === 'request_changes',
      );

      if (hasRejection || hasRequestChanges) {
        return {
          status: 'rejected',
          resolved: true,
          activePortId: 'rejected',
          responseData,
        };
      }

      return {
        status: 'approved',
        resolved: true,
        activePortId: 'approved',
        responseData,
      };
    }

    case 'round_robin': {
      // In round-robin, we only need one assignee to respond (the current one)
      // The "current" assignee is determined by the number of previous executions.
      // For simplicity, treat like 'any'.
      const firstResponse = responses[0]!;
      const approved = firstResponse.action === 'approve';
      return {
        status: approved ? 'approved' : 'rejected',
        resolved: true,
        activePortId: approved ? 'approved' : 'rejected',
        responseData,
      };
    }

    default:
      return {
        status: 'waiting',
        resolved: false,
        activePortId: 'approved',
        responseData,
      };
  }
}

// ---------------------------------------------------------------------------
// Timeout Handling
// ---------------------------------------------------------------------------

/**
 * Handle a gate timeout based on the configured timeout action.
 */
export function handleGateTimeout(
  gate: GateApproval,
): GateResolutionResult {
  switch (gate.timeoutAction) {
    case 'approve':
      return {
        status: 'timed_out',
        resolved: true,
        activePortId: 'approved',
        responseData: { _timedOut: true, _action: 'auto_approved' },
      };

    case 'reject':
      return {
        status: 'timed_out',
        resolved: true,
        activePortId: 'rejected',
        responseData: { _timedOut: true, _action: 'auto_rejected' },
      };

    case 'escalate':
      return {
        status: 'escalated',
        resolved: false, // Escalation creates a new waiting period
        activePortId: 'approved',
        responseData: {
          _timedOut: true,
          _action: 'escalated',
          _escalateTo: gate.escalationConfig?.escalateTo ?? [],
        },
      };

    case 'fallback_node':
      return {
        status: 'timed_out',
        resolved: true,
        // The execution engine should redirect to the fallback node
        activePortId: 'rejected',
        responseData: {
          _timedOut: true,
          _action: 'fallback',
          _fallbackNodeId: (gate as GateApproval & { fallbackNodeId?: string })
            .timeoutAction,
        },
      };

    default:
      return {
        status: 'timed_out',
        resolved: true,
        activePortId: 'rejected',
        responseData: { _timedOut: true },
      };
  }
}

// ---------------------------------------------------------------------------
// Process Gate Response
// ---------------------------------------------------------------------------

/**
 * Process an incoming gate response and return the updated resolution state.
 * This is called when a `gate/responded` event is received.
 */
export function processGateResponse(
  gate: GateApproval,
  response: GateResponse,
): { updatedGate: GateApproval; resolution: GateResolutionResult } {
  // Add the response to the gate
  const updatedGate: GateApproval = {
    ...gate,
    responses: [...gate.responses, response],
  };

  // Evaluate whether the gate is now resolved
  const resolution = evaluateGateResponses(updatedGate);

  if (resolution.resolved) {
    updatedGate.status = resolution.status;
    updatedGate.resolvedAt = new Date().toISOString();
  }

  return { updatedGate, resolution };
}

// ---------------------------------------------------------------------------
// Main Runner Entry Point
// ---------------------------------------------------------------------------

/**
 * Initialize a gate node for execution. Creates the approval record
 * and returns it for persistence. The actual waiting is handled by
 * the Inngest function using `step.waitForEvent`.
 */
export async function runGateNode(
  node: GateNode,
  executionId: string,
  context: ExecutionContext,
): Promise<GateRunnerResult> {
  const gateApproval = createGateApproval(node, executionId, context);

  return {
    gateApproval,
    resolved: false,
    outcome: undefined,
    responseData: undefined,
  };
}
