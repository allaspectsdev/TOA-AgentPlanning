// ---------------------------------------------------------------------------
// Core Node Type System — Discriminated Unions
// ---------------------------------------------------------------------------

/** 2-D canvas position. */
export interface Position {
  x: number;
  y: number;
}

/** Port on a node. */
export interface Port {
  id: string;
  label?: string;
  type: 'input' | 'output';
  dataType?: 'any' | 'string' | 'json' | 'boolean' | 'number' | 'file';
}

/** Retry policy attached to any node. */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

/** Fields shared by every node's `data` object. */
export interface BaseNodeData {
  label: string;
  description?: string;
  disabled?: boolean;
  retryPolicy?: RetryPolicy;
}

/**
 * Generic base node — every concrete node extends this with a literal
 * `type` discriminant and a narrowed `data` type.
 */
export interface BaseNode<T extends string, D extends BaseNodeData> {
  id: string;
  type: T;
  position: Position;
  data: D;
  measured?: { width: number; height: number };
  ports?: { inputs: Port[]; outputs: Port[] };
}

// ---------------------------------------------------------------------------
// Agent Node
// ---------------------------------------------------------------------------

export interface AgentNodeData extends BaseNodeData {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  memoryConfig?: {
    type: 'conversation' | 'summary' | 'vector';
    maxMessages?: number;
    memoryNodeId?: string;
  };
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  templateId?: string;
}

export type AgentNode = BaseNode<'agent', AgentNodeData>;

// ---------------------------------------------------------------------------
// Team Node
// ---------------------------------------------------------------------------

export interface TeamNodeData extends BaseNodeData {
  pattern:
    | 'sequential'
    | 'parallel'
    | 'supervisor'
    | 'debate'
    | 'round_robin'
    | 'custom';
  agents: Array<{
    id: string;
    role: string;
    agentConfig: AgentNodeData;
  }>;
  supervisorAgentId?: string;
  maxRounds?: number;
  communicationProtocol:
    | 'shared_context'
    | 'message_passing'
    | 'blackboard';
  terminationCondition?: {
    type:
      | 'consensus'
      | 'supervisor_decision'
      | 'max_rounds'
      | 'quality_threshold';
    config: Record<string, unknown>;
  };
  templateId?: string;
}

export type TeamNode = BaseNode<'team', TeamNodeData>;

// ---------------------------------------------------------------------------
// Trigger Node
// ---------------------------------------------------------------------------

export interface TriggerNodeData extends BaseNodeData {
  triggerType: 'manual' | 'webhook' | 'schedule' | 'event';
  webhookConfig?: {
    path: string;
    method: 'GET' | 'POST';
    secret?: string;
  };
  scheduleConfig?: {
    cron: string;
    timezone: string;
  };
  eventConfig?: {
    eventName: string;
    filter?: string;
  };
  outputSchema?: Record<string, unknown>;
}

export type TriggerNode = BaseNode<'trigger', TriggerNodeData>;

// ---------------------------------------------------------------------------
// Gate Node (Human-in-the-Loop)
// ---------------------------------------------------------------------------

export interface GateNodeData extends BaseNodeData {
  gateType: 'approval' | 'review' | 'input' | 'escalation';
  assignees?: string[];
  assignmentStrategy: 'all' | 'any' | 'round_robin';
  timeoutMinutes: number;
  timeoutAction: 'approve' | 'reject' | 'escalate' | 'fallback_node';
  fallbackNodeId?: string;
  reviewInstructions?: string;
  inputFields?: Array<{
    name: string;
    type: 'text' | 'select' | 'boolean' | 'number';
    required: boolean;
    options?: string[];
  }>;
  notificationChannels: Array<'email' | 'slack' | 'in_app'>;
  escalationConfig?: {
    afterMinutes: number;
    escalateTo: string[];
  };
}

export type GateNode = BaseNode<'gate', GateNodeData>;

