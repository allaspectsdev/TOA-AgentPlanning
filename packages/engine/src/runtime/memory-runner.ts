// ---------------------------------------------------------------------------
// Memory Runner — manages memory node operations
// ---------------------------------------------------------------------------

import type { MemoryNode } from '@toa/shared';
import type { ExecutionContext } from './context.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryRunnerResult {
  output: Record<string, unknown>;
  operation: string;
}

// ---------------------------------------------------------------------------
// In-Memory Stores (per-execution)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory storage backend. In production, these would be backed
 * by Redis, PostgreSQL, or a vector database.
 */

/** Conversation buffer: stores message history per namespace. */
const conversationBuffers = new Map<string, Array<{ role: string; content: string; timestamp: string }>>();

/** Key-value store: simple string/JSON key-value pairs per namespace. */
const keyValueStore = new Map<string, Map<string, unknown>>();

/** Summary store: stores summary text per namespace. */
const summaryStore = new Map<string, string>();

// ---------------------------------------------------------------------------
// Namespace Resolution
// ---------------------------------------------------------------------------

function resolveNamespace(node: MemoryNode, executionId?: string): string {
  const base = node.data.namespace ?? node.id;
  // Scope to execution to prevent cross-execution contamination
  return executionId ? `${executionId}:${base}` : base;
}

// ---------------------------------------------------------------------------
// Conversation Buffer Operations
// ---------------------------------------------------------------------------

function readConversationBuffer(
  namespace: string,
): Array<{ role: string; content: string; timestamp: string }> {
  return conversationBuffers.get(namespace) ?? [];
}

function writeConversationBuffer(
  namespace: string,
  messages: Array<{ role: string; content: string }>,
): void {
  const existing = conversationBuffers.get(namespace) ?? [];
  const timestamped = messages.map((m) => ({
    ...m,
    timestamp: new Date().toISOString(),
  }));
  conversationBuffers.set(namespace, [...existing, ...timestamped]);
}

function clearConversationBuffer(namespace: string): void {
  conversationBuffers.delete(namespace);
}

// ---------------------------------------------------------------------------
// Key-Value Operations
// ---------------------------------------------------------------------------

function readKeyValue(
  namespace: string,
  key?: string,
): Record<string, unknown> {
  const store = keyValueStore.get(namespace);
  if (!store) return {};

  if (key) {
    return { [key]: store.get(key) ?? null };
  }

  // Return all key-value pairs
  const result: Record<string, unknown> = {};
  for (const [k, v] of store) {
    result[k] = v;
  }
  return result;
}

function writeKeyValue(
  namespace: string,
  data: Record<string, unknown>,
): void {
  let store = keyValueStore.get(namespace);
  if (!store) {
    store = new Map();
    keyValueStore.set(namespace, store);
  }
  for (const [key, value] of Object.entries(data)) {
    store.set(key, value);
  }
}

function clearKeyValue(namespace: string): void {
  keyValueStore.delete(namespace);
}

// ---------------------------------------------------------------------------
// Summary Operations
// ---------------------------------------------------------------------------

function readSummary(namespace: string): string | null {
  return summaryStore.get(namespace) ?? null;
}

function writeSummary(namespace: string, summary: string): void {
  summaryStore.set(namespace, summary);
}

function clearSummary(namespace: string): void {
  summaryStore.delete(namespace);
}

// ---------------------------------------------------------------------------
// Vector Store Operations (Stub)
// ---------------------------------------------------------------------------

/**
 * Vector store search stub. In production, this would:
 * 1. Embed the query using the configured embedding model.
 * 2. Search the vector database for similar documents.
 * 3. Return the top-K results above the similarity threshold.
 */
function searchVectorStore(
  _namespace: string,
  query: string,
  _config?: {
    embeddingModel?: string;
    topK?: number;
    similarityThreshold?: number;
  },
): Array<{ id: string; content: string; score: number; metadata: Record<string, unknown> }> {
  // Stub: return empty results
  return [];
}

