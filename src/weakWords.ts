// Remembers the words you get wrong so the generator can bring them back more often.

import type { Event, Result } from './engine';

export const MISS_PENALTY = 3;
const STORAGE_KEY = 'pt:v1';
const HISTORY_LIMIT = 200;

export interface WeakEntry {
  score: number;
  misses: number;
  lastMiss: number;
}

export interface Saved {
  weak: Record<string, WeakEntry>;
  history: ({ at: number } & Result)[];
}

const empty = (): Saved => ({ weak: {}, history: [] });

export function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

export function save(data: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be full or blocked (private window). The app still works, it just forgets.
  }
}

// Missing a word raises its score; typing it right in a real test lowers it until it's gone.
export function applyEvents(weak: Record<string, WeakEntry>, events: Event[], now: number): void {
  for (const e of events) {
    const entry = weak[e.word];
    if (e.type === 'miss') {
      weak[e.word] = {
        score: (entry?.score ?? 0) + MISS_PENALTY,
        misses: (entry?.misses ?? 0) + 1,
        lastMiss: now,
      };
    } else if (entry) {
      entry.score -= 1;
      if (entry.score <= 0) delete weak[e.word];
    }
  }
}

export function recordResult(data: Saved, result: Result, now: number): void {
  data.history.push({ at: now, ...result });
  if (data.history.length > HISTORY_LIMIT) data.history.splice(0, data.history.length - HISTORY_LIMIT);
}

export function topWeak(weak: Record<string, WeakEntry>, n: number): [string, WeakEntry][] {
  return Object.entries(weak)
    .sort((a, b) => b[1].score - a[1].score || b[1].lastMiss - a[1].lastMiss)
    .slice(0, n);
}
