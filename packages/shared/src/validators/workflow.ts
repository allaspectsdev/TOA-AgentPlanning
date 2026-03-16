// ---------------------------------------------------------------------------
// Zod Schemas — Workflow Definition Validation
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { workflowNodeSchema } from './nodes.js';
import {
  MAX_NODES_PER_WORKFLOW,
  MAX_EDGES_PER_WORKFLOW,
  MAX_WORKFLOW_VARIABLES,
  MAX_ENVIRONMENTS_PER_WORKFLOW,
  MAX_TAGS_PER_WORKFLOW,
  MAX_TAG_LENGTH,
  MAX_WORKFLOW_NAME_LENGTH,
  MAX_WORKFLOW_DESCRIPTION_LENGTH,
  MAX_VERSIONS_PER_WORKFLOW,
  MAX_EXECUTION_TIME_MINUTES,
} from '../constants/limits.js';

// ---------------------------------------------------------------------------
// Edge Schemas
// ---------------------------------------------------------------------------

const baseEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const dataEdgeSchema = baseEdgeSchema.extend({
  type: z.literal('data'),
  data: z
    .object({
      label: z.string().optional(),
      dataTransform: z.string().optional(),
    })
    .optional(),
});

export const conditionalEdgeSchema = baseEdgeSchema.extend({
  type: z.literal('conditional'),
  data: z.object({
    conditionId: z.string().min(1),
    label: z.string().min(1),
  }),
});

export const workflowEdgeSchema = z.discriminatedUnion('type', [
  dataEdgeSchema,
  conditionalEdgeSchema,
]);

// ---------------------------------------------------------------------------
// Supporting Schemas
// ---------------------------------------------------------------------------

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

export const workflowVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'json', 'secret']),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
  required: z.boolean(),
});

export const workflowEnvironmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  variables: z.record(z.string(), z.unknown()),
});

export const workflowSettingsSchema = z.object({
  maxExecutionTimeMinutes: z.number().int().positive().max(MAX_EXECUTION_TIME_MINUTES),
  concurrencyLimit: z.number().int().positive(),
  enableDetailedLogging: z.boolean(),
  defaultRetryPolicy: z
    .object({
      maxRetries: z.number().int().min(0),
      backoffMs: z.number().int().min(0),
      backoffMultiplier: z.number().min(1),
    })
    .optional(),
  errorHandling: z.enum(['stop', 'continue', 'retry']),
  notificationWebhook: z.string().url().optional(),
});

export const workflowSnapshotSchema = z.object({
  nodes: z.array(workflowNodeSchema).max(MAX_NODES_PER_WORKFLOW),
  edges: z.array(workflowEdgeSchema).max(MAX_EDGES_PER_WORKFLOW),
  viewport: viewportSchema.optional(),
});

export const workflowVersionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  changelog: z.string().optional(),
  snapshot: workflowSnapshotSchema,
});

export const workflowStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
  'disabled',
]);

// ---------------------------------------------------------------------------
// Top-level Workflow Definition Schema
// ---------------------------------------------------------------------------

export const workflowDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(MAX_WORKFLOW_NAME_LENGTH),
  description: z.string().max(MAX_WORKFLOW_DESCRIPTION_LENGTH).optional(),
  orgId: z.string().min(1),
  projectId: z.string().min(1),
  status: workflowStatusSchema,
  nodes: z.array(workflowNodeSchema).max(MAX_NODES_PER_WORKFLOW),
  edges: z.array(workflowEdgeSchema).max(MAX_EDGES_PER_WORKFLOW),
  viewport: viewportSchema.optional(),
  variables: z.array(workflowVariableSchema).max(MAX_WORKFLOW_VARIABLES),
  environments: z
    .array(workflowEnvironmentSchema)
    .max(MAX_ENVIRONMENTS_PER_WORKFLOW),
  settings: workflowSettingsSchema,
  currentVersion: z.number().int().min(0),
  versions: z.array(workflowVersionSchema).max(MAX_VERSIONS_PER_WORKFLOW),
  tags: z
    .array(z.string().max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_WORKFLOW),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().min(1),
  updatedBy: z.string().min(1),
});

/** Inferred type from the Zod schema (useful for runtime-validated payloads). */
export type ValidatedWorkflowDefinition = z.infer<
  typeof workflowDefinitionSchema
>;

// ---------------------------------------------------------------------------
// Partial update schema (for PATCH endpoints)
// ---------------------------------------------------------------------------

export const workflowUpdateSchema = workflowDefinitionSchema
  .pick({
    name: true,
    description: true,
    status: true,
    nodes: true,
    edges: true,
    viewport: true,
    variables: true,
    environments: true,
    settings: true,
    tags: true,
  })
  .partial();

export type WorkflowUpdate = z.infer<typeof workflowUpdateSchema>;
