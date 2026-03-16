// ---------------------------------------------------------------------------
// Node Execution Dispatcher
// ---------------------------------------------------------------------------
//
// Routes node execution to the appropriate runner based on `nodeType`.
// Called by the workflow executor for each node in the execution plan.
// ---------------------------------------------------------------------------

import type { WorkflowNode } from '@toa/shared';
import type { ExecutionContext } from '../../runtime/context.js';
import { runAgentNode, type AgentRunnerResult } from '../../runtime/agent-runner.js';
import { runToolNode, type ToolRunnerResult } from '../../runtime/tool-runner.js';
import { runConditionNode, type ConditionRunnerResult } from '../../runtime/condition-runner.js';
import { runMemoryNode, type MemoryRunnerResult } from '../../runtime/memory-runner.js';

import type {
  AgentNode,
  ToolNode,
  ConditionNode,
  MemoryNode,
  TriggerNode,
  OutputNode,
  SubflowNode,
  TeamNode,
} from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NodeExecutionResult {
  /** Output data to store in the execution context. */
  output: Record<string, unknown>;
  /** Duration of the node execution in milliseconds. */
  durationMs: number;
  /** Token usage (only for LLM-backed nodes). */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /**
   * For condition nodes: the ID of the output port that was activated.
   * The workflow executor uses this to determine which downstream edges to follow.
   */
  activePortId?: string;
  /**
   * For gate nodes: signals that the node is waiting for human input.
   * The workflow executor should pause and use `step.waitForEvent`.
   */
  waitingForGate?: boolean;
  /** Gate approval ID, if a gate was created. */
  gateId?: string;
}

// ---------------------------------------------------------------------------
// Trigger Node Handler
// ---------------------------------------------------------------------------

function executeTriggerNode(
  node: TriggerNode,
  context: ExecutionContext,
): NodeExecutionResult {
  // Trigger nodes simply pass through the workflow input
  const output: Record<string, unknown> = {
    ...context.input,
    _triggerType: node.data.triggerType,
    _triggeredAt: new Date().toISOString(),
  };

  return { output, durationMs: 0 };
}

// ---------------------------------------------------------------------------
// Output Node Handler
// ---------------------------------------------------------------------------

function executeOutputNode(
  node: OutputNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const inputs = context.getInputsFor(node.id);
  const format = node.data.format ?? 'json';

  let output: Record<string, unknown>;

  switch (node.data.outputType) {
    case 'return':
      output = { ...inputs, _format: format };
      break;

    case 'webhook': {
      // In production, this would POST to the configured webhook URL.
      // For now, store the data that would be sent.
      output = {
        _outputType: 'webhook',
        _webhookUrl: node.data.webhookConfig?.url,
        _sent: false,
        data: inputs,
      };
      break;
    }

    case 'email': {
      // Stub: email sending
      output = {
        _outputType: 'email',
        _to: node.data.emailConfig?.to,
        _subject: node.data.emailConfig?.subject,
        _sent: false,
        data: inputs,
      };
      break;
    }

    case 'store': {
      // Stub: database storage
      output = {
        _outputType: 'store',
        _table: node.data.storeConfig?.table,
        _stored: false,
        data: inputs,
      };
      break;
    }

    case 'stream': {
      output = {
        _outputType: 'stream',
        data: inputs,
      };
      break;
    }

    default:
      output = inputs;
  }

  return { output, durationMs: 0 };
}

// ---------------------------------------------------------------------------
// Subflow Node Handler
// ---------------------------------------------------------------------------

async function executeSubflowNode(
  node: SubflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const inputs = context.getInputsFor(node.id);

  // Map inputs according to the subflow's input mapping
  const mappedInputs: Record<string, unknown> = {};
  for (const [subflowKey, sourceExpr] of Object.entries(
    node.data.inputMapping,
  )) {
    mappedInputs[subflowKey] = inputs[sourceExpr] ?? inputs[subflowKey];
  }

  // In production, this would trigger a child workflow execution via Inngest.
  // For now, return a stub indicating the subflow was invoked.
  const output: Record<string, unknown> = {
    _subflowId: node.data.workflowId,
    _versionId: node.data.versionId,
    _waitForCompletion: node.data.waitForCompletion,
    _invoked: true,
    _inputs: mappedInputs,
    result: null,
    message: `Subflow "${node.data.workflowId}" invoked (stub).`,
  };

  return { output, durationMs: 0 };
}

// ---------------------------------------------------------------------------
// Team Node Handler
// ---------------------------------------------------------------------------

