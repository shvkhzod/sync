import { describe, it, expect } from 'vitest';
import { buildSeed } from './seed';

describe('buildSeed', () => {
  it('is deterministic for the same seed', () => {
    const a = buildSeed({ seed: 42 });
    const b = buildSeed({ seed: 42 });
    expect(a.threads).toEqual(b.threads);
  });

  it('produces 8 themes with anchors inside [0.1, 0.9]', () => {
    const out = buildSeed({ seed: 1 });
    expect(out.themes).toHaveLength(8);
    for (const t of out.themes) {
      expect(t.cx).toBeGreaterThanOrEqual(0.1);
      expect(t.cx).toBeLessThanOrEqual(0.9);
      expect(t.cy).toBeGreaterThanOrEqual(0.1);
      expect(t.cy).toBeLessThanOrEqual(0.9);
    }
  });
});

describe('buildSeed threads', () => {
  it('produces 200 threads by default', () => {
    const out = buildSeed({ seed: 7 });
    expect(out.threads).toHaveLength(200);
  });

  it('thread positions stay within [0, 1]', () => {
    const out = buildSeed({ seed: 7 });
    for (const t of out.threads) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(1);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(1);
    }
  });

  it('every thread has 1..22 thoughts (exponential distribution)', () => {
    const out = buildSeed({ seed: 7 });
    for (const t of out.threads) {
      expect(t.thoughtCount).toBeGreaterThanOrEqual(1);
      expect(t.thoughtCount).toBeLessThanOrEqual(22);
      const detail = out.threadDetails.get(t.threadId);
      expect(detail).toBeDefined();
      expect(detail!.thoughts).toHaveLength(t.thoughtCount);
    }
  });

  it('distribution is power-law: most threads are short stubs', () => {
    const out = buildSeed({ seed: 7 });
    const stubs = out.threads.filter(t => t.thoughtCount <= 3).length;
    expect(stubs / out.threads.length).toBeGreaterThan(0.25);
  });

  it('brightness in [0.1, 0.9]', () => {
    const out = buildSeed({ seed: 7 });
    for (const t of out.threads) {
      expect(t.brightness).toBeGreaterThanOrEqual(0.1);
      expect(t.brightness).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });
});

describe('buildSeed ghosts', () => {
  it('all ghost edges connect different threads', () => {
    const out = buildSeed({ seed: 7 });
    expect(out.ghosts.length).toBeGreaterThan(0);
    for (const g of out.ghosts) {
      expect(g.fromThreadId).not.toBe(g.toThreadId);
    }
  });

  it('all similarities are >= 0.7', () => {
    const out = buildSeed({ seed: 7 });
    for (const g of out.ghosts) {
      expect(g.similarity).toBeGreaterThanOrEqual(0.7);
    }
  });
});
