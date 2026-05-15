export type ThreadId = string;
export type ThoughtId = string;

export type GalaxyNode = {
  threadId: ThreadId;
  x: number;          // 0..1 world coords
  y: number;          // 0..1 world coords
  brightness: number; // 0..1
  thoughtCount: number;
  label: string;      // first words of first thought, drawn as the visible glyph
};

export type Thought = {
  id: ThoughtId;
  ordinal: number;
  content: string;
  createdAt: number; // unix ms
};

export type ThreadDetail = {
  id: ThreadId;
  thoughts: Thought[];
};

export type GhostLine = {
  fromThreadId: ThreadId;
  fromX: number;
  fromY: number;
  toThreadId: ThreadId;
  toX: number;
  toY: number;
  similarity: number; // 0..1
  keywords: string[]; // 2-3 shared terms that produced the connection
};

export type ConstellationTheme = {
  id: number;
  name: string;
  cx: number;  // 0..1 world coords
  cy: number;
};

export type Viewport = {
  offsetX: number;
  offsetY: number;
  scale: number;
  canvasWidth: number;   // CSS px
  canvasHeight: number;  // CSS px
  dpr: number;
};

export type Point = { x: number; y: number };
