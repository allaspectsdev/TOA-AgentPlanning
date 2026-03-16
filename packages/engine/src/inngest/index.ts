// ---------------------------------------------------------------------------
// Inngest Module — re-exports
// ---------------------------------------------------------------------------

export { inngest, type ToaInngest } from './client';
export type { Events, EventData } from './events';

export { executeWorkflow } from './functions/execute-workflow';
export { handleGateApproval } from './functions/handle-gate-approval';
export { executeNode, type NodeExecutionResult } from './functions/execute-node';

/**
 * All Inngest functions that should be registered with the Inngest serve handler.
 * Usage:
 *   import { inngestFunctions } from '@toa/engine/inngest';
 *   serve({ client: inngest, functions: inngestFunctions });
 */
export { inngestFunctions } from './serve';