function writeVectorStore(
  _namespace: string,
  _documents: Array<{ content: string; metadata?: Record<string, unknown> }>,
): { count: number } {
  // Stub: acknowledge the write but don't actually store
  return { count: _documents.length };
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

/**
 * Execute a memory node operation.
 *
 * Memory types:
 * - `conversation_buffer` — read/write message history
 * - `summary` — read/write summarized conversation state
 * - `vector_store` — search/write to a vector database (stub)
 * - `key_value` — read/write arbitrary key-value pairs
 *
 * Operations:
 * - `read` — retrieve data from the store
 * - `write` — persist data to the store
 * - `search` — search within the store (vector only)
 * - `clear` — remove all data in the namespace
 */
export async function runMemoryNode(
  node: MemoryNode,
  context: ExecutionContext,
  executionId?: string,
): Promise<MemoryRunnerResult> {
  const namespace = resolveNamespace(node, executionId);
  const inputs = context.getInputsFor(node.id);
  const { memoryType, operation } = node.data;

  let output: Record<string, unknown> = {};

  switch (memoryType) {
    // ----- Conversation Buffer -----
    case 'conversation_buffer': {
      switch (operation) {
        case 'read': {
          const messages = readConversationBuffer(namespace);
          output = { messages, count: messages.length };
          break;
        }
        case 'write': {
          const messagesToWrite = (inputs['messages'] as Array<{
            role: string;
            content: string;
          }>) ?? [];

          // If no explicit messages, create one from the input text
          if (messagesToWrite.length === 0 && inputs['text']) {
            messagesToWrite.push({
              role: (inputs['role'] as string) ?? 'user',
              content: String(inputs['text']),
            });
          }

          writeConversationBuffer(namespace, messagesToWrite);
          output = { written: messagesToWrite.length, namespace };
          break;
        }
        case 'search': {
          // For conversation buffers, "search" is a simple text match
          const query = String(inputs['query'] ?? '');
          const allMessages = readConversationBuffer(namespace);
          const matched = allMessages.filter((m) =>
            m.content.toLowerCase().includes(query.toLowerCase()),
          );
          output = { messages: matched, count: matched.length, query };
          break;
        }
        case 'clear': {
          clearConversationBuffer(namespace);
          output = { cleared: true, namespace };
          break;
        }
      }
      break;
    }

    // ----- Summary -----
    case 'summary': {
      switch (operation) {
        case 'read': {
          const summary = readSummary(namespace);
          output = { summary, exists: summary !== null };
          break;
        }
        case 'write': {
          const summaryText = String(inputs['summary'] ?? inputs['text'] ?? '');
          writeSummary(namespace, summaryText);
          output = { written: true, namespace };
          break;
        }
        case 'clear': {
          clearSummary(namespace);
          output = { cleared: true, namespace };
          break;
        }
        default: {
          output = { error: `Operation "${operation}" not supported for summary memory.` };
        }
      }
      break;
    }

    // ----- Vector Store -----
    case 'vector_store': {
      switch (operation) {
        case 'search': {
          const query = String(inputs['query'] ?? '');
          const results = searchVectorStore(namespace, query, node.data.vectorConfig);
          output = { results, count: results.length, query };
          break;
        }
        case 'write': {
          const documents = (inputs['documents'] as Array<{
            content: string;
            metadata?: Record<string, unknown>;
          }>) ?? [];

          // If no explicit documents, create one from input
          if (documents.length === 0 && inputs['content']) {
            documents.push({
              content: String(inputs['content']),
              metadata: (inputs['metadata'] as Record<string, unknown>) ?? {},
            });
          }

          const result = writeVectorStore(namespace, documents);
          output = { indexed: result.count, namespace };
          break;
        }
        case 'clear': {
          // Stub: vector store clear
          output = { cleared: true, namespace };
          break;
        }
        default: {
          output = { error: `Operation "${operation}" not supported for vector store.` };
        }
      }
      break;
    }

    // ----- Key-Value -----
    case 'key_value': {
      switch (operation) {
        case 'read': {
          const key = inputs['key'] as string | undefined;
          output = readKeyValue(namespace, key);
          break;
        }
        case 'write': {
          const data: Record<string, unknown> = {};
          // Write all input fields as key-value pairs
          for (const [k, v] of Object.entries(inputs)) {
            data[k] = v;
          }
          writeKeyValue(namespace, data);
          output = { written: Object.keys(data).length, namespace };
          break;
        }
        case 'search': {
          // For KV, search is a prefix match on keys
          const prefix = String(inputs['prefix'] ?? inputs['query'] ?? '');
          const allData = readKeyValue(namespace);
          const matched: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(allData)) {
            if (k.startsWith(prefix)) {
              matched[k] = v;
            }
          }
          output = { results: matched, count: Object.keys(matched).length };
          break;
        }
        case 'clear': {
          clearKeyValue(namespace);
          output = { cleared: true, namespace };
          break;
        }
      }
      break;
    }

    default:
      throw new Error(
        `Unknown memory type "${memoryType}" on node "${node.id}".`,
      );
  }

  return {
    output: {
      ...output,
      _memoryType: memoryType,
      _operation: operation,
      _namespace: namespace,
    },
    operation,
  };
}

// ---------------------------------------------------------------------------
// Store Cleanup (for testing)
// ---------------------------------------------------------------------------

/** Clear all in-memory stores. Useful for testing. */
export function clearAllMemoryStores(): void {
  conversationBuffers.clear();
  keyValueStore.clear();
  summaryStore.clear();
}
