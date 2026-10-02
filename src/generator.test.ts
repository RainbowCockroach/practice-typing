import { describe, expect, it } from 'vitest';
import { MAX_WEAK_SHARE, generateWords, weakShare } from './generator';
import { MISS_PENALTY, applyEvents, type WeakEntry } from './weakWords';

// Small deterministic random generator so tests don't flake.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const common = Array.from({ length: 100 }, (_, i) => `w${i}`);
const entry = (score: number): WeakEntry => ({ score, misses: 1, lastMiss: 0 });

describe('generateWords', () => {
  it('only uses common words when nothing is weak', () => {
    const words = generateWords(common, {}, 500, seeded(1));
    expect(words).toHaveLength(500);
    expect(words.every((w) => common.includes(w))).toBe(true);
  });

  it('never repeats a word back to back', () => {
    const words = generateWords(['a', 'b'], { a: entry(50) }, 500, seeded(2));
    expect(words.some((w, i) => w === words[i - 1])).toBe(false);
  });

  it('mixes in weak words at roughly the expected share', () => {
    const weak = { alpha: entry(3), beta: entry(3), gamma: entry(3) };
    const words = generateWords(common, weak, 10_000, seeded(3));
    const share = words.filter((w) => w in weak).length / words.length;
    expect(share).toBeGreaterThan(0.07);
    expect(share).toBeLessThan(0.11); // expected 0.09
  });

  it('picks worse words more often', () => {
    const words = generateWords(common, { bad: entry(9), meh: entry(1) }, 20_000, seeded(4));
    const count = (w: string) => words.filter((x) => x === w).length;
    expect(count('bad')).toBeGreaterThan(count('meh') * 5);
  });
});

describe('weakShare', () => {
  it('grows with weak words and tops out', () => {
    expect(weakShare(0)).toBe(0);
    expect(weakShare(5)).toBeCloseTo(0.15);
    expect(weakShare(100)).toBe(MAX_WEAK_SHARE);
  });
});

describe('applyEvents', () => {
  it('raises the score on a miss and lowers it on a clean type until gone', () => {
    const weak: Record<string, WeakEntry> = {};
    applyEvents(weak, [{ type: 'miss', word: 'the' }], 10);
    expect(weak.the).toEqual({ score: MISS_PENALTY, misses: 1, lastMiss: 10 });

    applyEvents(weak, Array(MISS_PENALTY - 1).fill({ type: 'clean', word: 'the' }), 20);
    expect(weak.the.score).toBe(1);
    applyEvents(weak, [{ type: 'clean', word: 'the' }], 30);
    expect(weak.the).toBeUndefined();
  });

  it('ignores clean types of words that were never weak', () => {
    const weak: Record<string, WeakEntry> = {};
    applyEvents(weak, [{ type: 'clean', word: 'cat' }], 0);
    expect(weak).toEqual({});
  });
});