// ---------------------------------------------------------------------------
// Condition Node
// ---------------------------------------------------------------------------

export interface ConditionNodeData extends BaseNodeData {
  conditionType: 'if_else' | 'switch' | 'llm_router';
  conditions?: Array<{
    id: string;
    label: string;
    expression: string;
    outputPortId: string;
  }>;
  defaultOutputPortId?: string;
  llmRouterConfig?: {
    model: string;
    routingPrompt: string;
    options: Array<{
      label: string;
      description: string;
      outputPortId: string;
    }>;
  };
}

export type ConditionNode = BaseNode<'condition', ConditionNodeData>;

// ---------------------------------------------------------------------------
// Tool Node
// ---------------------------------------------------------------------------

export interface ToolNodeData extends BaseNodeData {
  toolType: 'http_request' | 'code_execution' | 'file_io' | 'database' | 'mcp';
  httpConfig?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    authentication?: {
      type: 'bearer' | 'api_key' | 'basic';
      credentialId: string;
    };
  };
  codeConfig?: {
    language: 'javascript' | 'typescript' | 'python';
    code: string;
    timeout: number;
  };
  mcpConfig?: {
    serverUri: string;
    toolName: string;
    inputMapping: Record<string, string>;
  };
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export type ToolNode = BaseNode<'tool', ToolNodeData>;

// ---------------------------------------------------------------------------
// Memory Node
// ---------------------------------------------------------------------------

export interface MemoryNodeData extends BaseNodeData {
  memoryType:
    | 'conversation_buffer'
    | 'summary'
    | 'vector_store'
    | 'key_value';
  operation: 'read' | 'write' | 'search' | 'clear';
  vectorConfig?: {
    embeddingModel: string;
    topK: number;
    similarityThreshold: number;
  };
  namespace?: string;
  ttlMinutes?: number;
}

export type MemoryNode = BaseNode<'memory', MemoryNodeData>;

// ---------------------------------------------------------------------------
// Output Node
// ---------------------------------------------------------------------------

export interface OutputNodeData extends BaseNodeData {
  outputType: 'return' | 'webhook' | 'email' | 'store' | 'stream';
  format?: 'json' | 'text' | 'markdown' | 'html';
  webhookConfig?: {
    url: string;
    headers: Record<string, string>;
  };
  emailConfig?: {
    to: string[];
    subject: string;
    templateId?: string;
  };
  storeConfig?: {
    table: string;
    mapping: Record<string, string>;
  };
}

export type OutputNode = BaseNode<'output', OutputNodeData>;

// ---------------------------------------------------------------------------
// Subflow Node
// ---------------------------------------------------------------------------

export interface SubflowNodeData extends BaseNodeData {
  workflowId: string;
  versionId?: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  waitForCompletion: boolean;
}

export type SubflowNode = BaseNode<'subflow', SubflowNodeData>;

// ---------------------------------------------------------------------------
// Note Node
// ---------------------------------------------------------------------------

export interface NoteNodeData extends BaseNodeData {
  content: string;
  color: string;
}

export type NoteNode = BaseNode<'note', NoteNodeData>;

// ---------------------------------------------------------------------------
// Discriminated Union & Helpers
// ---------------------------------------------------------------------------

/** Union of all concrete node types. */
export type WorkflowNode =
  | AgentNode
  | TeamNode
  | TriggerNode
  | GateNode
  | ConditionNode
  | ToolNode
  | MemoryNode
  | OutputNode
  | SubflowNode
  | NoteNode;

/** String-literal union of every node `type` discriminant. */
export type NodeType = WorkflowNode['type'];

/** Type guard — narrows a `WorkflowNode` to the variant matching `type`. */
export function isNodeType<T extends WorkflowNode['type']>(
  node: WorkflowNode,
  type: T,
): node is Extract<WorkflowNode, { type: T }> {
  return node.type === type;
}
