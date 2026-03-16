import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { executions, executionSteps } from './executions';
import { users } from './auth';

// ── Enums ───────────────────────────────────────────────────────────────────

export const gateStatusEnum = pgEnum('gate_status', [
  'pending',
  'approved',
  'rejected',
  'timed_out',
  'escalated',
]);

// ── Gate Approvals ──────────────────────────────────────────────────────────

export const gateApprovals = pgTable(
  'gate_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => executions.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id')
      .notNull()
      .references(() => executionSteps.id, { onDelete: 'cascade' }),
    gateNodeId: text('gate_node_id').notNull(),
    status: gateStatusEnum('status').notNull().default('pending'),
    assignedTo: text('assigned_to')
      .array()
      .$type<string[]>(),
    approvedBy: text('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewComment: text('review_comment'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    timeoutAt: timestamp('timeout_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    respondedAt: timestamp('responded_at', {
      mode: 'date',
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('gate_approvals_execution_id_idx').on(table.executionId),
    index('gate_approvals_step_id_idx').on(table.stepId),
    index('gate_approvals_status_idx').on(table.status),
    index('gate_approvals_timeout_at_idx').on(table.timeoutAt),
  ],
);

export const gateApprovalsRelations = relations(gateApprovals, ({ one }) => ({
  execution: one(executions, {
    fields: [gateApprovals.executionId],
    references: [executions.id],
  }),
  step: one(executionSteps, {
    fields: [gateApprovals.stepId],
    references: [executionSteps.id],
  }),
  approver: one(users, {
    fields: [gateApprovals.approvedBy],
    references: [users.id],
  }),
}));

// ── Type exports ────────────────────────────────────────────────────────────

export type GateApproval = typeof gateApprovals.$inferSelect;
export type NewGateApproval = typeof gateApprovals.$inferInsert;
