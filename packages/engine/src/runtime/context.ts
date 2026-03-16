// ---------------------------------------------------------------------------
// ExecutionContext — manages data passing between nodes
// ---------------------------------------------------------------------------

import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowVariable,
} from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Output data stored per-node after execution. */
export interface NodeOutput {
  nodeId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/** Resolved inputs for a node, keyed by input port or mapping name. */
export type ResolvedInputs = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Template Resolution
// ---------------------------------------------------------------------------

/**
 * Regular expression matching template expressions like:
 *   {{nodes.nodeId.output.field}}
 *   {{input.field}}
 *   {{variables.varName}}
 *   {{context.key}}
 */
const TEMPLATE_RE = /\{\{([\w.]+)\}\}/g;

// ---------------------------------------------------------------------------
// ExecutionContext
// ---------------------------------------------------------------------------

/**
 * Manages the runtime state that flows between nodes during a workflow
 * execution. Each execution gets exactly one `ExecutionContext` instance.
 *
 * Data flows:
 *   - Trigger / input data is seeded at construction.
 *   - Each node writes its output via `setOutput()`.
 *   - Downstream nodes resolve their inputs via `getInputsFor()`.
 *   - Template syntax `{{nodes.X.output.Y}}` is supported in string values.
 */
export class ExecutionContext {
  /** Per-node outputs, keyed by node ID. */
  private readonly outputs = new Map<string, NodeOutput>();

  /** Shared key-value context accessible by any node. */
  private readonly sharedContext = new Map<string, unknown>();

  /** All nodes in the workflow, indexed by ID. */
  private readonly nodeMap: Map<string, WorkflowNode>;

  /** Forward edge map: source -> edges originating from that source. */
  private readonly edgesBySource: Map<string, WorkflowEdge[]>;

  /** Reverse edge map: target -> edges pointing to that target. */
  private readonly edgesByTarget: Map<string, WorkflowEdge[]>;

  /** Workflow variables (with defaults). */
  private readonly variables: Map<string, unknown>;

  /** The initial input to the workflow execution. */
  public readonly input: Record<string, unknown>;

  constructor(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    input: Record<string, unknown>,
    variables: WorkflowVariable[] = [],
  ) {
    this.input = input;
    this.nodeMap = new Map(nodes.map((n) => [n.id, n]));

    this.edgesBySource = new Map<string, WorkflowEdge[]>();
    this.edgesByTarget = new Map<string, WorkflowEdge[]>();

    for (const edge of edges) {
      const fromSource = this.edgesBySource.get(edge.source) ?? [];
      fromSource.push(edge);
      this.edgesBySource.set(edge.source, fromSource);

      const toTarget = this.edgesByTarget.get(edge.target) ?? [];
      toTarget.push(edge);
      this.edgesByTarget.set(edge.target, toTarget);
    }

    this.variables = new Map<string, unknown>();
    for (const v of variables) {
      this.variables.set(v.name, v.defaultValue);
    }
  }

  // -----------------------------------------------------------------------
  // Output Management
  // -----------------------------------------------------------------------

