// ---------------------------------------------------------------------------
// MCP Server Registry
// ---------------------------------------------------------------------------
//
// Maintains a registry of known MCP servers that workflows can reference.
// Each entry stores the server URI, a human-readable name, and metadata
// about the tools it exposes.
// ---------------------------------------------------------------------------

import { listServerTools, type McpToolDefinition } from './client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpServerEntry {
  /** Unique identifier for this server in the registry. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Server URI (e.g., "stdio:///usr/local/bin/mcp-files" or "https://mcp.example.com"). */
  uri: string;
  /** Optional description of the server's purpose. */
  description?: string;
  /** Tags for filtering / categorisation. */
  tags: string[];
  /** Whether the server is currently enabled. */
  enabled: boolean;
  /** Cached list of tools (populated on refresh). */
  tools: McpToolDefinition[];
  /** Last time the tool list was refreshed. */
  lastRefreshed?: string;
}

// ---------------------------------------------------------------------------
// Registry Store
// ---------------------------------------------------------------------------

const registry = new Map<string, McpServerEntry>();

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Register a new MCP server in the registry.
 */
export function registerServer(
  entry: Omit<McpServerEntry, 'tools' | 'lastRefreshed'>,
): McpServerEntry {
  const existing = registry.get(entry.id);
  if (existing) {
    throw new Error(`MCP server with ID "${entry.id}" is already registered.`);
  }

  const fullEntry: McpServerEntry = {
    ...entry,
    tools: [],
    lastRefreshed: undefined,
  };

  registry.set(entry.id, fullEntry);
  return fullEntry;
}

/**
 * Update an existing MCP server entry.
 */
export function updateServer(
  id: string,
  updates: Partial<Omit<McpServerEntry, 'id' | 'tools' | 'lastRefreshed'>>,
): McpServerEntry {
  const entry = registry.get(id);
  if (!entry) {
    throw new Error(`MCP server with ID "${id}" not found.`);
  }

  const updated = { ...entry, ...updates };
  registry.set(id, updated);
  return updated;
}

/**
 * Remove an MCP server from the registry.
 */
export function unregisterServer(id: string): boolean {
  return registry.delete(id);
}

/**
 * Get an MCP server entry by ID.
 */
export function getServer(id: string): McpServerEntry | undefined {
  return registry.get(id);
}

/**
 * Get an MCP server entry by URI.
 */
export function getServerByUri(uri: string): McpServerEntry | undefined {
  for (const entry of registry.values()) {
    if (entry.uri === uri) return entry;
  }
  return undefined;
}

/**
 * List all registered MCP servers.
 */
export function listServers(options?: {
  enabledOnly?: boolean;
  tags?: string[];
}): McpServerEntry[] {
  let entries = Array.from(registry.values());

  if (options?.enabledOnly) {
    entries = entries.filter((e) => e.enabled);
  }

  if (options?.tags && options.tags.length > 0) {
    const tagSet = new Set(options.tags);
    entries = entries.filter((e) => e.tags.some((t) => tagSet.has(t)));
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Tool Discovery
// ---------------------------------------------------------------------------

/**
 * Refresh the tool list for a registered server by connecting to it
 * and querying its available tools.
 */
export async function refreshServerTools(id: string): Promise<McpServerEntry> {
  const entry = registry.get(id);
  if (!entry) {
    throw new Error(`MCP server with ID "${id}" not found.`);
  }

  const tools = await listServerTools(entry.uri);

  const updated: McpServerEntry = {
    ...entry,
    tools,
    lastRefreshed: new Date().toISOString(),
  };

  registry.set(id, updated);
  return updated;
}

/**
 * Refresh tools for all enabled servers.
 */
export async function refreshAllServerTools(): Promise<McpServerEntry[]> {
  const enabledServers = listServers({ enabledOnly: true });
  const results = await Promise.allSettled(
    enabledServers.map((s) => refreshServerTools(s.id)),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<McpServerEntry> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);
}

/**
 * Find a tool across all registered servers by tool name.
 */
export function findTool(
  toolName: string,
): { server: McpServerEntry; tool: McpToolDefinition } | undefined {
  for (const entry of registry.values()) {
    if (!entry.enabled) continue;
    const tool = entry.tools.find((t) => t.name === toolName);
    if (tool) return { server: entry, tool };
  }
  return undefined;
}

/**
 * List all tools across all enabled servers.
 */
export function listAllTools(): Array<{
  serverId: string;
  serverName: string;
  tool: McpToolDefinition;
}> {
  const result: Array<{
    serverId: string;
    serverName: string;
    tool: McpToolDefinition;
  }> = [];

  for (const entry of registry.values()) {
    if (!entry.enabled) continue;
    for (const tool of entry.tools) {
      result.push({
        serverId: entry.id,
        serverName: entry.name,
        tool,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Clear the entire registry. Useful for testing.
 */
export function clearRegistry(): void {
  registry.clear();
}
