import type { FastifyInstance } from 'fastify';
import { asc, desc, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema } from '../db/client.js';

const { threads, thoughts, connections } = schema;

type ExportThought = {
  id: string;
  ordinal: number;
  content: string;
  createdAt: string;
};

type ExportThread = {
  id: string;
  createdAt: string;
  updatedAt: string;
  thoughts: ExportThought[];
};

type ExportConnection = {
  fromThreadId: string;
  fromThoughtId: string;
  toThreadId: string;
  toThoughtId: string;
  similarity: number;
  keywords: string[];
};

type ExportPayload = {
  format: 'sync-export';
  version: 1;
  exportedAt: string;
  counts: { threads: number; thoughts: number; connections: number };
  threads: ExportThread[];
  connections: ExportConnection[];
};

// Self-join `thoughts` twice so a connection row carries its from/to thread
// ids without a second query.
const fromT = alias(thoughts, 'from_t');
const toT   = alias(thoughts, 'to_t');

/**
 * Builds the canonical export: every thread, every thought in ordinal order,
 * every precomputed cross-thread connection (denormalized to carry both
 * `threadId`s so a downstream consumer never has to join).
 *
 * Three queries (threads, thoughts, connections) — bounded total time
 * regardless of thread count.
 */
async function buildExport(): Promise<ExportPayload> {
  const [threadRows, thoughtRows, connectionRows] = await Promise.all([
    db.select().from(threads).orderBy(desc(threads.updatedAt)),
    db.select().from(thoughts).orderBy(asc(thoughts.threadId), asc(thoughts.ordinal)),
    db
      .select({
        similarity:    connections.similarity,
        keywords:      connections.keywords,
        fromThreadId:  fromT.threadId,
        fromThoughtId: fromT.id,
        toThreadId:    toT.threadId,
        toThoughtId:   toT.id
      })
      .from(connections)
      .innerJoin(fromT, eq(fromT.id, connections.fromThoughtId))
      .innerJoin(toT,   eq(toT.id,   connections.toThoughtId))
      .orderBy(desc(connections.similarity))
  ]);

  const thoughtsByThread = new Map<string, ExportThought[]>();
  for (const t of thoughtRows) {
    const list = thoughtsByThread.get(t.threadId) ?? [];
    list.push({
      id: t.id,
      ordinal: t.ordinal,
      content: t.content,
      createdAt: t.createdAt.toISOString()
    });
    thoughtsByThread.set(t.threadId, list);
  }

  const threadsOut: ExportThread[] = threadRows.map((tr) => ({
    id: tr.id,
    createdAt: tr.createdAt.toISOString(),
    updatedAt: tr.updatedAt.toISOString(),
    thoughts: thoughtsByThread.get(tr.id) ?? []
  }));

  const connectionsOut: ExportConnection[] = connectionRows.map((r) => ({
    fromThreadId:  r.fromThreadId,
    fromThoughtId: r.fromThoughtId,
    toThreadId:    r.toThreadId,
    toThoughtId:   r.toThoughtId,
    similarity:    r.similarity,
    keywords:      r.keywords ?? []
  }));

  return {
    format: 'sync-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      threads: threadsOut.length,
      thoughts: thoughtRows.length,
      connections: connectionsOut.length
    },
    threads: threadsOut,
    connections: connectionsOut
  };
}

function toMarkdown(p: ExportPayload): string {
  const lines: string[] = [];
  const totals = `${p.counts.threads} threads · ${p.counts.thoughts} thoughts · ${p.counts.connections} connections`;
  lines.push(`# Sync export`, ``, `_${p.exportedAt}_  ·  ${totals}`, ``);

  for (const thread of p.threads) {
    const lead = thread.thoughts[0]?.content ?? '(empty thread)';
    const heading = lead.length > 80 ? lead.slice(0, 77).trimEnd() + '…' : lead;
    lines.push(`## ${heading}`, ``, `*${thread.id}* · started ${thread.createdAt} · updated ${thread.updatedAt}`, ``);
    for (const t of thread.thoughts) {
      const ord = String(t.ordinal + 1).padStart(2, '0');
      lines.push(`**#${ord}** · _${t.createdAt}_`, ``, t.content, ``);
    }
  }

  if (p.connections.length > 0) {
    lines.push(`---`, ``, `## Connections`, ``);
    for (const c of p.connections) {
      const kw = c.keywords.length ? ` — _${c.keywords.join(', ')}_` : '';
      lines.push(`- \`${c.fromThoughtId}\` → \`${c.toThoughtId}\` (sim ${c.similarity.toFixed(3)})${kw}`);
    }
  }

  return lines.join('\n');
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/export', async (_req, reply) => {
    const payload = await buildExport();
    const stamp = payload.exportedAt.replace(/[:.]/g, '-');
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="sync-export-${stamp}.json"`);
    return payload;
  });

  app.get('/export.md', async (_req, reply) => {
    const payload = await buildExport();
    const stamp = payload.exportedAt.replace(/[:.]/g, '-');
    const md = toMarkdown(payload);
    reply.header('Content-Type', 'text/markdown; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="sync-export-${stamp}.md"`);
    return md;
  });

  app.get<{ Params: { id: string } }>('/export/threads/:id', async (req, reply) => {
    const { id } = req.params;
    const t = await db.select().from(threads).where(eq(threads.id, id)).limit(1);
    if (t.length === 0) return reply.notFound('thread not found');

    const items = await db
      .select()
      .from(thoughts)
      .where(eq(thoughts.threadId, id))
      .orderBy(asc(thoughts.ordinal));

    const ids = items.map((x) => x.id);
    const connectionRows = ids.length === 0
      ? []
      : await db
          .select({
            similarity:    connections.similarity,
            keywords:      connections.keywords,
            fromThreadId:  fromT.threadId,
            fromThoughtId: fromT.id,
            toThreadId:    toT.threadId,
            toThoughtId:   toT.id
          })
          .from(connections)
          .innerJoin(fromT, eq(fromT.id, connections.fromThoughtId))
          .innerJoin(toT,   eq(toT.id,   connections.toThoughtId))
          .where(or(inArray(connections.fromThoughtId, ids), inArray(connections.toThoughtId, ids)))
          .orderBy(desc(connections.similarity));

    const exportedAt = new Date().toISOString();
    const stamp = exportedAt.replace(/[:.]/g, '-');
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="sync-thread-${id}-${stamp}.json"`);

    return {
      format: 'sync-export',
      version: 1,
      exportedAt,
      counts: { threads: 1, thoughts: items.length, connections: connectionRows.length },
      threads: [{
        id: t[0].id,
        createdAt: t[0].createdAt.toISOString(),
        updatedAt: t[0].updatedAt.toISOString(),
        thoughts: items.map((x) => ({
          id: x.id,
          ordinal: x.ordinal,
          content: x.content,
          createdAt: x.createdAt.toISOString()
        }))
      }],
      connections: connectionRows.map((r) => ({
        fromThreadId:  r.fromThreadId,
        fromThoughtId: r.fromThoughtId,
        toThreadId:    r.toThreadId,
        toThoughtId:   r.toThoughtId,
        similarity:    r.similarity,
        keywords:      r.keywords ?? []
      }))
    };
  });
}
