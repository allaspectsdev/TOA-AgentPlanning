// ---------------------------------------------------------------------------
// Inngest Function Registry
// ---------------------------------------------------------------------------
//
// Collects all Inngest functions into a single array for registration
// with the Inngest serve handler.
// ---------------------------------------------------------------------------

import { executeWorkflow } from './functions/execute-workflow.js';
import { handleGateApproval } from './functions/handle-gate-approval.js';

/**
 * All Inngest functions that the engine exposes.
 * Pass this to `serve()` in your API route handler.
 *
 * @example
 * ```ts
 * import { serve } from 'inngest/next';
 * import { inngest, inngestFunctions } from '@toa/engine/inngest';
 *
 * export const { GET, POST, PUT } = serve({
 *   client: inngest,
 *   functions: inngestFunctions,
 * });
 * ```
 */
export const inngestFunctions = [
  executeWorkflow,
  handleGateApproval,
];
