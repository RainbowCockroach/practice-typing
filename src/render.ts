// Draws the current state. The test's letters are built once per test and then
// only their classes change, so typing stays cheap even with hundreds of words.

import { DRILL_REPS, TEST_MS, type Result, type State } from './engine';
import type { WeakEntry } from './weakWords';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const el = {
  timer: $('timer'),
  last: $('last'),
  test: $('test'),
  words: $('words'),
  drill: $('drill'),
  drillReason: $('drill-reason'),
  drillWord: $('drill-word'),
  drillReps: $('drill-reps'),
  passed: $('passed'),
  passedWpm: $('passed-wpm'),
  passedDetail: $('passed-detail'),
  weak: $('weak'),
  weakList: $('weak-list'),
};

// Letters of the test currently on screen, flattened (each word ends with its space).
let shownWords: string[] | null = null;
let letters: HTMLElement[] = [];
let wordStarts: number[] = [];
let donePos = 0;
let caretPos = -1;
let currentWord: HTMLElement | null = null;
let wordEls: HTMLElement[] = [];
let shownDrill: Result | null = null;
let drillLetters: HTMLElement[] = [];
let lastShakeAt: number | undefined;

const CARET_HEIGHT = 0.75;

// One caret element per view that glides between letters, like MonkeyType.
const testCaret = makeCaret();
const drillCaret = makeCaret();

function makeCaret(): HTMLElement {
  const c = document.createElement('div');
  c.className = 'caret';
  return c;
}

// Moves the caret onto a letter. `animate: false` snaps it (new test, resize).
function placeCaret(caret: HTMLElement, letter: HTMLElement, animate: boolean): void {
  caret.classList.toggle('instant', !animate);
  // A bit shorter than the letter box and centred on it, so it reads as a thin line.
  const height = letter.offsetHeight * CARET_HEIGHT;
  const top = letter.offsetTop + (letter.offsetHeight - height) / 2;
  caret.style.height = `${height}px`;
  caret.style.transform = `translate(${letter.offsetLeft}px, ${top}px)`;
  if (!animate) void caret.offsetWidth; // apply the jump before transitions come back
  caret.classList.remove('instant');
}

function buildWords(words: string[]): void {
  shownWords = words;
  letters = [];
  wordStarts = [];
  wordEls = [];
  currentWord = null;
  donePos = 0;
  caretPos = -1;
  const frag = document.createDocumentFragment();
  for (const word of words) {
    wordStarts.push(letters.length);
    const w = document.createElement('span');
    w.className = 'word';
    for (const ch of word + ' ') {
      const l = document.createElement('span');
      l.className = 'letter';
      l.textContent = ch;
      w.append(l);
      letters.push(l);
    }
    frag.append(w);
    wordEls.push(w);
  }
  el.words.replaceChildren(frag, testCaret);
  el.words.classList.add('instant');
  el.words.style.transform = '';
}

function showCaret(pos: number, idle: boolean): void {
  el.words.classList.toggle('idle', idle);
  if (pos === caretPos) return; // nothing moved, skip the layout work
  const fresh = caretPos === -1;
  for (let i = donePos; i < pos; i++) letters[i].classList.add('done');
  donePos = pos;
  caretPos = pos;
  const letter = letters[pos];
  if (!letter) return;
  placeCaret(testCaret, letter, !fresh);

  const word = letter.parentElement as HTMLElement;
  if (word !== currentWord || fresh) {
    currentWord = word;
    focusWord(wordEls.indexOf(word));
  }

  // Keep the current line as the 2nd visible line once we're past the first.
  const line = word.getBoundingClientRect().height;
  const lineIdx = Math.round(word.offsetTop / line); // offsetTop is rounded, line height isn't
  el.words.style.transform = `translateY(${-Math.max(0, lineIdx - 1) * line}px)`;
  if (fresh) {
    void el.words.offsetWidth;
    el.words.classList.remove('instant');
  }
}

const AHEAD_STEPS = 6; // words ahead with their own fade step (a1..a6 in theme.css)
const BEHIND_STEPS = 3; // words behind with their own fade step (b1..b3)
const FOCUS_RANGE = 10; // words either side to restyle; clears the steps left by the last word

