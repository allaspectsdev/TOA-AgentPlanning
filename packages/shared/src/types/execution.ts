// ---------------------------------------------------------------------------
// Execution Types
// ---------------------------------------------------------------------------

/** High-level status of an entire workflow execution. */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

/** Status of an individual step (node) within an execution. */
export type StepStatus =
  | 'pending'
  | 'running'
  | 'waiting_for_input'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/** Granular log level for execution events. */
export type ExecutionLogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error';

// ---------------------------------------------------------------------------
// Execution State
// ---------------------------------------------------------------------------

/** Top-level execution state. */
export interface ExecutionState {
  id: string;
  workflowId: string;
  versionId: string;
  status: ExecutionStatus;
  /** Input values supplied when the execution was triggered. */
  input: Record<string, unknown>;
  /** Final output (populated upon completion). */
  output?: Record<string, unknown>;
  /** Per-node step states keyed by node ID. */
  steps: Record<string, ExecutionStepState>;
  /** Shared context that any node may read/write. */
  context: Record<string, unknown>;
  /** Error information if the execution failed. */
  error?: ExecutionError;
  startedAt: string;
  completedAt?: string;
  /** User or system principal that triggered the execution. */
  triggeredBy: string;
  /** Execution-level metadata (tags, parent execution, etc.). */
  metadata: Record<string, unknown>;
}

/** State for a single step within an execution. */
export interface ExecutionStepState {
  nodeId: string;
  nodeType: string;
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: ExecutionError;
  startedAt?: string;
  completedAt?: string;
  /** How many times this step has been retried so far. */
  retryCount: number;
  /** Log entries produced during step execution. */
  logs: ExecutionLogEntry[];
  /** Token-usage metrics (relevant for agent / team nodes). */
  tokenUsage?: TokenUsage;
  /** Duration in milliseconds. */
  durationMs?: number;
}

/** Structured error attached to an execution or step. */
export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/** A single log line produced during execution. */
export interface ExecutionLogEntry {
  timestamp: string;
  level: ExecutionLogLevel;
  message: string;
  data?: Record<string, unknown>;
}

/** Token usage counters for LLM-backed nodes. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// WebSocket / Real-time Events
// ---------------------------------------------------------------------------

/** Events pushed over WebSocket to the UI during an execution. */
export type ExecutionEvent =
  | ExecutionStartedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepOutputEvent
  | GateWaitingEvent
  | ExecutionLogEvent;

interface BaseExecutionEvent<T extends string> {
  type: T;
  executionId: string;
  timestamp: string;
}

export interface ExecutionStartedEvent extends BaseExecutionEvent<'execution.started'> {
  workflowId: string;
}

export interface ExecutionCompletedEvent extends BaseExecutionEvent<'execution.completed'> {
  output: Record<string, unknown>;
  durationMs: number;
}

export interface ExecutionFailedEvent extends BaseExecutionEvent<'execution.failed'> {
  error: ExecutionError;
}

export interface StepStartedEvent extends BaseExecutionEvent<'step.started'> {
  nodeId: string;
  nodeType: string;
}

export interface StepCompletedEvent extends BaseExecutionEvent<'step.completed'> {
  nodeId: string;
  output: Record<string, unknown>;
  durationMs: number;
  tokenUsage?: TokenUsage;
}

export interface StepFailedEvent extends BaseExecutionEvent<'step.failed'> {
  nodeId: string;
  error: ExecutionError;
}

export interface StepOutputEvent extends BaseExecutionEvent<'step.output'> {
  nodeId: string;
  /** Partial / streaming output chunk. */
  chunk: string;
}

export interface GateWaitingEvent extends BaseExecutionEvent<'gate.waiting'> {
  nodeId: string;
  gateType: string;
  assignees: string[];
}

export interface ExecutionLogEvent extends BaseExecutionEvent<'execution.log'> {
  nodeId?: string;
  level: ExecutionLogLevel;
  message: string;
  data?: Record<string, unknown>;
}
