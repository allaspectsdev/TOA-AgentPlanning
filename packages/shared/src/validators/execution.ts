// ---------------------------------------------------------------------------
// Zod Schemas — Execution Validation
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { MAX_EXECUTION_INPUT_SIZE_BYTES } from '../constants/limits.js';

// ---------------------------------------------------------------------------
// Trigger Execution Request
// ---------------------------------------------------------------------------

export const triggerExecutionSchema = z.object({
  workflowId: z.string().min(1),
  /** Optional version — defaults to the current published version. */
  versionId: z.string().optional(),
  /** Input payload supplied by the caller. */
  input: z.record(z.string(), z.unknown()).default({}),
  /** Optional environment to resolve variable overrides. */
  environmentId: z.string().optional(),
  /** Arbitrary metadata attached to the execution. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TriggerExecutionInput = z.infer<typeof triggerExecutionSchema>;

// ---------------------------------------------------------------------------
// Cancel Execution Request
// ---------------------------------------------------------------------------

export const cancelExecutionSchema = z.object({
  executionId: z.string().min(1),
  reason: z.string().optional(),
});

export type CancelExecutionInput = z.infer<typeof cancelExecutionSchema>;

// ---------------------------------------------------------------------------
// Retry Execution Request
// ---------------------------------------------------------------------------

export const retryExecutionSchema = z.object({
  executionId: z.string().min(1),
  /** If specified, only retry from this node onward. */
  fromNodeId: z.string().optional(),
});

export type RetryExecutionInput = z.infer<typeof retryExecutionSchema>;

// ---------------------------------------------------------------------------
// Gate Action Schemas
// ---------------------------------------------------------------------------

export const gateApproveSchema = z.object({
  type: z.literal('approve'),
  gateId: z.string().min(1),
  userId: z.string().min(1),
  comment: z.string().optional(),
});

export const gateRejectSchema = z.object({
  type: z.literal('reject'),
  gateId: z.string().min(1),
  userId: z.string().min(1),
  comment: z.string().optional(),
});

export const gateRequestChangesSchema = z.object({
  type: z.literal('request_changes'),
  gateId: z.string().min(1),
  userId: z.string().min(1),
  comment: z.string().min(1),
});

export const gateEscalateSchema = z.object({
  type: z.literal('escalate'),
  gateId: z.string().min(1),
  userId: z.string().min(1),
  escalateTo: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
});

export const gateSubmitInputSchema = z.object({
  type: z.literal('submit_input'),
  gateId: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export const gateActionSchema = z.discriminatedUnion('type', [
  gateApproveSchema,
  gateRejectSchema,
  gateRequestChangesSchema,
  gateEscalateSchema,
  gateSubmitInputSchema,
]);

export type ValidatedGateAction = z.infer<typeof gateActionSchema>;

// ---------------------------------------------------------------------------
// Execution Query / Filter
// ---------------------------------------------------------------------------

export const executionQuerySchema = z.object({
  workflowId: z.string().optional(),
  status: z
    .enum([
      'pending',
      'running',
      'paused',
      'completed',
      'failed',
      'cancelled',
      'timed_out',
    ])
    .optional(),
  triggeredBy: z.string().optional(),
  startedAfter: z.string().datetime().optional(),
  startedBefore: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type ExecutionQuery = z.infer<typeof executionQuerySchema>;

// ---------------------------------------------------------------------------
// Input size validation helper
// ---------------------------------------------------------------------------

/**
 * Validate that a JSON-serialised input payload does not exceed the system
 * limit. Returns `true` if the payload is within bounds.
 *
 * Uses a conservative estimate: each character is counted as up to 4 bytes
 * (the maximum for a UTF-8 code point). This avoids relying on `TextEncoder`
 * which may not be available in all type-check configurations.
 */
export function isInputWithinSizeLimit(
  input: Record<string, unknown>,
): boolean {
  const serialised = JSON.stringify(input);
  // Each JS char is at most 4 bytes in UTF-8. For a tighter check, callers
  // in a Node.js runtime can use `Buffer.byteLength(serialised, 'utf8')`.
  const estimatedBytes = serialised.length * 4;
  return estimatedBytes <= MAX_EXECUTION_INPUT_SIZE_BYTES;
}
