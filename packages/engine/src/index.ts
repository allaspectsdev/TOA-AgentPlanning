// ---------------------------------------------------------------------------
// @toa/engine — Root re-exports
// ---------------------------------------------------------------------------

// Inngest client & functions
export { inngest, type ToaInngest } from './inngest/client';
export type { Events, EventData } from './inngest/events';
export { inngestFunctions } from './inngest/serve';
export { executeWorkflow } from './inngest/functions/execute-workflow';
export { handleGateApproval } from './inngest/functions/handle-gate-approval';
export { executeNode, type NodeExecutionResult } from './inngest/functions/execute-node';

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
} from './compiler/index';

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
} from './runtime/index';

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
} from './mcp/index';
