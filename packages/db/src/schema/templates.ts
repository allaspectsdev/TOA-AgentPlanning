import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

// ── Workflow Templates ──────────────────────────────────────────────────────

export const workflowTemplates = pgTable(
  'workflow_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(
      () => organizations.id,
      { onDelete: 'set null' },
    ),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    definition: jsonb('definition').$type<Record<string, unknown>>().notNull(),
    thumbnail: text('thumbnail'),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('wf_templates_org_id_idx').on(table.organizationId),
    index('wf_templates_category_idx').on(table.category),
    index('wf_templates_is_public_idx').on(table.isPublic),
  ],
);

export const workflowTemplatesRelations = relations(
  workflowTemplates,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [workflowTemplates.organizationId],
      references: [organizations.id],
    }),
  }),
);

// ── Type exports ────────────────────────────────────────────────────────────

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type NewWorkflowTemplate = typeof workflowTemplates.$inferInsert;
