import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const guides = sqliteTable('guides', {
  id: text('id').primaryKey(), content: text('content').notNull(),
  visibility: text('visibility').notNull(), createdAt: text('created_at').notNull(),
});
export const jobs = sqliteTable('research_jobs', {
  id: text('id').primaryKey(), inputHash: text('input_hash').notNull(),
  status: text('status').notNull(), events: text('events').notNull(),
  guideId: text('guide_id'), error: text('error'), updatedAt: text('updated_at').notNull(),
});
export const quotas = sqliteTable('request_quotas', {
  key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull(),
});
