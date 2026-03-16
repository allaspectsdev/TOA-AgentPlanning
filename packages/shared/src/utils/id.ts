// ---------------------------------------------------------------------------
// ID Generation — cuid2
// ---------------------------------------------------------------------------

import { createId, init, isCuid } from '@paralleldrive/cuid2';

/**
 * Generate a globally unique, collision-resistant ID.
 * Uses cuid2 which is secure, URL-safe, and sortable.
 */
export function generateId(): string {
  return createId();
}

/** Create a prefixed ID (e.g. "wf_ck1234..."). */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${createId()}`;
}

/** Validate that a string is a valid cuid2. */
export function isValidId(id: string): boolean {
  return isCuid(id);
}

// ---------------------------------------------------------------------------
// Convenience generators for specific entity types
// ---------------------------------------------------------------------------

/** Generate a workflow ID. */
export function generateWorkflowId(): string {
  return generatePrefixedId('wf');
}

/** Generate a node ID. */
export function generateNodeId(): string {
  return generatePrefixedId('nd');
}

/** Generate an edge ID. */
export function generateEdgeId(): string {
  return generatePrefixedId('eg');
}

/** Generate an execution ID. */
export function generateExecutionId(): string {
  return generatePrefixedId('ex');
}

/** Generate a version ID. */
export function generateVersionId(): string {
  return generatePrefixedId('vr');
}

/** Generate a gate approval ID. */
export function generateGateId(): string {
  return generatePrefixedId('gt');
}

/** Generate a port ID. */
export function generatePortId(): string {
  return generatePrefixedId('pt');
}

/** Generate a variable ID. */
export function generateVariableId(): string {
  return generatePrefixedId('va');
}

/** Generate an environment ID. */
export function generateEnvironmentId(): string {
  return generatePrefixedId('ev');
}

// ---------------------------------------------------------------------------
// Custom-length ID generator
// ---------------------------------------------------------------------------

const shortIdCreator = init({ length: 12 });

/** Generate a shorter (12-char) ID suitable for non-critical use cases. */
export function generateShortId(): string {
  return shortIdCreator();
}
