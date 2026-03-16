// ---------------------------------------------------------------------------
// Pre-Execution Workflow Validator
// ---------------------------------------------------------------------------

import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
  AgentNode,
  TeamNode,
  GateNode,
  ConditionNode,
  ToolNode,
  MemoryNode,
  OutputNode,
  SubflowNode,
  TriggerNode,
} from '@toa/shared';
import { NODE_REGISTRY } from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function err(
  message: string,
  nodeId?: string,
  field?: string,
): ValidationError {
  return { nodeId, field, message, severity: 'error' };
}

function warn(
  message: string,
  nodeId?: string,
  field?: string,
): ValidationError {
  return { nodeId, field, message, severity: 'warning' };
}

// ---------------------------------------------------------------------------
// Graph Structure Validation
// ---------------------------------------------------------------------------

function validateGraphStructure(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Duplicate node IDs
  if (nodeIds.size !== nodes.length) {
    const seen = new Set<string>();
    for (const n of nodes) {
      if (seen.has(n.id)) {
        errors.push(err(`Duplicate node ID "${n.id}".`, n.id));
      }
      seen.add(n.id);
    }
  }

  // Edge endpoint validation
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(
        err(`Edge "${edge.id}" references non-existent source "${edge.source}".`),
      );
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(
        err(`Edge "${edge.id}" references non-existent target "${edge.target}".`),
      );
    }
    if (edge.source === edge.target) {
      errors.push(
        err(`Edge "${edge.id}" is a self-loop on node "${edge.source}".`),
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Cycle Detection (excluding intra-team edges)
// ---------------------------------------------------------------------------

function validateNoCycles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Team nodes may have internal cycles (agents looping); exclude edges that
  // are entirely within the same team node's child scope. Since our graph is
  // at the node level (not agent level), we only check inter-node cycles.
  const executableNodes = nodes.filter((n) => {
    const entry = NODE_REGISTRY[n.type];
    return entry?.isExecutable ?? true;
  });
  const nodeIds = new Set(executableNodes.map((n) => n.id));

  const forward = new Map<string, Set<string>>();
  for (const id of nodeIds) forward.set(id, new Set());
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      forward.get(edge.source)!.add(edge.target);
    }
  }

  // DFS colouring
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  for (const id of nodeIds) colour.set(id, WHITE);

  function dfs(nodeId: string, path: string[]): boolean {
    colour.set(nodeId, GREY);
    path.push(nodeId);

    for (const neighbour of forward.get(nodeId)!) {
      if (colour.get(neighbour) === GREY) {
        const cycleStart = path.indexOf(neighbour);
        const cyclePath = path.slice(cycleStart);
        errors.push(
          err(`Cycle detected: ${cyclePath.join(' -> ')} -> ${neighbour}.`),
        );
        return true;
      }
      if (colour.get(neighbour) === WHITE) {
        if (dfs(neighbour, path)) return true;
      }
    }

    path.pop();
    colour.set(nodeId, BLACK);
    return false;
  }

  for (const id of nodeIds) {
    if (colour.get(id) === WHITE) {
      dfs(id, []);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Port / Connection Validation
// ---------------------------------------------------------------------------

function validateConnections(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const incomingCount = new Map<string, number>();

  for (const edge of edges) {
    const count = incomingCount.get(edge.target) ?? 0;
    incomingCount.set(edge.target, count + 1);
  }

  for (const node of nodes) {
    const entry = NODE_REGISTRY[node.type];
    if (!entry || !entry.isExecutable) continue;

    // Nodes with required inputs (everything except triggers) should have
    // at least one incoming edge.
    const hasRequiredInputs = entry.defaultPorts.inputs.length > 0;
    const incoming = incomingCount.get(node.id) ?? 0;

    if (hasRequiredInputs && incoming === 0 && node.type !== 'trigger') {
      errors.push(
        warn(
          `Node "${node.data.label}" (${node.id}) has no incoming connections.`,
          node.id,
        ),
      );
    }
  }

  // Ensure at least one trigger node exists
  const hasTrigger = nodes.some((n) => n.type === 'trigger');
  if (!hasTrigger) {
    errors.push(warn('Workflow has no trigger node.'));
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Node-Specific Config Validation
// ---------------------------------------------------------------------------

function validateNodeConfigs(nodes: WorkflowNode[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'agent':
        validateAgentNode(node, errors);
        break;
      case 'team':
        validateTeamNode(node, errors);
        break;
      case 'trigger':
        validateTriggerNode(node, errors);
        break;
      case 'gate':
        validateGateNode(node, errors);
        break;
      case 'condition':
        validateConditionNode(node, errors);
        break;
      case 'tool':
        validateToolNode(node, errors);
        break;
      case 'memory':
        validateMemoryNode(node, errors);
        break;
      case 'output':
        validateOutputNode(node, errors);
        break;
      case 'subflow':
        validateSubflowNode(node, errors);
        break;
      case 'note':
        // No validation needed
        break;
    }
  }

  return errors;
}

function validateAgentNode(node: AgentNode, errors: ValidationError[]): void {
  if (!node.data.model) {
    errors.push(err('Agent node must specify a model.', node.id, 'model'));
  }
  if (!node.data.systemPrompt && node.data.systemPrompt !== '') {
    errors.push(
      err('Agent node must have a system prompt.', node.id, 'systemPrompt'),
    );
  }
  if (node.data.temperature < 0 || node.data.temperature > 2) {
    errors.push(
      err('Agent temperature must be between 0 and 2.', node.id, 'temperature'),
    );
  }
  if (node.data.maxTokens <= 0) {
    errors.push(
      err('Agent maxTokens must be positive.', node.id, 'maxTokens'),
    );
  }
}

function validateTeamNode(node: TeamNode, errors: ValidationError[]): void {
  if (!node.data.agents || node.data.agents.length === 0) {
    errors.push(err('Team node must have at least one agent.', node.id, 'agents'));
  }
  if (node.data.pattern === 'supervisor' && !node.data.supervisorAgentId) {
    errors.push(
      err(
        'Supervisor pattern requires a supervisorAgentId.',
        node.id,
        'supervisorAgentId',
      ),
    );
  }
  if (node.data.pattern === 'supervisor' && node.data.supervisorAgentId) {
    const hasSupervisor = node.data.agents.some(
      (a) => a.id === node.data.supervisorAgentId,
    );
    if (!hasSupervisor) {
      errors.push(
        err(
          'supervisorAgentId does not match any agent in the team.',
          node.id,
          'supervisorAgentId',
        ),
      );
    }
  }
}

function validateTriggerNode(
  node: TriggerNode,
  errors: ValidationError[],
): void {
  if (node.data.triggerType === 'webhook' && !node.data.webhookConfig) {
    errors.push(
      err('Webhook trigger requires webhookConfig.', node.id, 'webhookConfig'),
    );
  }
  if (node.data.triggerType === 'schedule' && !node.data.scheduleConfig) {
    errors.push(
      err(
        'Schedule trigger requires scheduleConfig.',
        node.id,
        'scheduleConfig',
      ),
    );
  }
  if (node.data.triggerType === 'event' && !node.data.eventConfig) {
    errors.push(
      err('Event trigger requires eventConfig.', node.id, 'eventConfig'),
    );
  }
}

function validateGateNode(node: GateNode, errors: ValidationError[]): void {
  if (node.data.timeoutMinutes <= 0) {
    errors.push(
      err('Gate timeout must be positive.', node.id, 'timeoutMinutes'),
    );
  }
  if (
    node.data.timeoutAction === 'fallback_node' &&
    !node.data.fallbackNodeId
  ) {
    errors.push(
      err(
        'Fallback timeout action requires a fallbackNodeId.',
        node.id,
        'fallbackNodeId',
      ),
    );
  }
}

function validateConditionNode(
  node: ConditionNode,
  errors: ValidationError[],
): void {
  if (
    node.data.conditionType === 'if_else' ||
    node.data.conditionType === 'switch'
  ) {
    if (!node.data.conditions || node.data.conditions.length === 0) {
      errors.push(
        err('Condition node must have at least one condition rule.', node.id, 'conditions'),
      );
    }
  }
  if (node.data.conditionType === 'llm_router' && !node.data.llmRouterConfig) {
    errors.push(
      err(
        'LLM router condition requires llmRouterConfig.',
        node.id,
        'llmRouterConfig',
      ),
    );
  }
}

function validateToolNode(node: ToolNode, errors: ValidationError[]): void {
  if (node.data.toolType === 'http_request' && !node.data.httpConfig) {
    errors.push(
      err('HTTP tool requires httpConfig.', node.id, 'httpConfig'),
    );
  }
  if (node.data.toolType === 'code_execution' && !node.data.codeConfig) {
    errors.push(
      err('Code tool requires codeConfig.', node.id, 'codeConfig'),
    );
  }
  if (node.data.toolType === 'mcp' && !node.data.mcpConfig) {
    errors.push(
      err('MCP tool requires mcpConfig.', node.id, 'mcpConfig'),
    );
  }
}

function validateMemoryNode(node: MemoryNode, errors: ValidationError[]): void {
  if (
    node.data.memoryType === 'vector_store' &&
    node.data.operation === 'search' &&
    !node.data.vectorConfig
  ) {
    errors.push(
      err(
        'Vector search requires vectorConfig.',
        node.id,
        'vectorConfig',
      ),
    );
  }
}

function validateOutputNode(node: OutputNode, errors: ValidationError[]): void {
  if (node.data.outputType === 'webhook' && !node.data.webhookConfig) {
    errors.push(
      err('Webhook output requires webhookConfig.', node.id, 'webhookConfig'),
    );
  }
  if (node.data.outputType === 'email' && !node.data.emailConfig) {
    errors.push(
      err('Email output requires emailConfig.', node.id, 'emailConfig'),
    );
  }
  if (node.data.outputType === 'store' && !node.data.storeConfig) {
    errors.push(
      err('Store output requires storeConfig.', node.id, 'storeConfig'),
    );
  }
}

function validateSubflowNode(
  node: SubflowNode,
  errors: ValidationError[],
): void {
  if (!node.data.workflowId) {
    errors.push(
      err('Subflow node must reference a workflowId.', node.id, 'workflowId'),
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run comprehensive pre-execution validation on a workflow definition.
 * Returns errors (blocking) and warnings (informational).
 */
export function validateWorkflow(
  definition: WorkflowDefinition,
): ValidationResult {
  const allIssues: ValidationError[] = [
    ...validateGraphStructure(definition.nodes, definition.edges),
    ...validateNoCycles(definition.nodes, definition.edges),
    ...validateConnections(definition.nodes, definition.edges),
    ...validateNodeConfigs(definition.nodes),
  ];

  const errors = allIssues.filter((e) => e.severity === 'error');
  const warnings = allIssues.filter((e) => e.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick structural-only validation (no node config checks).
 * Useful for real-time validation in the editor.
 */
export function validateWorkflowStructure(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationResult {
  const allIssues: ValidationError[] = [
    ...validateGraphStructure(nodes, edges),
    ...validateNoCycles(nodes, edges),
    ...validateConnections(nodes, edges),
  ];

  const errors = allIssues.filter((e) => e.severity === 'error');
  const warnings = allIssues.filter((e) => e.severity === 'warning');

  return { valid: errors.length === 0, errors, warnings };
}
