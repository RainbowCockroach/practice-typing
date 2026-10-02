import './theme.css';
import common from './words/ngsl.json';
import { onEscape, onKey, onTick, ready, type State } from './engine';
import { FONTS, applyFont, loadFont } from './fonts';
import { generateWords } from './generator';
import { relayout, render, renderWeak, toggleWeak } from './render';
import { applyEvents, load, recordResult, save, topWeak } from './weakWords';

const WEAK_SHOWN = 15;

const data = load();
const makeWords = () => generateWords(common, data.weak);
let state: State = ready(makeWords);

function set(next: State): void {
  const prev = state;
  state = next;
  // Save a result the moment a test ends (pass or fail).
  if (prev.kind === 'running' && next.kind === 'passed') recordResult(data, next.result, Date.now());
  if (prev.kind === 'running' && next.kind === 'drill') recordResult(data, next.last, Date.now());
  if (prev.kind !== next.kind) save(data);
  render(state, performance.now());
}

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'Tab') {
    e.preventDefault();
    if (toggleWeak()) renderWeak(topWeak(data.weak, WEAK_SHOWN));
    return;
  }
  if (e.key === 'Escape') {
    set(onEscape(state, makeWords));
    return;
  }
  const isEnter = e.key === 'Enter' && state.kind === 'passed';
  if (e.key.length !== 1 && !isEnter) return;

  e.preventDefault(); // stop space from scrolling the page
  const step = onKey(state, e.key, performance.now(), makeWords);
  if (step.events.length) applyEvents(data.weak, step.events, Date.now());
  set(step.state);
});

document.getElementById('weak-reset')!.addEventListener('click', (e) => {
  data.weak = {};
  save(data);
  renderWeak([]);
  (e.currentTarget as HTMLElement).blur(); // so space doesn't click it again
  set(ready(makeWords, state.kind === 'passed' ? state.result : state.last));
});

// The clock only matters while a test is running.
function tick(): void {
  if (state.kind === 'running') {
    const next = onTick(state, performance.now());
    if (next !== state) set(next);
    else render(state, performance.now());
  }
  requestAnimationFrame(tick);
}

function rerender(): void {
  relayout();
  render(state, performance.now());
}
window.addEventListener('resize', rerender);
document.fonts.ready.then(rerender);

const picker = document.getElementById('font') as HTMLSelectElement;
picker.append(...FONTS.map((f) => new Option(f.name, f.name)));
picker.value = loadFont().name;
applyFont(loadFont()).then(rerender);
picker.addEventListener('change', () => {
  picker.blur(); // hand the keyboard back to the test
  applyFont(FONTS.find((f) => f.name === picker.value) ?? FONTS[0]).then(rerender);
});

render(state, performance.now());
requestAnimationFrame(tick);
