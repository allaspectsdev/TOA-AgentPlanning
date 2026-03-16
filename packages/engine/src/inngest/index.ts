// ---------------------------------------------------------------------------
// Inngest Module — re-exports
// ---------------------------------------------------------------------------

export { inngest, type ToaInngest } from './client.js';
export type { Events, EventData } from './events.js';

export { executeWorkflow } from './functions/execute-workflow.js';
export { handleGateApproval } from './functions/handle-gate-approval.js';
export { executeNode, type NodeExecutionResult } from './functions/execute-node.js';

/**
 * All Inngest functions that should be registered with the Inngest serve handler.
 * Usage:
 *   import { inngestFunctions } from '@toa/engine/inngest';
 *   serve({ client: inngest, functions: inngestFunctions });
 */
export { inngestFunctions } from './serve.js';
