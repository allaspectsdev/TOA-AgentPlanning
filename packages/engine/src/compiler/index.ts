// ---------------------------------------------------------------------------
// Workflow Compiler
// ---------------------------------------------------------------------------
//
// Takes a WorkflowDefinition, validates it, performs topological sorting with
// parallel group detection, and produces an ExecutionPlan that the Inngest
// workflow executor can iterate through.
// ---------------------------------------------------------------------------

import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
} from '@toa/shared';
import { NODE_REGISTRY } from '@toa/shared';

import {
  topologicalSortWithGroups,
  refineParallelGroups,
  type ParallelGroup,
} from './topological.js';
import {
  validateWorkflow,
  type ValidationResult,
  type ValidationError,
} from './validator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single step in the execution plan. */
export interface ExecutionPlanStep {
  nodeId: string;
  nodeType: string;
  node: WorkflowNode;
  /** Incoming edges that feed data into this node. */
  incomingEdges: WorkflowEdge[];
  /** Outgoing edges that carry data away from this node. */
  outgoingEdges: WorkflowEdge[];
}

/** A group of steps that can execute concurrently. */
export interface ExecutionPlanGroup {
  level: number;
  steps: ExecutionPlanStep[];
}

/** The compiled execution plan. */
export interface ExecutionPlan {
  /** Ordered groups — execute sequentially; steps within a group run in parallel. */
  groups: ExecutionPlanGroup[];
  /** Total number of executable steps. */
  totalSteps: number;
  /** Validation result from the pre-flight check. */
  validation: ValidationResult;
  /** The workflow definition that was compiled. */
  workflowId: string;
  versionId?: string;
}

/** Error thrown when compilation fails due to validation errors. */
export class CompilationError extends Error {
  public readonly errors: ValidationError[];
  public readonly warnings: ValidationError[];

  constructor(validation: ValidationResult) {
    const summary = validation.errors.map((e) => e.message).join('; ');
    super(`Workflow compilation failed: ${summary}`);
    this.name = 'CompilationError';
    this.errors = validation.errors;
    this.warnings = validation.warnings;
  }
}

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------

/**
 * Compile a `WorkflowDefinition` into an `ExecutionPlan`.
 *
 * Steps:
 * 1. Validate the definition (structure + node configs).
 * 2. Filter out non-executable nodes (e.g. notes).
 * 3. Perform topological sort with parallel group detection.
 * 4. Build the ordered execution plan.
 *
 * @throws CompilationError if validation fails with blocking errors.
 */
export function compileWorkflow(
  definition: WorkflowDefinition,
  options: { versionId?: string; skipValidation?: boolean } = {},
): ExecutionPlan {
  // 1. Validate
  const validation = options.skipValidation
    ? { valid: true, errors: [], warnings: [] }
    : validateWorkflow(definition);

  if (!validation.valid) {
    throw new CompilationError(validation);
  }

  // 2. Filter to executable nodes
  const executableNodes = definition.nodes.filter((node) => {
    const entry = NODE_REGISTRY[node.type];
    return entry?.isExecutable ?? false;
  });

  const nodeMap = new Map(executableNodes.map((n) => [n.id, n]));

  // Build edge lookup maps
  const edgesBySource = new Map<string, WorkflowEdge[]>();
  const edgesByTarget = new Map<string, WorkflowEdge[]>();

  for (const edge of definition.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;

    const fromSource = edgesBySource.get(edge.source) ?? [];
    fromSource.push(edge);
    edgesBySource.set(edge.source, fromSource);

    const toTarget = edgesByTarget.get(edge.target) ?? [];
    toTarget.push(edge);
    edgesByTarget.set(edge.target, toTarget);
  }

  // 3. Topological sort with parallel groups
  const topoResult = topologicalSortWithGroups(
    executableNodes,
    definition.edges,
  );

  if (topoResult.hasCycle) {
    throw new CompilationError({
      valid: false,
      errors: [
        {
          message: 'Workflow contains a cycle and cannot be compiled.',
          severity: 'error',
        },
      ],
      warnings: [],
    });
  }

  // Refine groups in case of intra-level dependencies
  const refinedGroups = refineParallelGroups(
    topoResult.groups,
    definition.edges,
  );

  // 4. Build execution plan groups
  const groups: ExecutionPlanGroup[] = refinedGroups.map(
    (pg: ParallelGroup) => ({
      level: pg.level,
      steps: pg.nodeIds
        .map((nodeId) => {
          const node = nodeMap.get(nodeId);
          if (!node) return null;

          return {
            nodeId,
            nodeType: node.type,
            node,
            incomingEdges: edgesByTarget.get(nodeId) ?? [],
            outgoingEdges: edgesBySource.get(nodeId) ?? [],
          } satisfies ExecutionPlanStep;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    }),
  );

  const totalSteps = groups.reduce((sum, g) => sum + g.steps.length, 0);

  return {
    groups,
    totalSteps,
    validation,
    workflowId: definition.id,
    versionId: options.versionId,
  };
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { topologicalSortWithGroups, refineParallelGroups } from './topological.js';
export type { ParallelGroup, TopologicalResult } from './topological.js';
export {
  validateWorkflow,
  validateWorkflowStructure,
} from './validator.js';
export type { ValidationResult, ValidationError } from './validator.js';
