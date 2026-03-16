// ---------------------------------------------------------------------------
// MCP Module — re-exports
// ---------------------------------------------------------------------------

export {
  connectToServer,
  disconnectFromServer,
  disconnectAll,
  listServerTools,
  callMcpTool,
  type McpToolDefinition,
  type McpServerConnection,
} from './client.js';

export {
  registerServer,
  updateServer,
  unregisterServer,
  getServer,
  getServerByUri,
  listServers,
  refreshServerTools,
  refreshAllServerTools,
  findTool,
  listAllTools,
  clearRegistry,
  type McpServerEntry,
} from './registry.js';
