// ---------------------------------------------------------------------------
// Workflow Definition Types
// ---------------------------------------------------------------------------

import type { WorkflowNode } from './nodes';
import type { WorkflowEdge } from './edges';

/** Viewport state of the canvas editor. */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** A global variable available to every node in the workflow. */
export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'secret';
  defaultValue?: unknown;
  description?: string;
  required: boolean;
}

/** An environment-specific set of variable overrides. */
export interface WorkflowEnvironment {
  id: string;
  name: string;
  variables: Record<string, unknown>;
}

/** Metadata about a saved version of a workflow. */
export interface WorkflowVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changelog?: string;
  snapshot: WorkflowSnapshot;
}

/** The serialisable graph that makes up a workflow version. */
export interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: Viewport;
}

/** Top-level workflow definition persisted in the database. */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  orgId: string;
  projectId: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: Viewport;
  variables: WorkflowVariable[];
  environments: WorkflowEnvironment[];
  settings: WorkflowSettings;
  currentVersion: number;
  versions: WorkflowVersion[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** Global settings that apply to the entire workflow. */
export interface WorkflowSettings {
  /** Maximum wall-clock minutes for a single execution. */
  maxExecutionTimeMinutes: number;
  /** How many executions may run concurrently. */
  concurrencyLimit: number;
  /** Whether to keep detailed step-level logs. */
  enableDetailedLogging: boolean;
  /** Global retry policy used when a node does not specify its own. */
  defaultRetryPolicy?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  /** Error-handling strategy when a node fails. */
  errorHandling: 'stop' | 'continue' | 'retry';
  /** Optional webhook to call when the workflow finishes or errors. */
  notificationWebhook?: string;
}

/** Lifecycle status of a workflow definition. */
export type WorkflowStatus =
  | 'draft'
  | 'published'
  | 'archived'
  | 'disabled';
