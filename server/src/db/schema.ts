import { pgTable, uuid, text, integer, timestamp, real, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// A thread is a chain of thoughts where one idea leads to its successor.
export const threads = pgTable('threads', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// A single thought belongs to exactly one thread, with a stable ordinal that
// preserves the chain order even if a thought is later inserted (we just
// allocate ordinal = max+1 today; resequencing is a future concern).
export const thoughts = pgTable('thoughts', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  threadId:  uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  ordinal:   integer('ordinal').notNull(),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  threadIdx:       index('thoughts_thread_idx').on(t.threadId),
  threadOrdinalIx: uniqueIndex('thoughts_thread_ordinal_uq').on(t.threadId, t.ordinal)
}));

// Cross-thread semantic connections. Precomputed offline (embedding pipeline
// owns this table). The (from, to) pair is unique and directional — the
// reverse edge is stored separately so each thought page can read its outgoing
// neighbors with a single key lookup.
export const connections = pgTable('connections', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  fromThoughtId:  uuid('from_thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  toThoughtId:    uuid('to_thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  similarity:     real('similarity').notNull(),
  keywords:       text('keywords').array().notNull().default(sql`'{}'::text[]`),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  fromIdx:    index('connections_from_idx').on(t.fromThoughtId),
  toIdx:      index('connections_to_idx').on(t.toThoughtId),
  pairUnique: uniqueIndex('connections_pair_uq').on(t.fromThoughtId, t.toThoughtId)
}));

export type Thread     = typeof threads.$inferSelect;
export type NewThread  = typeof threads.$inferInsert;
export type Thought    = typeof thoughts.$inferSelect;
export type NewThought = typeof thoughts.$inferInsert;
export type Connection = typeof connections.$inferSelect;
