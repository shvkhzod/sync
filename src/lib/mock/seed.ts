import type { GalaxyNode, ThreadDetail, GhostLine, Thought } from '$lib/galaxy/types';

const EMBED_DIM = 64;
const THEME_COUNT = 8;

export type Theme = {
  id: number;
  name: string;
  center: number[];   // unit vector
  cx: number;
  cy: number;
};

export type SeedOptions = {
  seed?: number;
  threadCount?: number;
};

export type ThreadInternal = {
  node: GalaxyNode;
  themeId: number;
  embedding: number[];
  thoughtEmbeddings: number[][];   // parallel to detail.thoughts
  thoughtContents: string[];        // parallel to thoughtEmbeddings, used for ghost keyword extraction
};

export type SeedOutput = {
  themes: Theme[];
  threads: GalaxyNode[];
  threadDetails: Map<string, ThreadDetail>;
  ghosts: GhostLine[];
  _internal: ThreadInternal[];
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  // Box-Muller, one sample
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomUnitVector(rng: () => number, dim: number): number[] {
  const v = new Array(dim);
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    v[i] = gauss(rng);
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

function placeAnchors(rng: () => number, count: number): { cx: number; cy: number }[] {
  // Sample candidates and pick the one farthest from existing anchors (Mitchell's best-candidate)
  const anchors: { cx: number; cy: number }[] = [];
  const minXY = 0.1, maxXY = 0.9;
  for (let i = 0; i < count; i++) {
    let best = { cx: 0, cy: 0 };
    let bestDist = -Infinity;
    const tries = 30;
    for (let t = 0; t < tries; t++) {
      const cand = {
        cx: minXY + rng() * (maxXY - minXY),
        cy: minXY + rng() * (maxXY - minXY)
      };
      let minD = Infinity;
      for (const a of anchors) {
        const d = Math.hypot(cand.cx - a.cx, cand.cy - a.cy);
        if (d < minD) minD = d;
      }
      if (anchors.length === 0) minD = 1;
      if (minD > bestDist) {
        bestDist = minD;
        best = cand;
      }
    }
    anchors.push(best);
  }
  return anchors;
}

const THEME_NAMES = [
  'gardens', 'machines', 'tides', 'circuits',
  'archives', 'currents', 'mirrors', 'bridges'
];

const THEME_FRAGMENTS: string[][] = [
  ['the soil remembers', 'roots find one another', 'a slow flowering', 'pruned light', 'compost as memory', 'leaves turning toward', 'something seeded', 'the green hour'],
  ['gears in agreement', 'a clean assembly', 'the lever and the load', 'tolerance accumulates', 'engineered patience', 'pressure as proof', 'the hum of the line', 'small motors learning'],
  ['the fourth wave', 'undertow', 'salt on the question', 'the moon explains nothing', 'returning is a verb', 'a horizon held', 'shoreward', 'tide tables'],
  ['the trace closes', 'a clean signal', 'noise is information', 'gates and gates', 'the path of least resistance', 'capacitance of attention', 'switching states', 'circuits within circuits'],
  ['the index dreams', 'shelves that listen', 'a marginal note', 'cataloged silences', 'the librarian of small hours', 'cross-reference', 'a folio remembers', 'archives breathing'],
  ['flow as discipline', 'a current of intent', 'the river decides', 'eddy and main stream', 'water finds form', 'pressure differential', 'streamlines', 'the slow river'],
  ['reflection without surface', 'doubled', 'the mirror returns the question', 'glass thinking', 'symmetry that breaks', 'a reversed grammar', 'image and source', 'the silvered hour'],
  ['span as argument', 'load-bearing thought', 'a structure of trust', 'arches that remember weight', 'between two banks', 'tension and compression', 'the cable and the deck', 'crossings']
];

const CONNECTIVES = ['—', ', and', '.', '; until', ', though', ', then', ', because', '. Maybe'];

function generateContent(rng: () => number, themeId: number, length: number): string {
  const frags = THEME_FRAGMENTS[themeId];
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    const f = frags[Math.floor(rng() * frags.length)];
    out.push(i === 0 ? f.charAt(0).toUpperCase() + f.slice(1) : f);
    if (i < length - 1) out.push(CONNECTIVES[Math.floor(rng() * CONNECTIVES.length)] + ' ');
  }
  return out.join('') + '.';
}

function uuid(rng: () => number): string {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) s += hex[Math.floor(rng() * 16)];
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20,32)}`;
}

export function makeLabel(content: string, wordCount: number): string {
  return content
    .replace(/^[^a-zA-Z]+/, '')
    .split(/[\s,;.—]+/)
    .filter(Boolean)
    .slice(0, wordCount)
    .join(' ');
}

function addNoise(rng: () => number, base: number[], sigma: number): number[] {
  const v = base.map(x => x + sigma * gauss(rng));
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map(x => x / norm);
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const GHOST_K = 3;
const GHOST_THRESHOLD = 0.7;

const GHOST_STOPWORDS = new Set([
  'the', 'and', 'that', 'into', 'with', 'from', 'as', 'is', 'of', 'in',
  'an', 'to', 'their', 'though', 'because', 'maybe', 'until', 'one', 'two',
  'returns', 'then', 'a', 'on', 'or', 'for', 'has', 'have', 'are', 'was',
  'this', 'these', 'which', 'when', 'where', 'what', 'how', 'who', 'her', 'his',
  'its', 'them', 'they', 'each', 'every', 'some', 'any', 'all', 'both', 'few'
]);

function ghostKeywords(a: string, b: string): string[] {
  const tokenize = (s: string) => s
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !GHOST_STOPWORDS.has(w));
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  const shared: string[] = [];
  for (const w of setA) if (setB.has(w)) shared.push(w);
  if (shared.length >= 2) return shared.slice(0, 3);
  // Fall back to distinctive words from the source thought.
  return tokenize(a).slice(0, 3);
}

function computeGhosts(internals: ThreadInternal[]): GhostLine[] {
  // Flatten all thoughts with their thread + 2D position for line endpoints.
  type Flat = {
    threadId: string;
    thoughtIdx: number;
    embedding: number[];
    x: number;
    y: number;
    content: string;
  };
  const flat: Flat[] = [];
  for (const t of internals) {
    for (let j = 0; j < t.thoughtEmbeddings.length; j++) {
      flat.push({
        threadId: t.node.threadId,
        thoughtIdx: j,
        embedding: t.thoughtEmbeddings[j],
        x: t.node.x,
        y: t.node.y,
        content: t.thoughtContents[j]
      });
    }
  }

  const seen = new Set<string>();
  const ghosts: GhostLine[] = [];

  for (let i = 0; i < flat.length; i++) {
    const me = flat[i];
    const scored: { idx: number; sim: number }[] = [];
    for (let j = 0; j < flat.length; j++) {
      if (i === j) continue;
      const other = flat[j];
      if (other.threadId === me.threadId) continue;
      const sim = dot(me.embedding, other.embedding);
      if (sim < GHOST_THRESHOLD) continue;
      scored.push({ idx: j, sim });
    }
    scored.sort((a, b) => b.sim - a.sim);
    const top = scored.slice(0, GHOST_K);
    for (const { idx, sim } of top) {
      const other = flat[idx];
      const a = `${me.threadId}:${me.thoughtIdx}`;
      const b = `${other.threadId}:${other.thoughtIdx}`;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ghosts.push({
        fromThreadId: me.threadId,
        fromX: me.x,
        fromY: me.y,
        toThreadId: other.threadId,
        toX: other.x,
        toY: other.y,
        similarity: sim,
        keywords: ghostKeywords(me.content, other.content)
      });
    }
  }

  return ghosts;
}

export function buildSeed(opts: SeedOptions = {}): SeedOutput {
  const seed = opts.seed ?? 42;
  const threadCount = opts.threadCount ?? 200;
  const rng = mulberry32(seed);
  // Single "now" anchor for the whole seed so thoughts within a thread stay in
  // consistent relative time even though the wall clock advances during seeding.
  const NOW = Date.now();

  const themeCenters = Array.from({ length: THEME_COUNT }, () => randomUnitVector(rng, EMBED_DIM));
  const anchors = placeAnchors(rng, THEME_COUNT);
  const themes: Theme[] = themeCenters.map((center, id) => ({
    id,
    name: THEME_NAMES[id],
    center,
    cx: anchors[id].cx,
    cy: anchors[id].cy
  }));

  const threads: GalaxyNode[] = [];
  const details = new Map<string, ThreadDetail>();
  const internals: ThreadInternal[] = [];

  for (let i = 0; i < threadCount; i++) {
    const themeId = i % THEME_COUNT; // even distribution; could randomize later
    const theme = themes[themeId];
    const embedding = addNoise(rng, theme.center, 0.05);

    // Looser jitter so themes can bleed into each other — real semantic clusters
    // don't sit in tidy islands.
    let x = theme.cx + 0.16 * gauss(rng);
    let y = theme.cy + 0.16 * gauss(rng);
    x = Math.min(1, Math.max(0, x));
    y = Math.min(1, Math.max(0, y));

    // Real personal thinking is power-law: most threads are stubs that died,
    // a few are obsessive long chains.
    const thoughtCount = Math.max(1, Math.min(22, Math.floor(-Math.log(Math.max(rng(), 1e-9)) * 4)));
    const ageDays = -30 * Math.log(Math.max(rng(), 1e-9));
    const brightness = Math.min(0.9, Math.exp(-ageDays / 30) * 0.8 + 0.1);

    // Each thought gets a deterministic timestamp anchored to "now". The most
    // recent thought sits at thread.ageDays; earlier thoughts spread back with
    // jittered gaps so threads feel written over time rather than in bursts.
    const DAY_MS = 86_400_000;
    const now = NOW;
    const gaps: number[] = [];
    for (let j = 0; j < thoughtCount; j++) {
      gaps.push(rng() * 6 + 0.5); // 0.5..6.5 days between thoughts (jittered)
    }

    const thoughts: Thought[] = [];
    const thoughtEmbeddings: number[][] = [];
    const thoughtContents: string[] = [];
    let cumulativeBack = ageDays; // most recent at ageDays back from now
    for (let j = thoughtCount - 1; j >= 0; j--) {
      const tEmbed = addNoise(rng, embedding, 0.05);
      const content = generateContent(rng, themeId, 2 + Math.floor(rng() * 3));
      const createdAt = Math.floor(now - cumulativeBack * DAY_MS);
      thoughts[j] = { id: uuid(rng), ordinal: j, content, createdAt };
      thoughtEmbeddings[j] = tEmbed;
      thoughtContents[j] = content;
      cumulativeBack += gaps[j];
    }

    // Hierarchy: bigger threads carry more words.
    const labelWords =
      thoughtCount <= 2 ? 1 :
      thoughtCount <= 5 ? 2 :
      thoughtCount <= 9 ? 3 : 4;
    const label = makeLabel(thoughts[0]?.content ?? '', labelWords);

    const threadId = uuid(rng);
    const node: GalaxyNode = { threadId, x, y, brightness, thoughtCount, label };
    threads.push(node);

    details.set(threadId, { id: threadId, thoughts });
    internals.push({ node, themeId, embedding, thoughtEmbeddings, thoughtContents });
  }

  const ghosts = computeGhosts(internals);
  return {
    themes,
    threads,
    threadDetails: details,
    ghosts,
    _internal: internals
  };
}
