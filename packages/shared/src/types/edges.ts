// ---------------------------------------------------------------------------
// Edge Types
// ---------------------------------------------------------------------------

/** Fields shared by every edge variant. */
export interface BaseEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Standard data-flow edge between two nodes. */
export interface DataEdge extends BaseEdge {
  type: 'data';
  data?: {
    label?: string;
    /** Optional JS expression applied to transform values along this edge. */
    dataTransform?: string;
  };
}

/** Edge that represents a conditional branch (used with Condition nodes). */
export interface ConditionalEdge extends BaseEdge {
  type: 'conditional';
  data: {
    /** ID of the condition rule this edge corresponds to. */
    conditionId: string;
    label: string;
  };
}

/** Discriminated union of all edge types. */
export type WorkflowEdge = DataEdge | ConditionalEdge;

/** String-literal union of every edge `type` discriminant. */
export type EdgeType = WorkflowEdge['type'];