  /** Record the output of a completed node. */
  setOutput(nodeId: string, data: Record<string, unknown>): void {
    this.outputs.set(nodeId, {
      nodeId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Retrieve raw output data for a node (or undefined if not yet produced). */
  getOutput(nodeId: string): Record<string, unknown> | undefined {
    return this.outputs.get(nodeId)?.data;
  }

  /** Whether a node has produced output. */
  hasOutput(nodeId: string): boolean {
    return this.outputs.has(nodeId);
  }

  // -----------------------------------------------------------------------
  // Shared Context
  // -----------------------------------------------------------------------

  /** Set a key in the shared context. */
  setContextValue(key: string, value: unknown): void {
    this.sharedContext.set(key, value);
  }

  /** Get a value from the shared context. */
  getContextValue(key: string): unknown {
    return this.sharedContext.get(key);
  }

  /** Return the full shared context as a plain object. */
  getSharedContext(): Record<string, unknown> {
    return Object.fromEntries(this.sharedContext);
  }

  // -----------------------------------------------------------------------
  // Input Resolution
  // -----------------------------------------------------------------------

  /**
   * Resolve the inputs for a given node by:
   * 1. Collecting outputs from all upstream nodes connected via edges.
   * 2. Applying any `inputMapping` defined on the node's data.
   * 3. Resolving template expressions in string values.
   *
   * Returns a flat Record suitable for passing to a runner.
   */
  getInputsFor(nodeId: string): ResolvedInputs {
    const incomingEdges = this.edgesByTarget.get(nodeId) ?? [];
    const resolved: ResolvedInputs = {};

    // 1. Merge upstream outputs
    for (const edge of incomingEdges) {
      const upstreamOutput = this.outputs.get(edge.source)?.data;
      if (!upstreamOutput) continue;

      // If the edge has a data transform expression, apply it
      if (edge.type === 'data' && edge.data?.dataTransform) {
        try {
          const transformFn = new Function(
            'data',
            `"use strict"; return (${edge.data.dataTransform});`,
          );
          const transformed = transformFn(upstreamOutput) as unknown;
          if (typeof transformed === 'object' && transformed !== null) {
            Object.assign(resolved, transformed);
          } else {
            resolved[edge.source] = transformed;
          }
        } catch {
          // If transform fails, pass raw output
          Object.assign(resolved, upstreamOutput);
        }
      } else {
        // Default: merge all upstream output fields
        Object.assign(resolved, upstreamOutput);
      }
    }

    // 2. Apply input mappings from node data (if the node supports them)
    const node = this.nodeMap.get(nodeId);
    if (node) {
      const nodeData = node.data as unknown as Record<string, unknown>;
      const inputMapping = nodeData['inputMapping'] as
        | Record<string, string>
        | undefined;
      if (inputMapping) {
        for (const [targetKey, sourceExpr] of Object.entries(inputMapping)) {
          resolved[targetKey] = this.resolveTemplate(`{{${sourceExpr}}}`);
        }
      }
    }

    // 3. Resolve template expressions in any string values
    return this.resolveTemplatesInObject(resolved);
  }

  // -----------------------------------------------------------------------
  // Template Resolution
  // -----------------------------------------------------------------------

  /**
   * Resolve a single template string. Supported paths:
   *   - `nodes.<nodeId>.output.<field>` — access a node's output field
   *   - `input.<field>` — access the workflow's initial input
   *   - `variables.<name>` — access a workflow variable
   *   - `context.<key>` — access shared context
   */
  resolveTemplate(template: string): unknown {
    // If the entire string is a single template expression, return the raw value
    // (preserving type, e.g. numbers, objects).
    const singleMatch = /^\{\{([\w.]+)\}\}$/.exec(template);
    if (singleMatch) {
      return this.resolvePath(singleMatch[1]!);
    }

    // Otherwise, do string interpolation
    return template.replace(TEMPLATE_RE, (_match, path: string) => {
      const value = this.resolvePath(path);
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  /** Resolve a dot-separated path against known data sources. */
  private resolvePath(path: string): unknown {
    const segments = path.split('.');

    const root = segments[0];
    if (!root) return undefined;

    // nodes.<nodeId>.output.<field...>
    if (root === 'nodes' && segments.length >= 3) {
      const nodeId = segments[1]!;
      const outputData = this.outputs.get(nodeId)?.data;
      if (!outputData) return undefined;
      // segments[2] is expected to be "output"
      const fieldSegments = segments.slice(3);
      return this.drillInto(outputData, fieldSegments);
    }

    // input.<field...>
    if (root === 'input') {
      return this.drillInto(this.input, segments.slice(1));
    }

    // variables.<name>
    if (root === 'variables' && segments[1]) {
      return this.variables.get(segments[1]);
    }

    // context.<key>
    if (root === 'context' && segments[1]) {
      return this.sharedContext.get(segments[1]);
    }

    return undefined;
  }

  /** Drill into a nested object following dot segments. */
  private drillInto(obj: unknown, segments: string[]): unknown {
    let current: unknown = obj;
    for (const seg of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[seg];
    }
    return current;
  }

  /** Recursively resolve template strings inside an object. */
  private resolveTemplatesInObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && TEMPLATE_RE.test(value)) {
        // Reset lastIndex since we're using a global regex
        TEMPLATE_RE.lastIndex = 0;
        result[key] = this.resolveTemplate(value);
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this.resolveTemplatesInObject(
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Final Output
  // -----------------------------------------------------------------------

  /**
   * Compute the final output of the workflow execution.
   *
   * Strategy:
   * 1. If there are output nodes, merge their inputs (the data flowing into them).
   * 2. Otherwise, return the output of the last executed node.
   */
  getFinalOutput(): Record<string, unknown> {
    // Look for output nodes
    const outputNodes: WorkflowNode[] = [];
    for (const node of this.nodeMap.values()) {
      if (node.type === 'output') {
        outputNodes.push(node);
      }
    }

    if (outputNodes.length > 0) {
      const merged: Record<string, unknown> = {};
      for (const outputNode of outputNodes) {
        const nodeOutput = this.outputs.get(outputNode.id)?.data;
        if (nodeOutput) {
          Object.assign(merged, nodeOutput);
        }
      }
      return merged;
    }

    // Fallback: return the last produced output
    let lastOutput: NodeOutput | undefined;
    for (const output of this.outputs.values()) {
      if (!lastOutput || output.timestamp > lastOutput.timestamp) {
        lastOutput = output;
      }
    }

    return lastOutput?.data ?? {};
  }

  // -----------------------------------------------------------------------
  // Serialisation
  // -----------------------------------------------------------------------

  /** Serialise the full context state (for persistence / debugging). */
  toJSON(): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};
    for (const [id, output] of this.outputs) {
      outputs[id] = output;
    }
    return {
      input: this.input,
      outputs,
      sharedContext: this.getSharedContext(),
      variables: Object.fromEntries(this.variables),
    };
  }
}
