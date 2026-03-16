import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { users } from './auth';

// ── Enums ───────────────────────────────────────────────────────────────────

export const workflowStatusEnum = pgEnum('workflow_status', [
  'draft',
  'published',
  'archived',
]);

// ── Workflows ───────────────────────────────────────────────────────────────

export const workflows = pgTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    currentVersionId: text('current_version_id'),
    publishedVersionId: text('published_version_id'),
    status: workflowStatusEnum('status').notNull().default('draft'),
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
    index('workflows_project_id_idx').on(table.projectId),
    index('workflows_created_by_idx').on(table.createdById),
    uniqueIndex('workflows_project_slug_idx').on(
      table.projectId,
      table.slug,
    ),
  ],
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  project: one(projects, {
    fields: [workflows.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [workflows.createdById],
    references: [users.id],
  }),
  currentVersion: one(workflowVersions, {
    fields: [workflows.currentVersionId],
    references: [workflowVersions.id],
    relationName: 'currentVersion',
  }),
  publishedVersion: one(workflowVersions, {
    fields: [workflows.publishedVersionId],
    references: [workflowVersions.id],
    relationName: 'publishedVersion',
  }),
  versions: many(workflowVersions, { relationName: 'workflowVersions' }),
}));

// ── Workflow Versions ───────────────────────────────────────────────────────

export const workflowVersions = pgTable(
  'workflow_versions',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    branch: text('branch').notNull().default('main'),
    parentVersionId: text('parent_version_id'),
    definition: jsonb('definition').$type<Record<string, unknown>>().notNull(),
    changeMessage: text('change_message'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('wf_versions_workflow_id_idx').on(table.workflowId),
    index('wf_versions_created_by_idx').on(table.createdById),
    uniqueIndex('wf_versions_workflow_version_branch_idx').on(
      table.workflowId,
      table.version,
      table.branch,
    ),
  ],
);

export const workflowVersionsRelations = relations(
  workflowVersions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowVersions.workflowId],
      references: [workflows.id],
      relationName: 'workflowVersions',
    }),
    parentVersion: one(workflowVersions, {
      fields: [workflowVersions.parentVersionId],
      references: [workflowVersions.id],
    }),
    createdBy: one(users, {
      fields: [workflowVersions.createdById],
      references: [users.id],
    }),
  }),
);

// ── Type exports ────────────────────────────────────────────────────────────

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type NewWorkflowVersion = typeof workflowVersions.$inferInsert;