async function executeTeamNode(
  node: TeamNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const inputs = context.getInputsFor(node.id);
  const startTime = Date.now();

  // Execute team based on pattern
  const agentResults: Array<{
    agentId: string;
    role: string;
    output: Record<string, unknown>;
  }> = [];

  switch (node.data.pattern) {
    case 'sequential': {
      // Execute agents one at a time, passing output from each to the next
      let currentInput = inputs;
      for (const agent of node.data.agents) {
        // Build a pseudo-agent node for the runner
        const agentNode: AgentNode = {
          id: `${node.id}_agent_${agent.id}`,
          type: 'agent',
          position: node.position,
          data: agent.agentConfig,
        };

        // Create a temporary context for this agent
        const tempContext = new (context.constructor as new (
          ...args: ConstructorParameters<typeof ExecutionContext>
        ) => ExecutionContext)(
          [agentNode],
          [],
          currentInput,
        );
        tempContext.setOutput('__upstream__', currentInput);

        // Synthesize: the agent gets input from a virtual upstream node
        // Since our temp context has no edges, getInputsFor returns {}.
        // Instead, set the input directly by setting an upstream output.
        const result = await runAgentNode(agentNode, tempContext);

        agentResults.push({
          agentId: agent.id,
          role: agent.role,
          output: result.output,
        });

        currentInput = { ...currentInput, ...result.output };
      }
      break;
    }

    case 'parallel': {
      // Execute all agents concurrently
      const promises = node.data.agents.map(async (agent) => {
        const agentNode: AgentNode = {
          id: `${node.id}_agent_${agent.id}`,
          type: 'agent',
          position: node.position,
          data: agent.agentConfig,
        };

        const tempContext = new (context.constructor as new (
          ...args: ConstructorParameters<typeof ExecutionContext>
        ) => ExecutionContext)(
          [agentNode],
          [],
          inputs,
        );

        const result = await runAgentNode(agentNode, tempContext);
        return {
          agentId: agent.id,
          role: agent.role,
          output: result.output,
        };
      });

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          agentResults.push(result.value);
        }
      }
      break;
    }

    case 'supervisor':
    case 'debate':
    case 'round_robin':
    case 'custom': {
      // Stub for complex patterns — run sequentially as a fallback
      let currentInput = inputs;
      const maxRounds = node.data.maxRounds ?? 1;

      for (let round = 0; round < maxRounds; round++) {
        for (const agent of node.data.agents) {
          const agentNode: AgentNode = {
            id: `${node.id}_agent_${agent.id}_r${round}`,
            type: 'agent',
            position: node.position,
            data: agent.agentConfig,
          };

          const tempContext = new (context.constructor as new (
            ...args: ConstructorParameters<typeof ExecutionContext>
          ) => ExecutionContext)(
            [agentNode],
            [],
            currentInput,
          );

          const result = await runAgentNode(agentNode, tempContext);
          agentResults.push({
            agentId: agent.id,
            role: agent.role,
            output: result.output,
          });

          currentInput = { ...currentInput, ...result.output };
        }
      }
      break;
    }
  }

  const durationMs = Date.now() - startTime;

  // Merge all agent results
  const mergedOutput: Record<string, unknown> = {};
  for (const result of agentResults) {
    mergedOutput[result.agentId] = result.output;
  }

  const lastResult = agentResults[agentResults.length - 1];

  return {
    output: {
      ...mergedOutput,
      _pattern: node.data.pattern,
      _agentCount: node.data.agents.length,
      _resultCount: agentResults.length,
      text: lastResult?.output?.['text'] ?? '',
      data: lastResult?.output?.['data'] ?? null,
    },
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Main Dispatcher
// ---------------------------------------------------------------------------

/**
 * Execute a single workflow node by dispatching to the appropriate runner.
 *
 * @param node        The workflow node to execute.
 * @param context     The shared execution context.
 * @param executionId The parent execution ID (needed for gates and events).
 * @returns           The execution result.
 */
export async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  executionId: string,
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  try {
    switch (node.type) {
      case 'trigger':
        return executeTriggerNode(node, context);

      case 'agent': {
        const result = await runAgentNode(node, context);
        return {
          output: result.output,
          durationMs: Date.now() - startTime,
          tokenUsage: result.tokenUsage,
        };
      }

      case 'team':
        return executeTeamNode(node, context);

      case 'tool': {
        const result = await runToolNode(node, context);
        return {
          output: result.output,
          durationMs: result.durationMs,
        };
      }

      case 'condition': {
        const result = await runConditionNode(node, context);
        return {
          output: {
            activePortId: result.activePortId,
            matchedLabel: result.matchedLabel,
            evaluations: result.evaluations,
          },
          durationMs: Date.now() - startTime,
          activePortId: result.activePortId,
        };
      }

      case 'gate': {
        // Gate nodes don't fully execute here — they create an approval
        // record and signal the workflow executor to wait.
        const { runGateNode } = await import('../../runtime/gate-runner.js');
        const result = await runGateNode(node, executionId, context);
        return {
          output: {
            gateId: result.gateApproval.id,
            gateType: result.gateApproval.gateType,
            status: result.gateApproval.status,
          },
          durationMs: Date.now() - startTime,
          waitingForGate: true,
          gateId: result.gateApproval.id,
        };
      }

      case 'memory': {
        const result = await runMemoryNode(node, context, executionId);
        return {
          output: result.output,
          durationMs: Date.now() - startTime,
        };
      }

      case 'output':
        return executeOutputNode(node, context);

      case 'subflow':
        return executeSubflowNode(node, context);

      case 'note':
        // Notes are not executable
        return { output: {}, durationMs: 0 };

      default: {
        const exhaustiveCheck: never = node;
        throw new Error(
          `Unknown node type: ${(exhaustiveCheck as WorkflowNode).type}`,
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    return {
      output: {
        _error: true,
        _errorCode: 'NODE_EXECUTION_FAILED',
        _errorMessage: message,
        _errorStack: stack,
      },
      durationMs: Date.now() - startTime,
    };
  }
}
