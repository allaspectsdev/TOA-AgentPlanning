// ---------------------------------------------------------------------------
// Topological Sort with Parallel Group Detection
// ---------------------------------------------------------------------------

import type { WorkflowNode, WorkflowEdge } from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A parallel group is a set of node IDs that can be executed concurrently.
 * They share the same topological level and have no inter-dependencies.
 */
export interface ParallelGroup {
  /** Zero-based level in the topological ordering. */
  level: number;
  /** Node IDs that can run in parallel at this level. */
  nodeIds: string[];
}

export interface TopologicalResult {
  /** Ordered list of parallel groups (level 0 first). */
  groups: ParallelGroup[];
  /** Flat topological order (all nodes, level by level). */
  sorted: string[];
  /** True if a cycle was detected (groups will be empty). */
  hasCycle: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Perform a topological sort using Kahn's algorithm, but instead of emitting
 * one node at a time, emit entire "frontier" layers. Nodes within the same
 * layer share the same topological level and have no edges between them,
 * meaning they can execute in parallel.
 *
 * @param nodes  Only executable nodes should be passed in (filter out `note` etc.).
 * @param edges  All edges; edges referencing missing nodes are silently skipped.
 */
export function topologicalSortWithGroups(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): TopologicalResult {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency
  const forward = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const id of nodeIds) {
    forward.set(id, new Set());
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    // Avoid counting duplicate edges
    if (!forward.get(edge.source)!.has(edge.target)) {
      forward.get(edge.source)!.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  // BFS layer by layer (Kahn's with level tracking)
  let currentFrontier: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) currentFrontier.push(id);
  }

  const groups: ParallelGroup[] = [];
  const sorted: string[] = [];
  let level = 0;

  while (currentFrontier.length > 0) {
    // Sort for deterministic output
    currentFrontier.sort();

    groups.push({ level, nodeIds: [...currentFrontier] });
    sorted.push(...currentFrontier);

    const nextFrontier: string[] = [];

    for (const nodeId of currentFrontier) {
      for (const neighbour of forward.get(nodeId)!) {
        const newDeg = inDegree.get(neighbour)! - 1;
        inDegree.set(neighbour, newDeg);
        if (newDeg === 0) {
          nextFrontier.push(neighbour);
        }
      }
    }

    currentFrontier = nextFrontier;
    level++;
  }

  const hasCycle = sorted.length !== nodeIds.size;

  if (hasCycle) {
    return { groups: [], sorted: [], hasCycle: true };
  }

  return { groups, sorted, hasCycle: false };
}

/**
 * Refine parallel groups by splitting nodes that have inter-dependencies
 * within the same level. This handles edge cases where conditional edges
 * create implicit ordering within what Kahn's algorithm considers a single
 * level.
 *
 * In practice, Kahn's algorithm already ensures no edges exist between nodes
 * at the same level. This function exists as an extra safety net and for
 * future edge-case handling.
 */
export function refineParallelGroups(
  groups: ParallelGroup[],
  edges: WorkflowEdge[],
): ParallelGroup[] {
  const edgeSet = new Set(edges.map((e) => `${e.source}->${e.target}`));
  const refined: ParallelGroup[] = [];
  let levelOffset = 0;

  for (const group of groups) {
    // Check for intra-group edges
    const intraGroupEdges: Array<{ from: string; to: string }> = [];
    for (const a of group.nodeIds) {
      for (const b of group.nodeIds) {
        if (a !== b && edgeSet.has(`${a}->${b}`)) {
          intraGroupEdges.push({ from: a, to: b });
        }
      }
    }

    if (intraGroupEdges.length === 0) {
      refined.push({ level: group.level + levelOffset, nodeIds: group.nodeIds });
    } else {
      // Sub-sort within the group using a mini topological sort
      const subNodes = new Set(group.nodeIds);
      const subForward = new Map<string, Set<string>>();
      const subInDegree = new Map<string, number>();

      for (const id of subNodes) {
        subForward.set(id, new Set());
        subInDegree.set(id, 0);
      }

      for (const edge of intraGroupEdges) {
        subForward.get(edge.from)!.add(edge.to);
        subInDegree.set(edge.to, (subInDegree.get(edge.to) ?? 0) + 1);
      }

      let subFrontier: string[] = [];
      for (const [id, deg] of subInDegree) {
        if (deg === 0) subFrontier.push(id);
      }

      let subLevel = 0;
      while (subFrontier.length > 0) {
        subFrontier.sort();
        refined.push({
          level: group.level + levelOffset + subLevel,
          nodeIds: [...subFrontier],
        });

        const nextSubFrontier: string[] = [];
        for (const nodeId of subFrontier) {
          for (const neighbour of subForward.get(nodeId)!) {
            const newDeg = subInDegree.get(neighbour)! - 1;
            subInDegree.set(neighbour, newDeg);
            if (newDeg === 0) {
              nextSubFrontier.push(neighbour);
            }
          }
        }

        subFrontier = nextSubFrontier;
        subLevel++;
      }

      // Account for the extra levels we introduced
      if (subLevel > 1) {
        levelOffset += subLevel - 1;
      }
    }
  }

  return refined;
}
