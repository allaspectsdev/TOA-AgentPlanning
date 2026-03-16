import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workflows, workflowVersions } from './workflows';
import { users } from './auth';

// ── Enums ───────────────────────────────────────────────────────────────────

export const triggerTypeEnum = pgEnum('trigger_type', [
  'manual',
  'api',
  'schedule',
  'webhook',
  'event',
]);

export const executionStatusEnum = pgEnum('execution_status', [
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
  'timed_out',
]);

export const stepStatusEnum = pgEnum('step_status', [
  'pending',
  'running',
  'waiting',
  'completed',
  'failed',
  'skipped',
]);

export const logLevelEnum = pgEnum('log_level', [
  'debug',
  'info',
  'warn',
  'error',
]);

// ── Executions ──────────────────────────────────────────────────────────────

export const executions = pgTable(
  'executions',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    workflowVersionId: text('workflow_version_id')
      .notNull()
      .references(() => workflowVersions.id, { onDelete: 'restrict' }),
    triggeredById: text('triggered_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    triggerType: triggerTypeEnum('trigger_type').notNull(),
    triggerPayload: jsonb('trigger_payload').$type<Record<string, unknown>>(),
    status: executionStatusEnum('status').notNull().default('pending'),
    startedAt: timestamp('started_at', { mode: 'date', withTimezone: true }),
    completedAt: timestamp('completed_at', { mode: 'date', withTimezone: true }),
    error: jsonb('error').$type<{ code: string; message: string; stack?: string }>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('executions_workflow_id_idx').on(table.workflowId),
    index('executions_workflow_version_id_idx').on(table.workflowVersionId),
    index('executions_triggered_by_idx').on(table.triggeredById),
    index('executions_status_idx').on(table.status),
    index('executions_created_at_idx').on(table.createdAt),
  ],
);

export const executionsRelations = relations(executions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  workflowVersion: one(workflowVersions, {
    fields: [executions.workflowVersionId],
    references: [workflowVersions.id],
  }),
  triggeredBy: one(users, {
    fields: [executions.triggeredById],
    references: [users.id],
  }),
  steps: many(executionSteps),
  logs: many(executionLogs),
}));

// ── Execution Steps ─────────────────────────────────────────────────────────

export const executionSteps = pgTable(
  'execution_steps',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id')
      .notNull()
      .references(() => executions.id, { onDelete: 'cascade' }),
    nodeId: text('node_id').notNull(),
    nodeType: text('node_type').notNull(),
    status: stepStatusEnum('status').notNull().default('pending'),
    input: jsonb('input').$type<Record<string, unknown>>().notNull(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    error: jsonb('error').$type<{ code: string; message: string; stack?: string }>(),
    startedAt: timestamp('started_at', { mode: 'date', withTimezone: true }),
    completedAt: timestamp('completed_at', { mode: 'date', withTimezone: true }),
    durationMs: integer('duration_ms'),
    tokenUsage: jsonb('token_usage').$type<{
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }>(),
    retryCount: integer('retry_count').notNull().default(0),
    parentStepId: text('parent_step_id'),
  },
  (table) => [
    index('exec_steps_execution_id_idx').on(table.executionId),
    index('exec_steps_node_id_idx').on(table.nodeId),
    index('exec_steps_status_idx').on(table.status),
    index('exec_steps_parent_step_id_idx').on(table.parentStepId),
  ],
);

export const executionStepsRelations = relations(
  executionSteps,
  ({ one, many }) => ({
    execution: one(executions, {
      fields: [executionSteps.executionId],
      references: [executions.id],
    }),
    parentStep: one(executionSteps, {
      fields: [executionSteps.parentStepId],
      references: [executionSteps.id],
      relationName: 'parentChild',
    }),
    childSteps: many(executionSteps, { relationName: 'parentChild' }),
    logs: many(executionLogs),
  }),
);

// ── Execution Logs ──────────────────────────────────────────────────────────

export const executionLogs = pgTable(
  'execution_logs',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id')
      .notNull()
      .references(() => executions.id, { onDelete: 'cascade' }),
    stepId: text('step_id').references(() => executionSteps.id, {
      onDelete: 'cascade',
    }),
    level: logLevelEnum('level').notNull(),
    message: text('message').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    timestamp: timestamp('timestamp', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('exec_logs_execution_id_idx').on(table.executionId),
    index('exec_logs_step_id_idx').on(table.stepId),
    index('exec_logs_level_idx').on(table.level),
    index('exec_logs_timestamp_idx').on(table.timestamp),
  ],
);

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  execution: one(executions, {
    fields: [executionLogs.executionId],
    references: [executions.id],
  }),
  step: one(executionSteps, {
    fields: [executionLogs.stepId],
    references: [executionSteps.id],
  }),
}));

// ── Type exports ────────────────────────────────────────────────────────────

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;
export type ExecutionStep = typeof executionSteps.$inferSelect;
export type NewExecutionStep = typeof executionSteps.$inferInsert;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
