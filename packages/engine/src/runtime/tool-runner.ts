// ---------------------------------------------------------------------------
// Tool Runner — executes tool nodes
// ---------------------------------------------------------------------------

import type { ToolNode } from '@toa/shared';
import type { ExecutionContext } from './context.js';
import { callMcpTool } from '../mcp/client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolRunnerResult {
  output: Record<string, unknown>;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// HTTP Request Runner
// ---------------------------------------------------------------------------

async function runHttpRequest(
  node: ToolNode,
  inputs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const config = node.data.httpConfig;
  if (!config) {
    throw new Error(`HTTP tool node "${node.id}" is missing httpConfig.`);
  }

  // Resolve template variables in URL and body
  let url = config.url;
  let body = config.body;

  // Simple {{key}} replacement in URL and body from inputs
  for (const [key, value] of Object.entries(inputs)) {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === 'string' ? value : JSON.stringify(value);
    url = url.replaceAll(placeholder, replacement);
    if (body) {
      body = body.replaceAll(placeholder, replacement);
    }
  }

  const headers = new Headers(config.headers);

  // Apply authentication
  if (config.authentication) {
    switch (config.authentication.type) {
      case 'bearer':
        // In production, resolve credentialId from a secret store
        headers.set(
          'Authorization',
          `Bearer ${config.authentication.credentialId}`,
        );
        break;
      case 'api_key':
        headers.set('X-API-Key', config.authentication.credentialId);
        break;
      case 'basic':
        headers.set(
          'Authorization',
          `Basic ${btoa(config.authentication.credentialId)}`,
        );
        break;
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
  };

  if (
    body &&
    config.method !== 'GET' &&
    config.method !== 'HEAD'
  ) {
    fetchOptions.body = body;
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, fetchOptions);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let responseBody: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    ok: response.ok,
  };
}

// ---------------------------------------------------------------------------
// Code Execution Runner (sandboxed)
// ---------------------------------------------------------------------------

async function runCodeExecution(
  node: ToolNode,
  inputs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const config = node.data.codeConfig;
  if (!config) {
    throw new Error(`Code tool node "${node.id}" is missing codeConfig.`);
  }

  if (config.language === 'python') {
    throw new Error(
      'Python code execution is not yet supported. Use JavaScript or TypeScript.',
    );
  }

  // Sandboxed execution using Function constructor
  // In production, this should use a proper sandbox (e.g., isolated-vm, Deno)
  const timeoutMs = config.timeout * 1000;

  const result = await Promise.race([
    (async () => {
      try {
        // Build a function that receives `inputs` and returns a result
        const fn = new Function(
          'inputs',
          'console',
          `"use strict";
          const __log = [];
          const __console = {
            log: (...args) => __log.push({ level: 'info', message: args.map(String).join(' ') }),
            warn: (...args) => __log.push({ level: 'warn', message: args.map(String).join(' ') }),
            error: (...args) => __log.push({ level: 'error', message: args.map(String).join(' ') }),
            info: (...args) => __log.push({ level: 'info', message: args.map(String).join(' ') }),
          };
          const __result = (async () => {
            ${config.code}
          })();
          return __result.then((r) => ({ result: r, logs: __log }));`,
        );

        const { result: execResult, logs } = (await fn(inputs, undefined)) as {
          result: unknown;
          logs: Array<{ level: string; message: string }>;
        };

        const output: Record<string, unknown> =
          typeof execResult === 'object' && execResult !== null
            ? (execResult as Record<string, unknown>)
            : { value: execResult };

        if (logs.length > 0) {
          output['_logs'] = logs;
        }

        return output;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          error: true,
          message: `Code execution failed: ${message}`,
        };
      }
    })(),
    new Promise<Record<string, unknown>>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Code execution timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);

  return result;
}

// ---------------------------------------------------------------------------
// MCP Tool Runner
// ---------------------------------------------------------------------------

async function runMcpTool(
  node: ToolNode,
  inputs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const config = node.data.mcpConfig;
  if (!config) {
    throw new Error(`MCP tool node "${node.id}" is missing mcpConfig.`);
  }

  // Map inputs according to the MCP input mapping
  const mappedInputs: Record<string, unknown> = {};
  for (const [mcpParam, sourceKey] of Object.entries(config.inputMapping)) {
    mappedInputs[mcpParam] = inputs[sourceKey] ?? inputs[mcpParam];
  }

  const result = await callMcpTool(
    config.serverUri,
    config.toolName,
    mappedInputs,
  );

  return result;
}

// ---------------------------------------------------------------------------
// Main Dispatcher
// ---------------------------------------------------------------------------

/**
 * Execute a tool node and return its output.
 *
 * Routes to the appropriate sub-runner based on `toolType`:
 * - `http_request` — makes an HTTP request
 * - `code_execution` — runs sandboxed JavaScript/TypeScript
 * - `mcp` — calls an MCP server tool
 * - `file_io` / `database` — stubs for future implementation
 */
export async function runToolNode(
  node: ToolNode,
  context: ExecutionContext,
): Promise<ToolRunnerResult> {
  const startTime = Date.now();
  const inputs = context.getInputsFor(node.id);

  let output: Record<string, unknown>;

  switch (node.data.toolType) {
    case 'http_request':
      output = await runHttpRequest(node, inputs);
      break;

    case 'code_execution':
      output = await runCodeExecution(node, inputs);
      break;

    case 'mcp':
      output = await runMcpTool(node, inputs);
      break;

    case 'file_io':
      // Stub: file I/O operations would be implemented with a sandboxed filesystem
      output = {
        error: false,
        message: 'File I/O operations are not yet implemented.',
        inputs,
      };
      break;

    case 'database':
      // Stub: database operations would be implemented with a query builder
      output = {
        error: false,
        message: 'Database tool operations are not yet implemented.',
        inputs,
      };
      break;

    default:
      throw new Error(
        `Unknown tool type "${node.data.toolType}" on node "${node.id}".`,
      );
  }

  const durationMs = Date.now() - startTime;

  return { output, durationMs };
}
