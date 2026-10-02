// Pure test logic. Every rule lives here so it can be unit-tested without a browser.

export const TEST_MS = 60_000;
export const DRILL_REPS = 2; // clean retypes needed; wrong attempts don't count

export type Result =
  | { passed: true; wpm: number; chars: number }
  | { passed: false; failedOn: string };

export type State =
  | { kind: 'ready'; words: string[]; last?: Result }
  | {
      kind: 'running';
      words: string[];
      wordIdx: number;
      charIdx: number; // === word.length means the space is next
      startedAt: number;
      typedChars: number;
      last?: Result;
    }
  | { kind: 'passed'; result: Result }
  | {
      kind: 'drill';
      word: string;
      reps: number;
      charIdx: number;
      typed: string; // the wrong key that failed the test
      expected: string;
      wrongAt?: number; // last wrong key inside the drill, for the shake effect
      last: Result;
    };

// Things the outside world cares about (used to update weak-word stats).
export type Event = { type: 'miss'; word: string } | { type: 'clean'; word: string };

export interface Step {
  state: State;
  events: Event[];
}

export type MakeWords = () => string[];

export const ready = (makeWords: MakeWords, last?: Result): State => ({
  kind: 'ready',
  words: makeWords(),
  last,
});

export function wpmOf(typedChars: number, elapsedMs: number): number {
  return Math.round(typedChars / 5 / (elapsedMs / 60_000));
}

export function onTick(s: State, now: number): State {
  if (s.kind !== 'running' || now - s.startedAt < TEST_MS) return s;
  return {
    kind: 'passed',
    result: { passed: true, wpm: wpmOf(s.typedChars, TEST_MS), chars: s.typedChars },
  };
}

export function onKey(s: State, key: string, now: number, makeWords: MakeWords): Step {
  switch (s.kind) {
    case 'ready':
      return typeInTest(
        { kind: 'running', words: s.words, wordIdx: 0, charIdx: 0, startedAt: now, typedChars: 0, last: s.last },
        key,
      );

    case 'running': {
      const timedOut = onTick(s, now);
      if (timedOut !== s) return { state: timedOut, events: [] };
      return typeInTest(s, key);
    }

    case 'passed':
      if (key === ' ' || key === 'Enter') return { state: ready(makeWords, s.result), events: [] };
      return { state: s, events: [] };

    case 'drill': {
      if (key !== s.word[s.charIdx]) return { state: { ...s, charIdx: 0, wrongAt: now }, events: [] };
      const charIdx = s.charIdx + 1;
      if (charIdx < s.word.length) return { state: { ...s, charIdx }, events: [] };
      const reps = s.reps + 1;
      if (reps >= DRILL_REPS) return { state: ready(makeWords, s.last), events: [] };
      return { state: { ...s, reps, charIdx: 0 }, events: [] };
    }
  }
}

function typeInTest(s: Extract<State, { kind: 'running' }>, key: string): Step {
  const word = s.words[s.wordIdx];
  const expected = s.charIdx < word.length ? word[s.charIdx] : ' ';

  if (key !== expected) {
    const last: Result = { passed: false, failedOn: word };
    return {
      state: { kind: 'drill', word, reps: 0, charIdx: 0, typed: key, expected, last },
      events: [{ type: 'miss', word }],
    };
  }

  const typedChars = s.typedChars + 1;
  if (key !== ' ') return { state: { ...s, charIdx: s.charIdx + 1, typedChars }, events: [] };
  return {
    state: { ...s, wordIdx: s.wordIdx + 1, charIdx: 0, typedChars },
    events: [{ type: 'clean', word }],
  };
}

// Esc: skip the drill, or throw away the current test without it counting as a fail.
export function onEscape(s: State, makeWords: MakeWords): State {
  return ready(makeWords, s.kind === 'passed' ? s.result : s.last);
}
