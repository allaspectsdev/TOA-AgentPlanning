// ---------------------------------------------------------------------------
// Execute Workflow — main Inngest function
// ---------------------------------------------------------------------------
//
// This is the primary Inngest function that orchestrates an entire workflow
// execution. It:
//   1. Loads the workflow definition and compiles it to an execution plan.
//   2. Iterates through parallel groups, executing nodes concurrently.
//   3. Handles gate nodes with step.waitForEvent for HITL pauses.
//   4. Manages the ExecutionContext for data passing between nodes.
//   5. Finalises execution status.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { compileWorkflow, type ExecutionPlan } from '../../compiler/index';
import { ExecutionContext } from '../../runtime/context';
import { executeNode, type NodeExecutionResult } from './execute-node';
import type {
  WorkflowDefinition,
  WorkflowNode,
  ExecutionStatus,
  StepStatus,
  ExecutionStepState,
} from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExecutionRecord {
  id: string;
  workflowId: string;
  versionId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps: Record<string, ExecutionStepState>;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Stub: Database Operations
// ---------------------------------------------------------------------------
// In production, these would interact with @toa/db to persist state.

async function loadWorkflowDefinition(
  workflowId: string,
  versionId: string,
): Promise<WorkflowDefinition> {
  // Stub: in production, query the database for the workflow + version snapshot.
  // For now, throw an error that the caller should handle by providing the
  // definition through the event data or a pre-loaded cache.
  throw new Error(
    `loadWorkflowDefinition is a stub. workflowId=${workflowId}, versionId=${versionId}. ` +
      'Wire up @toa/db to load workflow definitions.',
  );
}

async function createExecutionRecord(
  record: ExecutionRecord,
): Promise<void> {
  // Stub: persist the execution record
  void record;
}

async function updateExecutionRecord(
  executionId: string,
  updates: Partial<ExecutionRecord>,
): Promise<void> {
  // Stub: update the execution record
  void executionId;
  void updates;
}

async function updateStepRecord(
  executionId: string,
  nodeId: string,
  updates: Partial<ExecutionStepState>,
): Promise<void> {
  // Stub: update a step record
  void executionId;
  void nodeId;
  void updates;
}

// ---------------------------------------------------------------------------
// Inngest Function Definition
// ---------------------------------------------------------------------------

export const executeWorkflow = inngest.createFunction(
  {
    id: 'execute-workflow',
    retries: 0, // We handle retries at the node level, not the function level
    concurrency: [
      {
        // Limit concurrent executions per workflow
        key: 'event.data.workflowId',
        limit: 10,
      },
    ],
  },
  { event: 'workflow/execute' },

  async ({ event, step }) => {
    const {
      executionId,
      workflowId,
      versionId,
      input,
      triggeredBy,
    } = event.data;

    // ----- Step 1: Initialise execution record -----
    const executionRecord: ExecutionRecord = {
      id: executionId,
      workflowId,
      versionId,
      status: 'running',
      input,
      steps: {},
      startedAt: new Date().toISOString(),
      triggeredBy,
    };

    await step.run('init-execution', async () => {
      await createExecutionRecord(executionRecord);
    });

    // ----- Step 2: Load workflow & compile -----
    const plan = await step.run('compile-workflow', async () => {
      let definition: WorkflowDefinition;

      try {
        definition = await loadWorkflowDefinition(workflowId, versionId);
      } catch {
        // If we can't load from DB, create a minimal definition from event data.
        // This path is for development/testing; production should always load from DB.
        throw new Error(
          `Failed to load workflow definition for ${workflowId}@${versionId}. ` +
            'Ensure the workflow exists in the database.',
        );
      }

      return compileWorkflow(definition, { versionId });
    });

    // ----- Step 3: Build execution context -----
    // We need the workflow nodes and edges to build the context.
    // Since `plan` is serialised by Inngest, we need the original definition.
    // For now, we reconstruct a minimal context from the plan.
    const allNodes: WorkflowNode[] = [];
    const allEdges: Array<{ id: string; source: string; target: string; type: 'data'; sourceHandle?: string; targetHandle?: string }> = [];

    for (const group of plan.groups) {
      for (const planStep of group.steps) {
        allNodes.push(planStep.node);
        for (const edge of planStep.incomingEdges) {
          allEdges.push(edge as typeof allEdges[number]);
        }
      }
    }

    const context = new ExecutionContext(allNodes, allEdges, input);

    // ----- Step 4: Execute groups sequentially -----
    let executionFailed = false;
    let failureError: { code: string; message: string } | undefined;

    for (const group of plan.groups) {
      if (executionFailed) break;

      // Execute all nodes in the group in parallel
      const groupResults = await step.run(
        `group-${group.level}`,
        async () => {
          const results: Array<{
            nodeId: string;
            nodeType: string;
            result: NodeExecutionResult;
          }> = [];

          // For parallel execution, use Promise.allSettled
          const promises = group.steps.map(async (planStep) => {
            // Skip disabled nodes
            if (planStep.node.data.disabled) {
              return {
                nodeId: planStep.nodeId,
                nodeType: planStep.nodeType,
                result: {
                  output: { _skipped: true, _reason: 'disabled' },
                  durationMs: 0,
                } as NodeExecutionResult,
              };
            }

            const nodeResult = await executeNode(
              planStep.node,
              context,
              executionId,
            );

            return {
              nodeId: planStep.nodeId,
              nodeType: planStep.nodeType,
              result: nodeResult,
            };
          });

          const settled = await Promise.allSettled(promises);

          for (const outcome of settled) {
            if (outcome.status === 'fulfilled') {
              results.push(outcome.value);
            } else {
              // Promise rejection — create an error result
              results.push({
                nodeId: 'unknown',
                nodeType: 'unknown',
                result: {
                  output: {
                    _error: true,
                    _errorCode: 'PROMISE_REJECTED',
                    _errorMessage:
                      outcome.reason instanceof Error
                        ? outcome.reason.message
                        : String(outcome.reason),
                  },
                  durationMs: 0,
                },
              });
            }
          }

          return results;
        },
      );

      // ----- Step 5: Process results & handle gates -----
      for (const { nodeId, nodeType, result } of groupResults) {
        // Update execution context with output
        context.setOutput(nodeId, result.output);

        // Update step record
        const stepState: ExecutionStepState = {
          nodeId,
          nodeType,
          status: result.output['_error']
            ? 'failed'
            : result.waitingForGate
              ? 'waiting_for_input'
              : ('completed' as StepStatus),
          input: context.getInputsFor(nodeId),
          output: result.output,
          startedAt: new Date().toISOString(),
          completedAt: result.waitingForGate
            ? undefined
            : new Date().toISOString(),
          retryCount: 0,
          logs: [],
          tokenUsage: result.tokenUsage,
          durationMs: result.durationMs,
        };

        if (result.output['_error']) {
          stepState.error = {
            code: String(result.output['_errorCode'] ?? 'UNKNOWN'),
            message: String(result.output['_errorMessage'] ?? 'Unknown error'),
          };
        }

        executionRecord.steps[nodeId] = stepState;

        await step.run(`record-step-${nodeId}`, async () => {
          await updateStepRecord(executionId, nodeId, stepState);
        });

        // Send step completion/failure events
        if (result.output['_error']) {
          await step.run(`emit-step-failed-${nodeId}`, async () => {
            await inngest.send({
              name: 'execution/step.failed',
              data: {
                executionId,
                nodeId,
                nodeType,
                error: {
                  code: String(result.output['_errorCode'] ?? 'UNKNOWN'),
                  message: String(
                    result.output['_errorMessage'] ?? 'Unknown error',
                  ),
                },
              },
            });
          });

          // Check error handling strategy
          // For now, fail the execution on any node failure
          executionFailed = true;
          failureError = {
            code: String(result.output['_errorCode'] ?? 'NODE_FAILED'),
            message: String(
              result.output['_errorMessage'] ?? `Node ${nodeId} failed`,
            ),
          };
        } else if (!result.waitingForGate) {
          await step.run(`emit-step-completed-${nodeId}`, async () => {
            await inngest.send({
              name: 'execution/step.completed',
              data: {
                executionId,
                nodeId,
                nodeType,
                output: result.output,
                durationMs: result.durationMs,
              },
            });
          });
        }

        // Handle gate waiting
        if (result.waitingForGate && result.gateId) {
          const gateResponse = await step.waitForEvent(
            `gate-${nodeId}-${result.gateId}`,
            {
              event: 'gate/responded',
              timeout: '7d', // Maximum gate timeout
              match: 'data.gateId',
            },
          );

          if (gateResponse) {
            // Gate was responded to
            const gateOutput: Record<string, unknown> = {
              ...result.output,
              _gateResolved: true,
              _gateAction: gateResponse.data.action,
              _gateUserId: gateResponse.data.userId,
              _gateComment: gateResponse.data.comment,
              ...gateResponse.data.inputData,
            };

            context.setOutput(nodeId, gateOutput);

            // Update step record
            executionRecord.steps[nodeId] = {
              ...stepState,
              status: 'completed',
              output: gateOutput,
              completedAt: new Date().toISOString(),
            };

            await step.run(`record-gate-resolved-${nodeId}`, async () => {
              await updateStepRecord(executionId, nodeId, {
                status: 'completed',
                output: gateOutput,
                completedAt: new Date().toISOString(),
              });
            });
          } else {
            // Gate timed out
            const timeoutOutput: Record<string, unknown> = {
              ...result.output,
              _gateTimedOut: true,
            };

            context.setOutput(nodeId, timeoutOutput);

            executionRecord.steps[nodeId] = {
              ...stepState,
              status: 'completed',
              output: timeoutOutput,
              completedAt: new Date().toISOString(),
            };
          }
        }
      }
    }

    // ----- Step 6: Finalise execution -----
    const finalOutput = context.getFinalOutput();
    const finalStatus: ExecutionStatus = executionFailed
      ? 'failed'
      : 'completed';

    await step.run('finalise-execution', async () => {
      await updateExecutionRecord(executionId, {
        status: finalStatus,
        output: finalOutput,
        completedAt: new Date().toISOString(),
        ...(failureError ? { error: failureError } : {}),
      });
    });

    return {
      executionId,
      status: finalStatus,
      output: finalOutput,
      stepsCompleted: Object.keys(executionRecord.steps).length,
      error: failureError,
    };
  },
);
