export { DataEdge } from './DataEdge.js';
export { ConditionalEdge } from './ConditionalEdge.js';

import { DataEdge } from './DataEdge.js';
import { ConditionalEdge } from './ConditionalEdge.js';

/**
 * Map of all custom edge types for React Flow's `edgeTypes` prop.
 * Pass this directly to `<ReactFlow edgeTypes={edgeTypes} />`.
 */
export const edgeTypes = {
  data: DataEdge,
  conditional: ConditionalEdge,
} as const;
