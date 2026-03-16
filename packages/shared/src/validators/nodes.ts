// ---------------------------------------------------------------------------
// Zod Schemas — Node Data Validation
// ---------------------------------------------------------------------------

import { z } from 'zod';
import {
  MAX_NODE_LABEL_LENGTH,
  MAX_SYSTEM_PROMPT_LENGTH,
  MAX_AGENTS_PER_TEAM,
  MAX_TEAM_ROUNDS,
  MAX_GATE_TIMEOUT_MINUTES,
  MAX_NODE_RETRIES,
} from '../constants/limits.js';

// ---------------------------------------------------------------------------
// Shared / Reusable Schemas
// ---------------------------------------------------------------------------

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const portSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  type: z.enum(['input', 'output']),
  dataType: z.enum(['any', 'string', 'json', 'boolean', 'number', 'file']).optional(),
});

export const retryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(MAX_NODE_RETRIES),
  backoffMs: z.number().int().min(0),
  backoffMultiplier: z.number().min(1),
});

export const baseNodeDataSchema = z.object({
  label: z.string().min(1).max(MAX_NODE_LABEL_LENGTH),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
  retryPolicy: retryPolicySchema.optional(),
});

// ---------------------------------------------------------------------------
// Agent Node Data
// ---------------------------------------------------------------------------

export const memoryConfigSchema = z.object({
  type: z.enum(['conversation', 'summary', 'vector']),
  maxMessages: z.number().int().positive().optional(),
  memoryNodeId: z.string().optional(),
});

export const agentNodeDataSchema = baseNodeDataSchema.extend({
  model: z.string().min(1),
  systemPrompt: z.string().max(MAX_SYSTEM_PROMPT_LENGTH),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  tools: z.array(z.string()),
  memoryConfig: memoryConfigSchema.optional(),
  inputMapping: z.record(z.string(), z.string()).optional(),
  outputMapping: z.record(z.string(), z.string()).optional(),
  templateId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Team Node Data
// ---------------------------------------------------------------------------

export const teamAgentEntrySchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  agentConfig: agentNodeDataSchema,
});

export const terminationConditionSchema = z.object({
  type: z.enum(['consensus', 'supervisor_decision', 'max_rounds', 'quality_threshold']),
  config: z.record(z.string(), z.unknown()),
});

export const teamNodeDataSchema = baseNodeDataSchema.extend({
  pattern: z.enum([
    'sequential',
    'parallel',
    'supervisor',
    'debate',
    'round_robin',
    'custom',
  ]),
  agents: z.array(teamAgentEntrySchema).min(1).max(MAX_AGENTS_PER_TEAM),
  supervisorAgentId: z.string().optional(),
  maxRounds: z.number().int().positive().max(MAX_TEAM_ROUNDS).optional(),
  communicationProtocol: z.enum([
    'shared_context',
    'message_passing',
    'blackboard',
  ]),
  terminationCondition: terminationConditionSchema.optional(),
  templateId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Trigger Node Data
// ---------------------------------------------------------------------------

export const webhookConfigSchema = z.object({
  path: z.string().min(1),
  method: z.enum(['GET', 'POST']),
  secret: z.string().optional(),
});

export const scheduleConfigSchema = z.object({
  cron: z.string().min(1),
  timezone: z.string().min(1),
});

export const eventConfigSchema = z.object({
  eventName: z.string().min(1),
  filter: z.string().optional(),
});

export const triggerNodeDataSchema = baseNodeDataSchema.extend({
  triggerType: z.enum(['manual', 'webhook', 'schedule', 'event']),
  webhookConfig: webhookConfigSchema.optional(),
  scheduleConfig: scheduleConfigSchema.optional(),
  eventConfig: eventConfigSchema.optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Gate Node Data
// ---------------------------------------------------------------------------

export const gateInputFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'select', 'boolean', 'number']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const escalationConfigSchema = z.object({
  afterMinutes: z.number().positive(),
  escalateTo: z.array(z.string().min(1)).min(1),
});

export const gateNodeDataSchema = baseNodeDataSchema.extend({
  gateType: z.enum(['approval', 'review', 'input', 'escalation']),
  assignees: z.array(z.string()).optional(),
  assignmentStrategy: z.enum(['all', 'any', 'round_robin']),
  timeoutMinutes: z.number().positive().max(MAX_GATE_TIMEOUT_MINUTES),
  timeoutAction: z.enum(['approve', 'reject', 'escalate', 'fallback_node']),
  fallbackNodeId: z.string().optional(),
  reviewInstructions: z.string().optional(),
  inputFields: z.array(gateInputFieldSchema).optional(),
  notificationChannels: z.array(z.enum(['email', 'slack', 'in_app'])),
  escalationConfig: escalationConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Condition Node Data
// ---------------------------------------------------------------------------

export const conditionRuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  expression: z.string().min(1),
  outputPortId: z.string().min(1),
});

export const llmRouterOptionSchema = z.object({
  label: z.string().min(1),
  description: z.string(),
  outputPortId: z.string().min(1),
});

export const llmRouterConfigSchema = z.object({
  model: z.string().min(1),
  routingPrompt: z.string().min(1),
  options: z.array(llmRouterOptionSchema).min(2),
});

export const conditionNodeDataSchema = baseNodeDataSchema.extend({
  conditionType: z.enum(['if_else', 'switch', 'llm_router']),
  conditions: z.array(conditionRuleSchema).optional(),
  defaultOutputPortId: z.string().optional(),
  llmRouterConfig: llmRouterConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Tool Node Data
// ---------------------------------------------------------------------------

export const httpAuthenticationSchema = z.object({
  type: z.enum(['bearer', 'api_key', 'basic']),
  credentialId: z.string().min(1),
});

export const httpConfigSchema = z.object({
  method: z.string().min(1),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()),
  body: z.string().optional(),
  authentication: httpAuthenticationSchema.optional(),
});

export const codeConfigSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python']),
  code: z.string().min(1),
  timeout: z.number().int().positive(),
});

export const mcpConfigSchema = z.object({
  serverUri: z.string().min(1),
  toolName: z.string().min(1),
  inputMapping: z.record(z.string(), z.string()),
});

export const toolNodeDataSchema = baseNodeDataSchema.extend({
  toolType: z.enum(['http_request', 'code_execution', 'file_io', 'database', 'mcp']),
  httpConfig: httpConfigSchema.optional(),
  codeConfig: codeConfigSchema.optional(),
  mcpConfig: mcpConfigSchema.optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Memory Node Data
// ---------------------------------------------------------------------------

export const vectorConfigSchema = z.object({
  embeddingModel: z.string().min(1),
  topK: z.number().int().positive(),
  similarityThreshold: z.number().min(0).max(1),
});

export const memoryNodeDataSchema = baseNodeDataSchema.extend({
  memoryType: z.enum([
    'conversation_buffer',
    'summary',
    'vector_store',
    'key_value',
  ]),
  operation: z.enum(['read', 'write', 'search', 'clear']),
  vectorConfig: vectorConfigSchema.optional(),
  namespace: z.string().optional(),
  ttlMinutes: z.number().positive().optional(),
});

// ---------------------------------------------------------------------------
// Output Node Data
// ---------------------------------------------------------------------------

export const outputWebhookConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()),
});

export const emailConfigSchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  templateId: z.string().optional(),
});

