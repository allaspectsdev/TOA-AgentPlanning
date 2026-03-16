import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations.js';

// ── Projects ────────────────────────────────────────────────────────────────

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    archivedAt: timestamp('archived_at', { mode: 'date', withTimezone: true }),
  },
  (table) => [
    index('projects_org_id_idx').on(table.organizationId),
    uniqueIndex('projects_org_slug_idx').on(
      table.organizationId,
      table.slug,
    ),
  ],
);

export const projectsRelations = relations(projects, ({ one }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
}));

// ── Type exports ────────────────────────────────────────────────────────────

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