// Gives nearby words a class by their distance from the word being typed, so they
// fade out on both sides regardless of which row they're on. Words further away
// keep the plain `.word` style, which is the faintest.
function focusWord(idx: number): void {
  const from = Math.max(0, idx - FOCUS_RANGE);
  const to = Math.min(wordEls.length, idx + FOCUS_RANGE);
  for (let i = from; i < to; i++) {
    const d = i - idx;
    const cls =
      d === 0 ? 'word current' : d > 0 ? (d <= AHEAD_STEPS ? `word a${d}` : 'word') : -d <= BEHIND_STEPS ? `word b${-d}` : 'word';
    if (wordEls[i].className !== cls) wordEls[i].className = cls;
  }
}

function showDrill(s: Extract<State, { kind: 'drill' }>): void {
  const fresh = shownDrill !== s.last;
  if (fresh) {
    shownDrill = s.last;
    drillLetters = [...s.word].map((ch) => {
      const l = document.createElement('span');
      l.className = 'letter';
      l.textContent = ch;
      return l;
    });
    el.drillWord.replaceChildren(...drillLetters, drillCaret);
  }
  drillLetters.forEach((l, i) => l.classList.toggle('done', i < s.charIdx));
  // Going back to the first letter (new rep or a mistake) snaps instead of sliding back.
  placeCaret(drillCaret, drillLetters[s.charIdx], !fresh && s.charIdx > 0);
}

// Letter positions change when the window resizes or the web font finishes loading.
export function relayout(): void {
  caretPos = -1;
  shownDrill = null;
}

function lastText(last?: Result): string {
  if (!last) return '';
  return last.passed
    ? `last: <span class="ok">${last.wpm} wpm</span>`
    : `last: <span class="bad">failed on "${escape(last.failedOn)}"</span>`;
}

function show(view: 'test' | 'drill' | 'passed'): void {
  el.test.hidden = view !== 'test';
  el.drill.hidden = view !== 'drill';
  el.passed.hidden = view !== 'passed';
}

export function render(s: State, now: number): void {
  switch (s.kind) {
    case 'ready':
    case 'running': {
      show('test');
      if (shownWords !== s.words) buildWords(s.words);
      const pos = s.kind === 'running' ? wordStarts[s.wordIdx] + s.charIdx : 0;
      showCaret(pos, s.kind === 'ready');
      const left = s.kind === 'running' ? TEST_MS - (now - s.startedAt) : TEST_MS;
      el.timer.textContent = String(Math.max(0, Math.ceil(left / 1000)));
      el.last.innerHTML = lastText(s.last);
      break;
    }

    case 'drill': {
      show('drill');
      el.timer.textContent = '';
      el.last.innerHTML = '';
      const typed = s.typed === ' ' ? 'space' : s.typed;
      const expected = s.expected === ' ' ? 'space' : s.expected;
      el.drillReason.innerHTML = `you typed <b>${escape(typed)}</b> instead of <b>${escape(expected)}</b>`;
      showDrill(s);
      if (s.wrongAt !== undefined && s.wrongAt !== lastShakeAt) {
        lastShakeAt = s.wrongAt;
        el.drillWord.classList.remove('shake');
        void el.drillWord.offsetWidth; // restart the animation
        el.drillWord.classList.add('shake');
      }
      el.drillReps.innerHTML = Array.from({ length: DRILL_REPS }, (_, i) =>
        i < s.reps ? '<span class="on">●</span>' : '○',
      ).join('');
      break;
    }

    case 'passed': {
      show('passed');
      el.timer.textContent = '';
      el.last.innerHTML = '';
      if (s.result.passed) {
        el.passedWpm.textContent = String(s.result.wpm);
        el.passedDetail.textContent = `60s · 100% accuracy · ${s.result.chars} characters`;
      }
      break;
    }
  }
}

export function renderWeak(list: [string, WeakEntry][]): void {
  el.weakList.replaceChildren(
    ...(list.length
      ? list.map(([word, e]) => {
          const li = document.createElement('li');
          li.textContent = word;
          const n = document.createElement('span');
          n.textContent = `${e.misses}×`;
          li.append(n);
          return li;
        })
      : [Object.assign(document.createElement('li'), { className: 'empty', textContent: 'none yet' })]),
  );
}

export function toggleWeak(open?: boolean): boolean {
  el.weak.hidden = open === undefined ? !el.weak.hidden : !open;
  return !el.weak.hidden;
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