export const storeConfigSchema = z.object({
  table: z.string().min(1),
  mapping: z.record(z.string(), z.string()),
});

export const outputNodeDataSchema = baseNodeDataSchema.extend({
  outputType: z.enum(['return', 'webhook', 'email', 'store', 'stream']),
  format: z.enum(['json', 'text', 'markdown', 'html']).optional(),
  webhookConfig: outputWebhookConfigSchema.optional(),
  emailConfig: emailConfigSchema.optional(),
  storeConfig: storeConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Subflow Node Data
// ---------------------------------------------------------------------------

export const subflowNodeDataSchema = baseNodeDataSchema.extend({
  workflowId: z.string().min(1),
  versionId: z.string().optional(),
  inputMapping: z.record(z.string(), z.string()),
  outputMapping: z.record(z.string(), z.string()),
  waitForCompletion: z.boolean(),
});

// ---------------------------------------------------------------------------
// Note Node Data
// ---------------------------------------------------------------------------

export const noteNodeDataSchema = baseNodeDataSchema.extend({
  content: z.string(),
  color: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Full Node Schemas (with position, id, ports)
// ---------------------------------------------------------------------------

function makeNodeSchema<T extends z.ZodTypeAny>(
  typeLiteral: string,
  dataSchema: T,
) {
  return z.object({
    id: z.string().min(1),
    type: z.literal(typeLiteral),
    position: positionSchema,
    data: dataSchema,
    measured: z
      .object({ width: z.number(), height: z.number() })
      .optional(),
    ports: z
      .object({
        inputs: z.array(portSchema),
        outputs: z.array(portSchema),
      })
      .optional(),
  });
}

export const agentNodeSchema = makeNodeSchema('agent', agentNodeDataSchema);
export const teamNodeSchema = makeNodeSchema('team', teamNodeDataSchema);
export const triggerNodeSchema = makeNodeSchema('trigger', triggerNodeDataSchema);
export const gateNodeSchema = makeNodeSchema('gate', gateNodeDataSchema);
export const conditionNodeSchema = makeNodeSchema('condition', conditionNodeDataSchema);
export const toolNodeSchema = makeNodeSchema('tool', toolNodeDataSchema);
export const memoryNodeSchema = makeNodeSchema('memory', memoryNodeDataSchema);
export const outputNodeSchema = makeNodeSchema('output', outputNodeDataSchema);
export const subflowNodeSchema = makeNodeSchema('subflow', subflowNodeDataSchema);
export const noteNodeSchema = makeNodeSchema('note', noteNodeDataSchema);

/** Discriminated-union schema that validates any `WorkflowNode`. */
export const workflowNodeSchema = z.discriminatedUnion('type', [
  agentNodeSchema,
  teamNodeSchema,
  triggerNodeSchema,
  gateNodeSchema,
  conditionNodeSchema,
  toolNodeSchema,
  memoryNodeSchema,
  outputNodeSchema,
  subflowNodeSchema,
  noteNodeSchema,
]);
