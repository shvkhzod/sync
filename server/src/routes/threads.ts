import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';

const { threads, thoughts } = schema;

type CreateThreadBody = {
  content: string;
};

type AppendThoughtBody = {
  content: string;
};

type IdParams = { id: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function threadsRoutes(app: FastifyInstance): Promise<void> {
  // List threads, most-recently-updated first, with a thought-count tally and
  // a preview (first thought's content) for the feed view. Single query — no N+1.
  app.get('/threads', async () => {
    const rows = await db
      .select({
        id:        threads.id,
        createdAt: threads.createdAt,
        updatedAt: threads.updatedAt,
        thoughtCount: sql<number>`count(${thoughts.id})::int`.as('thought_count'),
        preview: sql<string | null>`(select content from thoughts where thread_id = ${threads.id} and ordinal = 0 limit 1)`.as('preview')
      })
      .from(threads)
      .leftJoin(thoughts, eq(thoughts.threadId, threads.id))
      .groupBy(threads.id)
      .orderBy(desc(threads.updatedAt));
    return { threads: rows };
  });

  // Single thread + ordered thoughts. 404 if not found.
  app.get<{ Params: IdParams }>('/threads/:id', async (req, reply) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return reply.notFound('thread not found');

    const t = await db.select().from(threads).where(eq(threads.id, id)).limit(1);
    if (t.length === 0) return reply.notFound('thread not found');

    const items = await db
      .select()
      .from(thoughts)
      .where(eq(thoughts.threadId, id))
      .orderBy(asc(thoughts.ordinal));

    return { thread: t[0], thoughts: items };
  });

  // Create a thread + first thought atomically. The first thought always lands
  // at ordinal 0; subsequent thoughts get max+1.
  app.post<{ Body: CreateThreadBody }>('/threads', async (req, reply) => {
    const content = (req.body?.content ?? '').trim();
    if (!content) return reply.badRequest('content is required');

    const created = await db.transaction(async (tx) => {
      const [thread] = await tx.insert(threads).values({}).returning();
      const [thought] = await tx
        .insert(thoughts)
        .values({ threadId: thread.id, ordinal: 0, content })
        .returning();
      return { thread, thought };
    });

    reply.code(201);
    return { thread: created.thread, thoughts: [created.thought] };
  });

  // Append a thought to an existing thread. Computes the next ordinal in the
  // same transaction so concurrent appends to the same thread don't collide
  // (the (thread_id, ordinal) unique index catches what slips through).
  app.post<{ Params: IdParams; Body: AppendThoughtBody }>('/threads/:id/thoughts', async (req, reply) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return reply.notFound('thread not found');

    const content = (req.body?.content ?? '').trim();
    if (!content) return reply.badRequest('content is required');

    try {
      const result = await db.transaction(async (tx) => {
        const t = await tx.select({ id: threads.id }).from(threads).where(eq(threads.id, id)).limit(1);
        if (t.length === 0) return null;

        const [{ next }] = await tx
          .select({ next: sql<number>`coalesce(max(${thoughts.ordinal}), -1) + 1`.as('next') })
          .from(thoughts)
          .where(eq(thoughts.threadId, id));

        const [thought] = await tx
          .insert(thoughts)
          .values({ threadId: id, ordinal: next, content })
          .returning();

        await tx
          .update(threads)
          .set({ updatedAt: new Date() })
          .where(eq(threads.id, id));

        return thought;
      });

      if (!result) return reply.notFound('thread not found');
      reply.code(201);
      return { thought: result };
    } catch (err) {
      app.log.error({ err }, 'append thought failed');
      return reply.internalServerError('append failed');
    }
  });

  // Delete a thread (cascades to its thoughts and to their connections via FKs).
  app.delete<{ Params: IdParams }>('/threads/:id', async (req, reply) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return reply.notFound('thread not found');

    const deleted = await db.delete(threads).where(eq(threads.id, id)).returning({ id: threads.id });
    if (deleted.length === 0) return reply.notFound('thread not found');

    reply.code(204);
    return null;
  });

  // Edit a specific thought (only its content, never its ordinal or thread).
  app.patch<{ Params: { id: string; thoughtId: string }; Body: AppendThoughtBody }>(
    '/threads/:id/thoughts/:thoughtId',
    async (req, reply) => {
      const { id, thoughtId } = req.params;
      if (!UUID_RE.test(id) || !UUID_RE.test(thoughtId)) return reply.notFound('thought not found');

      const content = (req.body?.content ?? '').trim();
      if (!content) return reply.badRequest('content is required');

      const updated = await db
        .update(thoughts)
        .set({ content })
        .where(and(eq(thoughts.id, thoughtId), eq(thoughts.threadId, id)))
        .returning();

      if (updated.length === 0) return reply.notFound('thought not found');
      return { thought: updated[0] };
    }
  );
}
