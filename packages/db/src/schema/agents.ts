import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './auth';

// ── Enums ───────────────────────────────────────────────────────────────────

export const teamPatternEnum = pgEnum('team_pattern', [
  'sequential',
  'parallel',
  'supervisor',
  'debate',
  'custom',
]);

// ── Agent Templates ─────────────────────────────────────────────────────────

export const agentTemplates = pgTable(
  'agent_templates',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    config: jsonb('config')
      .$type<{
        model: string;
        systemPrompt: string;
        temperature?: number;
        maxTokens?: number;
        tools?: string[];
        [key: string]: unknown;
      }>()
      .notNull(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('agent_templates_org_id_idx').on(table.organizationId),
    index('agent_templates_created_by_idx').on(table.createdById),
  ],
);

export const agentTemplatesRelations = relations(
  agentTemplates,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [agentTemplates.organizationId],
      references: [organizations.id],
    }),
    createdBy: one(users, {
      fields: [agentTemplates.createdById],
      references: [users.id],
    }),
  }),
);

// ── Team Templates ──────────────────────────────────────────────────────────

export const teamTemplates = pgTable(
  'team_templates',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    pattern: teamPatternEnum('pattern').notNull(),
    agents: jsonb('agents')
      .$type<
        Array<{
          role: string;
          templateId?: string;
          config?: Record<string, unknown>;
        }>
      >()
      .notNull(),
    communicationConfig: jsonb('communication_config')
      .$type<{
        maxRounds?: number;
        strategy?: string;
        [key: string]: unknown;
      }>()
      .notNull(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('team_templates_org_id_idx').on(table.organizationId),
    index('team_templates_created_by_idx').on(table.createdById),
  ],
);

export const teamTemplatesRelations = relations(teamTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamTemplates.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [teamTemplates.createdById],
    references: [users.id],
  }),
}));

// ── Type exports ────────────────────────────────────────────────────────────

export type AgentTemplate = typeof agentTemplates.$inferSelect;
export type NewAgentTemplate = typeof agentTemplates.$inferInsert;
export type TeamTemplate = typeof teamTemplates.$inferSelect;
export type NewTeamTemplate = typeof teamTemplates.$inferInsert;
