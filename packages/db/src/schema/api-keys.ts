import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './auth';

// ── Enums ───────────────────────────────────────────────────────────────────

export const apiKeyProviderEnum = pgEnum('api_key_provider', [
  'anthropic',
  'openai',
  'custom',
]);

// ── API Keys ────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    provider: apiKeyProviderEnum('provider').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    lastUsedAt: timestamp('last_used_at', {
      mode: 'date',
      withTimezone: true,
    }),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', {
      mode: 'date',
      withTimezone: true,
    }),
  },
  (table) => [
    index('api_keys_org_id_idx').on(table.organizationId),
    index('api_keys_created_by_idx').on(table.createdById),
    index('api_keys_provider_idx').on(table.provider),
  ],
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [apiKeys.createdById],
    references: [users.id],
  }),
}));

// ── Type exports ────────────────────────────────────────────────────────────

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
