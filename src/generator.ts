// Builds the word list for a test, mixing in words you often get wrong.

import type { WeakEntry } from './weakWords';

export const TEST_WORDS = 400; // more than anyone types in a minute
export const MAX_WEAK_SHARE = 0.3;
const WEAK_SHARE_PER_WORD = 0.03;

export type Rng = () => number;

export function weakShare(weakCount: number): number {
  return Math.min(MAX_WEAK_SHARE, WEAK_SHARE_PER_WORD * weakCount);
}

export function generateWords(
  common: string[],
  weak: Record<string, WeakEntry>,
  count = TEST_WORDS,
  rng: Rng = Math.random,
): string[] {
  const weakList = Object.entries(weak).filter(([, e]) => e.score > 0);
  const totalScore = weakList.reduce((sum, [, e]) => sum + e.score, 0);
  const share = weakShare(weakList.length);

  const pickWeak = (): string => {
    let r = rng() * totalScore;
    for (const [word, e] of weakList) {
      r -= e.score;
      if (r < 0) return word;
    }
    return weakList[weakList.length - 1][0];
  };
  const pickCommon = (): string => common[Math.floor(rng() * common.length)];

  const words: string[] = [];
  while (words.length < count) {
    const word = weakList.length && rng() < share ? pickWeak() : pickCommon();
    // Never the same word twice in a row (unless there's no other choice).
    if (word === words[words.length - 1] && common.length > 1) continue;
    words.push(word);
  }
  return words;
}
