// ---------------------------------------------------------------------------
// Handle Gate Approval — Inngest function
// ---------------------------------------------------------------------------
//
// Processes gate approval/rejection events. While the main workflow executor
// uses `step.waitForEvent` to pause on gates, this function provides
// supplementary processing:
//   - Updates the gate approval record in the database
//   - Evaluates whether the gate is fully resolved (for 'all' strategy)
//   - Sends notifications to relevant parties
//   - Handles escalation logic
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import {
  processGateResponse,
  handleGateTimeout,
  evaluateGateResponses,
  type GateResolutionResult,
} from '../../runtime/gate-runner';
import type { GateApproval, GateResponse, GateStatus } from '@toa/shared';

// ---------------------------------------------------------------------------
// Stub: Database Operations
// ---------------------------------------------------------------------------

async function loadGateApproval(gateId: string): Promise<GateApproval | null> {
  // Stub: load gate approval record from the database.
  // Returns null if not found.
  void gateId;
  return null;
}

async function saveGateApproval(gate: GateApproval): Promise<void> {
  // Stub: persist the updated gate approval record.
  void gate;
}

async function sendNotification(
  _channel: 'email' | 'slack' | 'in_app',
  _recipients: string[],
  _payload: Record<string, unknown>,
): Promise<void> {
  // Stub: send notifications through the appropriate channel.
}

// ---------------------------------------------------------------------------
// Inngest Function Definition
// ---------------------------------------------------------------------------

export const handleGateApproval = inngest.createFunction(
  {
    id: 'handle-gate-approval',
    retries: 3,
  },
  { event: 'gate/responded' },

  async ({ event, step }) => {
    const {
      gateId,
      executionId,
      nodeId,
      action,
      userId,
      comment,
      inputData,
    } = event.data;

    // ----- Step 1: Load the gate approval record -----
    const gate = await step.run('load-gate', async () => {
      const loaded = await loadGateApproval(gateId);
      if (!loaded) {
        // If we can't find the gate in DB, construct a minimal record
        // This handles the case where the DB layer isn't wired up yet
        return {
          id: gateId,
          executionId,
          nodeId,
          status: 'waiting' as GateStatus,
          gateType: 'approval' as const,
          assignees: [] as string[],
          assignmentStrategy: 'any' as const,
          responses: [] as GateResponse[],
          timeoutMinutes: 60,
          timeoutAction: 'reject' as const,
          createdAt: new Date().toISOString(),
        } satisfies GateApproval;
      }
      return loaded;
    });

    // ----- Step 2: Add the response -----
    const response: GateResponse = {
      userId,
      action: action === 'escalate' || action === 'submit_input'
        ? 'approve'
        : action as 'approve' | 'reject' | 'request_changes',
      comment,
      inputData,
      respondedAt: new Date().toISOString(),
    };

    const { updatedGate, resolution } = await step.run(
      'process-response',
      async () => {
        return processGateResponse(gate, response);
      },
    );

    // ----- Step 3: Persist the updated gate -----
    await step.run('save-gate', async () => {
      await saveGateApproval(updatedGate);
    });

    // ----- Step 4: Handle resolution outcomes -----
    if (resolution.resolved) {
      // Send notification about the resolution
      await step.run('notify-resolution', async () => {
        const notificationPayload = {
          gateId,
          executionId,
          nodeId,
          status: resolution.status,
          resolvedBy: userId,
          action,
          comment,
        };

        // Notify all assignees about the outcome
        if (updatedGate.assignees.length > 0) {
          await sendNotification(
            'in_app',
            updatedGate.assignees,
            notificationPayload,
          );
        }
      });
    }

    // ----- Step 5: Handle escalation -----
    if (action === 'escalate' && updatedGate.escalationConfig) {
      await step.run('handle-escalation', async () => {
        const escalateTo = updatedGate.escalationConfig!.escalateTo;

        // Update the gate with new assignees
        const escalatedGate: GateApproval = {
          ...updatedGate,
          status: 'escalated',
          assignees: [...updatedGate.assignees, ...escalateTo],
        };

        await saveGateApproval(escalatedGate);

        // Notify escalation targets
        await sendNotification('in_app', escalateTo, {
          gateId,
          executionId,
          nodeId,
          type: 'escalation',
          escalatedBy: userId,
          reason: comment,
          reviewInstructions: updatedGate.reviewInstructions,
          contextSnapshot: updatedGate.contextSnapshot,
        });
      });
    }

    // ----- Step 6: Handle input submission -----
    if (action === 'submit_input' && inputData) {
      await step.run('process-input-submission', async () => {
        // Validate submitted data against input field definitions
        const inputFields = updatedGate.inputFields ?? [];
        const validationErrors: string[] = [];

        for (const field of inputFields) {
          if (field.required && !(field.name in (inputData ?? {}))) {
            validationErrors.push(`Required field "${field.name}" is missing.`);
          }
        }

        if (validationErrors.length > 0) {
          // Store validation errors but don't block — the gate response
          // is already recorded and the workflow will continue.
          return {
            valid: false,
            errors: validationErrors,
          };
        }

        return { valid: true, errors: [] };
      });
    }

    return {
      gateId,
      executionId,
      nodeId,
      action,
      resolved: resolution.resolved,
      status: resolution.status,
      activePortId: resolution.activePortId,
    };
  },
);
