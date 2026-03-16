// ---------------------------------------------------------------------------
// Serialization / Deserialization for WorkflowDefinition
// ---------------------------------------------------------------------------

import type { WorkflowDefinition } from '../types/workflow.js';
import { workflowDefinitionSchema } from '../validators/workflow.js';

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serialise a `WorkflowDefinition` to a JSON string.
 * Produces compact output by default; pass `pretty: true` for indented output.
 */
export function serializeWorkflow(
  workflow: WorkflowDefinition,
  options?: { pretty?: boolean },
): string {
  return JSON.stringify(workflow, null, options?.pretty ? 2 : undefined);
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

export interface DeserializeResult {
  success: true;
  data: WorkflowDefinition;
}

export interface DeserializeError {
  success: false;
  error: string;
  details?: unknown;
}

/**
 * Deserialise and validate a JSON string into a `WorkflowDefinition`.
 *
 * The function first attempts JSON parsing, then runs the Zod schema
 * validation. Returns a discriminated result.
 */
export function deserializeWorkflow(
  json: string,
): DeserializeResult | DeserializeError {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return {
      success: false,
      error: 'Invalid JSON: failed to parse input string.',
    };
  }

  const result = workflowDefinitionSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: 'Validation failed.',
      details: result.error.flatten(),
    };
  }

  return { success: true, data: result.data as unknown as WorkflowDefinition };
}

// ---------------------------------------------------------------------------
// Clone
// ---------------------------------------------------------------------------

/**
 * Deep-clone a `WorkflowDefinition` via JSON round-trip.
 * Faster than structuredClone in most runtimes and strips any
 * non-serialisable artefacts.
 */
export function cloneWorkflow(
  workflow: WorkflowDefinition,
): WorkflowDefinition {
  return JSON.parse(JSON.stringify(workflow)) as WorkflowDefinition;
}
