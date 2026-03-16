// ---------------------------------------------------------------------------
// @toa/engine — Root re-exports
// ---------------------------------------------------------------------------

// Inngest client & functions
export { inngest, type ToaInngest } from './inngest/client.js';
export type { Events, EventData } from './inngest/events.js';
export { inngestFunctions } from './inngest/serve.js';
export { executeWorkflow } from './inngest/functions/execute-workflow.js';
export { handleGateApproval } from './inngest/functions/handle-gate-approval.js';
export { executeNode, type NodeExecutionResult } from './inngest/functions/execute-node.js';

// Compiler
export {
  compileWorkflow,
  CompilationError,
  topologicalSortWithGroups,
  refineParallelGroups,
  validateWorkflow,
  validateWorkflowStructure,
  type ExecutionPlan,
  type ExecutionPlanGroup,
  type ExecutionPlanStep,
  type ParallelGroup,
  type TopologicalResult,
  type ValidationResult,
  type ValidationError,
} from './compiler/index.js';

// Runtime
export {
  ExecutionContext,
  runAgentNode,
  runToolNode,
  runConditionNode,
  runGateNode,
  runMemoryNode,
  setAnthropicClient,
  createGateApproval,
  evaluateGateResponses,
  handleGateTimeout,
  processGateResponse,
  clearAllMemoryStores,
  type NodeOutput,
  type ResolvedInputs,
  type AgentRunnerResult,
  type ToolRunnerResult,
  type ConditionRunnerResult,
  type GateRunnerResult,
  type GateResolutionResult,
  type MemoryRunnerResult,
} from './runtime/index.js';

// MCP
export {
  connectToServer,
  disconnectFromServer,
  disconnectAll,
  callMcpTool,
  listServerTools,
  registerServer,
  unregisterServer,
  getServer,
  getServerByUri,
  listServers,
  refreshServerTools,
  findTool,
  listAllTools,
  clearRegistry,
  type McpToolDefinition,
  type McpServerConnection,
  type McpServerEntry,
} from './mcp/index.js';
