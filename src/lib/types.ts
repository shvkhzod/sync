export type ThreadId = string;
export type ThoughtId = string;

export type Thought = {
  id: ThoughtId;
  ordinal: number;
  content: string;
  createdAt: number;
};

export type ThreadDetail = {
  id: ThreadId;
  thoughts: Thought[];
};

// Row in the journal feed — one entry per thread.
export type FeedThread = {
  threadId: ThreadId;
  preview: string;        // first thought, full content (line-clamped at render)
  thoughtCount: number;
  updatedAt: number;      // unix ms of most recent thought
};
