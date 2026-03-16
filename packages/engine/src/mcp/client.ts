// ---------------------------------------------------------------------------
// MCP Client — stub for connecting to MCP servers and calling tools
// ---------------------------------------------------------------------------
//
// The Model Context Protocol (MCP) allows agents to interact with external
// tool servers over a standardised interface. This module provides a client
// that connects to MCP servers and invokes their tools.
//
// Current status: STUB — the actual MCP transport (stdio / HTTP+SSE) is not
// yet implemented. The interface is defined so that other engine components
// can depend on it and be wired up once the transport layer is ready.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServerConnection {
  uri: string;
  connected: boolean;
  tools: McpToolDefinition[];
}

// ---------------------------------------------------------------------------
// Connection Management
// ---------------------------------------------------------------------------

/** Active connections indexed by server URI. */
const connections = new Map<string, McpServerConnection>();

/**
 * Connect to an MCP server. In production, this would:
 * 1. Establish a transport (stdio subprocess or HTTP+SSE).
 * 2. Send the `initialize` request.
 * 3. Retrieve the tool list via `tools/list`.
 *
 * For now, returns a stub connection.
 */
export async function connectToServer(uri: string): Promise<McpServerConnection> {
  const existing = connections.get(uri);
  if (existing?.connected) {
    return existing;
  }

  // Stub: create a placeholder connection
  const connection: McpServerConnection = {
    uri,
    connected: true,
    tools: [],
  };

  connections.set(uri, connection);
  return connection;
}

/**
 * Disconnect from an MCP server.
 */
export async function disconnectFromServer(uri: string): Promise<void> {
  const connection = connections.get(uri);
  if (connection) {
    connection.connected = false;
    connections.delete(uri);
  }
}

/**
 * List all tools available on a connected MCP server.
 */
export async function listServerTools(
  uri: string,
): Promise<McpToolDefinition[]> {
  const connection = connections.get(uri);
  if (!connection?.connected) {
    await connectToServer(uri);
  }

  // Stub: return empty tool list
  // In production, this would call `tools/list` on the MCP transport.
  return connections.get(uri)?.tools ?? [];
}

// ---------------------------------------------------------------------------
// Tool Invocation
// ---------------------------------------------------------------------------

/**
 * Call a tool on an MCP server.
 *
 * In production, this would:
 * 1. Ensure connection to the server.
 * 2. Send a `tools/call` request with the tool name and arguments.
 * 3. Parse and return the tool result.
 *
 * @param serverUri  The MCP server URI (e.g., "stdio:///path/to/server" or "https://mcp.example.com")
 * @param toolName   The name of the tool to invoke.
 * @param args       Arguments to pass to the tool.
 * @returns          The tool's output as a Record.
 */
export async function callMcpTool(
  serverUri: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Ensure connected
  let connection = connections.get(serverUri);
  if (!connection?.connected) {
    connection = await connectToServer(serverUri);
  }

  // Stub implementation: return a placeholder result
  // In production, this would send a JSON-RPC request over the transport.
  return {
    _mcp: true,
    _server: serverUri,
    _tool: toolName,
    _args: args,
    result: null,
    message: `MCP tool "${toolName}" called on server "${serverUri}" (stub — transport not yet implemented).`,
  };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Disconnect from all MCP servers. Call during shutdown.
 */
export async function disconnectAll(): Promise<void> {
  const uris = Array.from(connections.keys());
  await Promise.all(uris.map(disconnectFromServer));
}
