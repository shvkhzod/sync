import { buildSeed, makeLabel, type SeedOutput } from './seed';
import type { GalaxyNode, ThreadDetail, GhostLine, ThreadId, ConstellationTheme } from '$lib/galaxy/types';
import type { FeedThread } from '$lib/types';

const USER_THREADS_KEY = 'sync.userThreads';

type UserThought = {
  id: string;
  ordinal: number;
  content: string;
  createdAt: number;
};

type UserThread = {
  threadId: ThreadId;
  x: number;
  y: number;
  brightness: number;
  thoughts: UserThought[];
  createdAt: number;
  updatedAt: number;
};

let cached: SeedOutput | null = null;
let sortedCache: GalaxyNode[] | null = null;
let sortedCacheRev = -1;
let userThreadsRev = 0;

function db(): SeedOutput {
  if (!cached) cached = buildSeed({ seed: 42 });
  return cached;
}

function readUserThreads(): UserThread[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(USER_THREADS_KEY);
    return raw ? (JSON.parse(raw) as UserThread[]) : [];
  } catch {
    return [];
  }
}

function writeUserThreads(threads: UserThread[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_THREADS_KEY, JSON.stringify(threads));
    }
  } catch {}
  userThreadsRev++;
}

function labelWordCount(thoughtCount: number): number {
  return thoughtCount <= 2 ? 1 : thoughtCount <= 5 ? 2 : thoughtCount <= 9 ? 3 : 4;
}

function userThreadToNode(t: UserThread): GalaxyNode {
  const firstContent = t.thoughts[0]?.content ?? '';
  return {
    threadId: t.threadId,
    x: t.x,
    y: t.y,
    brightness: t.brightness,
    thoughtCount: t.thoughts.length,
    label: makeLabel(firstContent, labelWordCount(t.thoughts.length))
  };
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Journal feed — all threads sorted most-recent first. Includes a preview of
// the first thought for the feed rendering.
export function getFeed(): FeedThread[] {
  const userTs = readUserThreads();
  const userIds = new Set(userTs.map(t => t.threadId));

  const userFeed: FeedThread[] = userTs.map(t => ({
    threadId: t.threadId,
    preview: t.thoughts[0]?.content ?? '',
    thoughtCount: t.thoughts.length,
    updatedAt: t.updatedAt
  }));

  const mockFeed: FeedThread[] = db().threads
    .filter(n => !userIds.has(n.threadId))
    .map(n => {
      const detail = db().threadDetails.get(n.threadId);
      const first = detail?.thoughts[0]?.content ?? '';
      const last = detail?.thoughts[detail.thoughts.length - 1];
      return {
        threadId: n.threadId,
        preview: first,
        thoughtCount: n.thoughtCount,
        updatedAt: last?.createdAt ?? 0
      };
    });

  return [...userFeed, ...mockFeed].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getGalaxy(): GalaxyNode[] {
  if (sortedCache && sortedCacheRev === userThreadsRev) return sortedCache;
  const score = (n: GalaxyNode) =>
    n.brightness * 0.6 + ((n.thoughtCount - 4) / 8) * 0.4;
  const userNodes = readUserThreads().map(userThreadToNode);
  // User-owned threads shadow their mock counterpart (forked on first edit).
  const userIds = new Set(userNodes.map(n => n.threadId));
  const mockNodes = db().threads.filter(n => !userIds.has(n.threadId));
  sortedCache = [...mockNodes, ...userNodes].sort((a, b) => score(b) - score(a));
  sortedCacheRev = userThreadsRev;
  return sortedCache;
}

export function getThread(id: ThreadId): ThreadDetail | null {
  const user = readUserThreads().find(t => t.threadId === id);
  if (user) {
    return {
      id: user.threadId,
      thoughts: user.thoughts.map(t => ({
        id: t.id,
        ordinal: t.ordinal,
        content: t.content,
        // Legacy migration: pre-timestamp thoughts inherit the thread's createdAt.
        createdAt: t.createdAt ?? user.createdAt
      }))
    };
  }
  return db().threadDetails.get(id) ?? null;
}

export function getThemes(): ConstellationTheme[] {
  return db().themes.map(t => ({ id: t.id, name: t.name, cx: t.cx, cy: t.cy }));
}

export function getGhosts(threadId: ThreadId): GhostLine[] {
  // User-created threads have no embeddings yet (no semantic neighbors).
  if (readUserThreads().some(t => t.threadId === threadId)) return [];

  const all = db().ghosts.filter(g => g.fromThreadId === threadId || g.toThreadId === threadId);
  return all.map(g =>
    g.fromThreadId === threadId
      ? g
      : {
          fromThreadId: g.toThreadId,
          fromX: g.toX,
          fromY: g.toY,
          toThreadId: g.fromThreadId,
          toX: g.fromX,
          toY: g.fromY,
          similarity: g.similarity,
          keywords: g.keywords
        }
  );
}

export type CreateThreadInput = {
  content: string;
  x: number;
  y: number;
};

export function createUserThread(input: CreateThreadInput): ThreadId {
  const threadId = randomId();
  const now = Date.now();
  const thread: UserThread = {
    threadId,
    x: Math.min(1, Math.max(0, input.x)),
    y: Math.min(1, Math.max(0, input.y)),
    brightness: 0.9,
    thoughts: [{
      id: randomId(),
      ordinal: 0,
      content: input.content.trim(),
      createdAt: now
    }],
    createdAt: now,
    updatedAt: now
  };
  const all = readUserThreads();
  all.push(thread);
  writeUserThreads(all);
  return threadId;
}

export function appendToThread(threadId: ThreadId, content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  const all = readUserThreads();
  let thread = all.find(t => t.threadId === threadId);

  // First append to a mock thread "forks" it into user-owned storage so it's
  // editable from here on. The galaxy node will shadow the mock at next render.
  if (!thread) {
    const mockDetail = db().threadDetails.get(threadId);
    const mockNode = db().threads.find(n => n.threadId === threadId);
    if (!mockDetail || !mockNode) return false;

    thread = {
      threadId,
      x: mockNode.x,
      y: mockNode.y,
      brightness: 0.9,  // Continuing a thread reactivates it — bump brightness.
      thoughts: mockDetail.thoughts.map(t => ({
        id: t.id,
        ordinal: t.ordinal,
        content: t.content,
        createdAt: t.createdAt
      })),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    all.push(thread);
  }

  thread.thoughts.push({
    id: randomId(),
    ordinal: thread.thoughts.length,
    content: trimmed,
    createdAt: Date.now()
  });
  thread.brightness = 0.9;
  thread.updatedAt = Date.now();
  writeUserThreads(all);
  return true;
}
