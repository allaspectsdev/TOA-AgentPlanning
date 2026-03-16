export { DataEdge } from './DataEdge';
export { ConditionalEdge } from './ConditionalEdge';

import { DataEdge } from './DataEdge';
import { ConditionalEdge } from './ConditionalEdge';

/**
 * Map of all custom edge types for React Flow's `edgeTypes` prop.
 * Pass this directly to `<ReactFlow edgeTypes={edgeTypes} />`.
 */
export const edgeTypes = {
  data: DataEdge,
  conditional: ConditionalEdge,
} as const;
