// ---------------------------------------------------------------------------
// Agent Runner — executes agent nodes using @anthropic-ai/sdk
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import type { AgentNode } from '@toa/shared';
import type { ExecutionContext } from './context.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRunnerResult {
  output: Record<string, unknown>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  stopReason: string | null;
}

// ---------------------------------------------------------------------------
// Client Singleton
// ---------------------------------------------------------------------------

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

/**
 * Override the Anthropic client (useful for testing).
 */
export function setAnthropicClient(client: Anthropic): void {
  anthropicClient = client;
}

// ---------------------------------------------------------------------------
// Tool Definition Conversion
// ---------------------------------------------------------------------------

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Build Anthropic tool definitions from tool name strings.
 * In a full implementation, these would be resolved from a tool registry.
 * For now, we create stub tool definitions.
 */
function buildToolDefinitions(toolNames: string[]): AnthropicTool[] {
  return toolNames.map((name) => ({
    name,
    description: `Tool: ${name}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        input: { type: 'string', description: 'Input for the tool' },
      },
    },
  }));
}

// ---------------------------------------------------------------------------
// Message Building
// ---------------------------------------------------------------------------

function buildMessages(
  inputs: Record<string, unknown>,
): Anthropic.Messages.MessageParam[] {
  const messages: Anthropic.Messages.MessageParam[] = [];

  // If inputs contain a "messages" array, use it directly
  if (Array.isArray(inputs['messages'])) {
    for (const msg of inputs['messages'] as Array<{
      role?: string;
      content?: string;
    }>) {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }
    if (messages.length > 0) return messages;
  }

  // Otherwise, build a single user message from all input data
  const parts: string[] = [];

  for (const [key, value] of Object.entries(inputs)) {
    if (key === 'messages') continue;
    if (value === undefined || value === null) continue;

    const valueStr =
      typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    parts.push(`**${key}:**\n${valueStr}`);
  }

  if (parts.length === 0) {
    // Provide a minimal user message if no inputs
    messages.push({ role: 'user', content: 'Begin.' });
  } else {
    messages.push({ role: 'user', content: parts.join('\n\n') });
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Execute an agent node by calling the Anthropic Messages API.
 *
 * 1. Resolves inputs from the execution context.
 * 2. Builds the message array from upstream data.
 * 3. Calls the API with the node's model, system prompt, temperature, etc.
 * 4. Extracts text output and tool calls from the response.
 */
export async function runAgentNode(
  node: AgentNode,
  context: ExecutionContext,
): Promise<AgentRunnerResult> {
  const client = getAnthropicClient();
  const inputs = context.getInputsFor(node.id);
  const messages = buildMessages(inputs);

  // Build tool definitions if the agent has tools configured
  const tools =
    node.data.tools.length > 0
      ? buildToolDefinitions(node.data.tools)
      : undefined;

  // Resolve the system prompt (may contain template expressions)
  const systemPrompt =
    typeof context.resolveTemplate(node.data.systemPrompt) === 'string'
      ? (context.resolveTemplate(node.data.systemPrompt) as string)
      : node.data.systemPrompt;

  const requestParams: Anthropic.Messages.MessageCreateParams = {
    model: node.data.model,
    max_tokens: node.data.maxTokens,
    temperature: node.data.temperature,
    system: systemPrompt,
    messages,
    ...(tools && tools.length > 0 ? { tools } : {}),
  };

  const response = await client.messages.create(requestParams);

  // Extract outputs
  const textParts: string[] = [];
  const toolCalls: Array<{ name: string; input: unknown; id: string }> = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        input: block.input,
        id: block.id,
      });
    }
  }

  const textOutput = textParts.join('\n');

  // Try to parse JSON from the text output for structured data
  let parsedOutput: Record<string, unknown> | null = null;
  try {
    const jsonMatch = textOutput.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      parsedOutput = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
    } else {
      // Try parsing the entire text as JSON
      const trimmed = textOutput.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        parsedOutput = JSON.parse(trimmed) as Record<string, unknown>;
      }
    }
  } catch {
    // Not JSON, that's fine
  }

  const output: Record<string, unknown> = {
    text: textOutput,
    ...(parsedOutput ? { data: parsedOutput } : {}),
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
    model: response.model,
    stopReason: response.stop_reason,
  };

  // Apply output mapping if defined
  if (node.data.outputMapping) {
    for (const [outputKey, sourcePath] of Object.entries(
      node.data.outputMapping,
    )) {
      const value = getNestedValue(output, sourcePath);
      if (value !== undefined) {
        output[outputKey] = value;
      }
    }
  }

  return {
    output,
    tokenUsage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    model: response.model,
    stopReason: response.stop_reason,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}
