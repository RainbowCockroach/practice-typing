import { describe, expect, it } from 'vitest';
import { DRILL_REPS, TEST_MS, onEscape, onKey, onTick, ready, wpmOf, type State } from './engine';

const makeWords = () => ['the', 'cat', 'sat'];

function typeAll(s: State, text: string, now = 0) {
  const events = [];
  for (const ch of text) {
    const step = onKey(s, ch, now, makeWords);
    s = step.state;
    events.push(...step.events);
  }
  return { state: s, events };
}

describe('test', () => {
  it('starts the timer on the first key', () => {
    const { state } = typeAll(ready(makeWords), 't', 500);
    expect(state).toMatchObject({ kind: 'running', startedAt: 500, wordIdx: 0, charIdx: 1 });
  });

  it('moves to the next word on space and reports it as clean', () => {
    const { state, events } = typeAll(ready(makeWords), 'the ');
    expect(state).toMatchObject({ kind: 'running', wordIdx: 1, charIdx: 0, typedChars: 4 });
    expect(events).toEqual([{ type: 'clean', word: 'the' }]);
  });

  it('fails on a wrong letter and starts a drill on that word', () => {
    const { state, events } = typeAll(ready(makeWords), 'the cx');
    expect(state).toMatchObject({ kind: 'drill', word: 'cat', reps: 0, typed: 'x', expected: 'a' });
    expect(events).toContainEqual({ type: 'miss', word: 'cat' });
  });

  it('fails on a space before the word is finished', () => {
    const { state } = typeAll(ready(makeWords), 'th ');
    expect(state).toMatchObject({ kind: 'drill', word: 'the', typed: ' ', expected: 'e' });
  });

  it('fails on a letter where a space should be', () => {
    const { state } = typeAll(ready(makeWords), 'thec');
    expect(state).toMatchObject({ kind: 'drill', word: 'the', typed: 'c', expected: ' ' });
  });

  it('passes after 60s with the right wpm', () => {
    const { state } = typeAll(ready(makeWords), 'the cat ');
    const done = onTick(state, TEST_MS);
    expect(done).toEqual({ kind: 'passed', result: { passed: true, wpm: 2, chars: 8 } });
  });

  it('ignores keys that arrive after time is up', () => {
    const { state } = typeAll(ready(makeWords), 'the ');
    const step = onKey(state, 'x', TEST_MS + 1, makeWords);
    expect(step.state.kind).toBe('passed');
    expect(step.events).toEqual([]);
  });

  it('keeps running just before 60s', () => {
    const { state } = typeAll(ready(makeWords), 't');
    expect(onTick(state, TEST_MS - 1)).toBe(state);
  });

  it('shows the passed result on the next test', () => {
    const passed = onTick(typeAll(ready(makeWords), 'the ').state, TEST_MS);
    const next = onKey(passed, ' ', TEST_MS, makeWords).state;
    expect(next).toMatchObject({ kind: 'ready', last: { passed: true } });
  });
});

describe('drill', () => {
  const drill = () => typeAll(ready(makeWords), 'the cx').state;

  it('counts a rep for each clean retype', () => {
    expect(typeAll(drill(), 'catca').state).toMatchObject({ kind: 'drill', reps: 1, charIdx: 2 });
  });

  it('a wrong key restarts only the current rep', () => {
    const s = typeAll(drill(), 'catcax', 42).state;
    expect(s).toMatchObject({ kind: 'drill', reps: 1, charIdx: 0, wrongAt: 42 });
  });

  it(`loads a new test after ${DRILL_REPS} reps, remembering the fail`, () => {
    const s = typeAll(drill(), 'cat'.repeat(DRILL_REPS)).state;
    expect(s).toMatchObject({ kind: 'ready', last: { passed: false, failedOn: 'cat' } });
  });

  it('esc skips the drill', () => {
    expect(onEscape(drill(), makeWords)).toMatchObject({ kind: 'ready', last: { failedOn: 'cat' } });
  });
});

describe('wpmOf', () => {
  it('uses 5 characters per word', () => {
    expect(wpmOf(350, 60_000)).toBe(70);
  });
});
