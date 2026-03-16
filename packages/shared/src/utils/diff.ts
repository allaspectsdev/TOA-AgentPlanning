// ---------------------------------------------------------------------------
// Structural Diff for WorkflowDefinition
// ---------------------------------------------------------------------------

import type { WorkflowDefinition } from '../types/workflow';
import type { WorkflowNode } from '../types/nodes';
import type { WorkflowEdge } from '../types/edges';

// ---------------------------------------------------------------------------
// Change Types
// ---------------------------------------------------------------------------

export type DiffChangeType =
  | 'node_added'
  | 'node_removed'
  | 'node_moved'
  | 'node_data_changed'
  | 'edge_added'
  | 'edge_removed'
  | 'metadata_changed';

export interface DiffChange {
  type: DiffChangeType;
  /** Entity kind affected. */
  entity: 'node' | 'edge' | 'metadata';
  /** ID of the affected entity (node/edge id, or field name for metadata). */
  entityId: string;
  /** Previous value (undefined for additions). */
  before?: unknown;
  /** New value (undefined for removals). */
  after?: unknown;
}

export interface WorkflowDiff {
  changes: DiffChange[];
  /** Summary counts. */
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesMoved: number;
    nodesDataChanged: number;
    edgesAdded: number;
    edgesRemoved: number;
    metadataChanged: number;
  };
  /** True when both definitions are structurally identical. */
  isIdentical: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      return a.every((val, i) => deepEqual(val, (b as unknown[])[i]));
    }

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

// ---------------------------------------------------------------------------
// Diff Nodes
// ---------------------------------------------------------------------------

function diffNodes(
  before: WorkflowNode[],
  after: WorkflowNode[],
): DiffChange[] {
  const changes: DiffChange[] = [];
  const beforeMap = new Map(before.map((n) => [n.id, n]));
  const afterMap = new Map(after.map((n) => [n.id, n]));

  // Removed nodes
  for (const [id, node] of beforeMap) {
    if (!afterMap.has(id)) {
      changes.push({
        type: 'node_removed',
        entity: 'node',
        entityId: id,
        before: node,
      });
    }
  }

  // Added or modified nodes
  for (const [id, afterNode] of afterMap) {
    const beforeNode = beforeMap.get(id);
    if (!beforeNode) {
      changes.push({
        type: 'node_added',
        entity: 'node',
        entityId: id,
        after: afterNode,
      });
      continue;
    }

    // Position change
    if (
      beforeNode.position.x !== afterNode.position.x ||
      beforeNode.position.y !== afterNode.position.y
    ) {
      changes.push({
        type: 'node_moved',
        entity: 'node',
        entityId: id,
        before: beforeNode.position,
        after: afterNode.position,
      });
    }

    // Data change (compare everything except position and measured)
    if (!deepEqual(beforeNode.data, afterNode.data)) {
      changes.push({
        type: 'node_data_changed',
        entity: 'node',
        entityId: id,
        before: beforeNode.data,
        after: afterNode.data,
      });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Diff Edges
// ---------------------------------------------------------------------------

function diffEdges(
  before: WorkflowEdge[],
  after: WorkflowEdge[],
): DiffChange[] {
  const changes: DiffChange[] = [];
  const beforeMap = new Map(before.map((e) => [e.id, e]));
  const afterMap = new Map(after.map((e) => [e.id, e]));

  for (const [id, edge] of beforeMap) {
    if (!afterMap.has(id)) {
      changes.push({
        type: 'edge_removed',
        entity: 'edge',
        entityId: id,
        before: edge,
      });
    }
  }

  for (const [id, edge] of afterMap) {
    if (!beforeMap.has(id)) {
      changes.push({
        type: 'edge_added',
        entity: 'edge',
        entityId: id,
        after: edge,
      });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Diff Metadata
// ---------------------------------------------------------------------------

const METADATA_FIELDS = [
  'name',
  'description',
  'status',
  'tags',
  'variables',
  'environments',
  'settings',
] as const;

function diffMetadata(
  before: WorkflowDefinition,
  after: WorkflowDefinition,
): DiffChange[] {
  const changes: DiffChange[] = [];

  for (const field of METADATA_FIELDS) {
    const bVal = before[field];
    const aVal = after[field];
    if (!deepEqual(bVal, aVal)) {
      changes.push({
        type: 'metadata_changed',
        entity: 'metadata',
        entityId: field,
        before: bVal,
        after: aVal,
      });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a structural diff between two `WorkflowDefinition` objects.
 * The result contains a flat list of changes and a summary.
 */
export function diffWorkflows(
  before: WorkflowDefinition,
  after: WorkflowDefinition,
): WorkflowDiff {
  const nodeChanges = diffNodes(before.nodes, after.nodes);
  const edgeChanges = diffEdges(before.edges, after.edges);
  const metaChanges = diffMetadata(before, after);

  const changes = [...nodeChanges, ...edgeChanges, ...metaChanges];

  const summary = {
    nodesAdded: changes.filter((c) => c.type === 'node_added').length,
    nodesRemoved: changes.filter((c) => c.type === 'node_removed').length,
    nodesMoved: changes.filter((c) => c.type === 'node_moved').length,
    nodesDataChanged: changes.filter((c) => c.type === 'node_data_changed').length,
    edgesAdded: changes.filter((c) => c.type === 'edge_added').length,
    edgesRemoved: changes.filter((c) => c.type === 'edge_removed').length,
    metadataChanged: metaChanges.length,
  };

  return {
    changes,
    summary,
    isIdentical: changes.length === 0,
  };
}
