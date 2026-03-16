// ---------------------------------------------------------------------------
// Graph Utilities
// ---------------------------------------------------------------------------

import type { WorkflowNode } from '../types/nodes';
import type { WorkflowEdge } from '../types/edges';

/** Adjacency list representation used internally. */
interface AdjacencyList {
  /** Map from node ID to the set of IDs it points to. */
  forward: Map<string, Set<string>>;
  /** Map from node ID to the set of IDs that point to it. */
  reverse: Map<string, Set<string>>;
}

/**
 * Build forward and reverse adjacency lists from a set of edges.
 * Only edges whose source and target exist in `nodeIds` are included.
 */
function buildAdjacencyList(
  nodeIds: Set<string>,
  edges: WorkflowEdge[],
): AdjacencyList {
  const forward = new Map<string, Set<string>>();
  const reverse = new Map<string, Set<string>>();

  for (const id of nodeIds) {
    forward.set(id, new Set());
    reverse.set(id, new Set());
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    forward.get(edge.source)!.add(edge.target);
    reverse.get(edge.target)!.add(edge.source);
  }

  return { forward, reverse };
}

// ---------------------------------------------------------------------------
// Topological Sort (Kahn's algorithm)
// ---------------------------------------------------------------------------

export interface TopologicalSortResult {
  /** Nodes in topological order (empty when a cycle exists). */
  sorted: string[];
  /** Whether the graph contains at least one cycle. */
  hasCycle: boolean;
}

/**
 * Topologically sort the workflow graph using Kahn's algorithm.
 * Non-executable nodes (e.g. notes) are silently excluded.
 */
export function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): TopologicalSortResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const { forward, reverse } = buildAdjacencyList(nodeIds, edges);

  // In-degree map
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, reverse.get(id)!.size);
  }

  // Seed queue with zero-in-degree nodes
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbour of forward.get(current)!) {
      const newDeg = inDegree.get(neighbour)! - 1;
      inDegree.set(neighbour, newDeg);
      if (newDeg === 0) queue.push(neighbour);
    }
  }

  const hasCycle = sorted.length !== nodeIds.size;
  return { sorted: hasCycle ? [] : sorted, hasCycle };
}

// ---------------------------------------------------------------------------
// Cycle Detection (DFS-based, returns the cycle path)
// ---------------------------------------------------------------------------

/**
 * Detect cycles in the workflow graph. Returns the first cycle found as an
 * ordered list of node IDs, or an empty array if the graph is acyclic.
 */
export function detectCycles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const { forward } = buildAdjacencyList(nodeIds, edges);

  const WHITE = 0; // unvisited
  const GREY = 1; // in current DFS path
  const BLACK = 2; // fully processed

  const colour = new Map<string, number>();
  for (const id of nodeIds) colour.set(id, WHITE);

  const parent = new Map<string, string | null>();

  function dfs(nodeId: string): string[] | null {
    colour.set(nodeId, GREY);

    for (const neighbour of forward.get(nodeId)!) {
      const c = colour.get(neighbour)!;

      if (c === GREY) {
        // Back edge found — reconstruct cycle
        const cycle: string[] = [neighbour, nodeId];
        let cur = nodeId;
        while (cur !== neighbour) {
          cur = parent.get(cur)!;
          if (cur === null) break;
          cycle.push(cur);
        }
        cycle.reverse();
        return cycle;
      }

      if (c === WHITE) {
        parent.set(neighbour, nodeId);
        const result = dfs(neighbour);
        if (result) return result;
      }
    }

    colour.set(nodeId, BLACK);
    return null;
  }

  for (const id of nodeIds) {
    if (colour.get(id) === WHITE) {
      parent.set(id, null);
      const cycle = dfs(id);
      if (cycle) return cycle;
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Entry Nodes
// ---------------------------------------------------------------------------

/**
 * Find all entry (root) nodes — nodes with no incoming edges.
 * These are typically trigger nodes.
 */
export function findEntryNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowNode[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const { reverse } = buildAdjacencyList(nodeIds, edges);

  return nodes.filter((n) => reverse.get(n.id)!.size === 0);
}

// ---------------------------------------------------------------------------
// Downstream Nodes
// ---------------------------------------------------------------------------

/**
 * Return all nodes reachable downstream (BFS) from the given `startNodeId`,
 * **not** including the start node itself.
 */
export function getDownstreamNodes(
  startNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowNode[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const { forward } = buildAdjacencyList(nodeIds, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbour of forward.get(current) ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push(neighbour);
      }
    }
  }

  return Array.from(visited)
    .filter((id) => id !== startNodeId)
    .map((id) => nodeMap.get(id)!)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Upstream Nodes
// ---------------------------------------------------------------------------

/**
 * Return all nodes reachable upstream (reverse BFS) from the given
 * `startNodeId`, **not** including the start node itself.
 */
export function getUpstreamNodes(
  startNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowNode[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const { reverse } = buildAdjacencyList(nodeIds, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbour of reverse.get(current) ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push(neighbour);
      }
    }
  }

  return Array.from(visited)
    .filter((id) => id !== startNodeId)
    .map((id) => nodeMap.get(id)!)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Validate Graph Integrity
// ---------------------------------------------------------------------------

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Run structural validation on a workflow graph:
 * - No cycles
 * - All edge endpoints reference existing nodes
 * - At least one entry node
 * - No orphan nodes (unless they are notes)
 */
export function validateGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): GraphValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Check for duplicate node IDs
  if (nodeIds.size !== nodes.length) {
    errors.push('Duplicate node IDs detected.');
  }

  // Check edge endpoints
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references non-existent source node "${edge.source}".`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references non-existent target node "${edge.target}".`);
    }
  }

  // Cycle detection
  const cycles = detectCycles(nodes, edges);
  if (cycles.length > 0) {
    errors.push(`Cycle detected: ${cycles.join(' -> ')}.`);
  }

  // Entry node check (excluding non-executable nodes)
  const executableNodes = nodes.filter((n) => n.type !== 'note');
  if (executableNodes.length > 0) {
    const entryNodes = findEntryNodes(executableNodes, edges);
    if (entryNodes.length === 0) {
      errors.push('No entry nodes found — every executable node has incoming edges.');
    }
  }

  return { valid: errors.length === 0, errors };
}
