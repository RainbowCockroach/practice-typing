// Builds src/words/en1k.json from the google-10000-english list
// (https://github.com/first20hours/google-10000-english, MIT).
// That list comes from web pages, so we drop web jargon, brands and names:
// a word is kept only if it (or its stem) is a real lowercase dictionary word.
// Usage: node scripts/build-words.mjs <google-10000-english-usa-no-swears.txt>
import { readFileSync, writeFileSync } from 'node:fs';

const SIZE = 1000;
const dict = new Set(
  readFileSync('/usr/share/dict/words', 'utf8').split('\n').filter((w) => /^[a-z]+$/.test(w)),
);
const TWO_LETTER = new Set('am an as at be by do go he if in is it me my no of oh on or so to up us we'.split(' '));
const BLOCK = new Set(`
  click online site sites page pages search email info copyright forum forums login blog blogs
  web website homepage download downloads upload url html pdf rss faq usr com net www dvd cd tv pc
  gay poker casino teen adult mature pics lyrics ebay yahoo google microsoft linux sony
  cart shipping sponsored powered hosting reserved posted subscribe newsletter thread browse
  mar sep dec oct nov feb apr aug jul jun jan mon eur ad
  canada china japan york james san non pro via bush zip logo auto tech teens sat
`.split(/\s+/).filter(Boolean));

const inDict = (w) =>
  dict.has(w) ||
  [/s$/, /es$/, /ed$/, /d$/, /ing$/, /ly$/, /er$/].some((re) => dict.has(w.replace(re, ''))) ||
  dict.has(w.replace(/ies$/, 'y')) ||
  dict.has(w.replace(/ing$/, 'e'));

const words = [];
for (const w of readFileSync(process.argv[2], 'utf8').split('\n')) {
  if (!/^[a-z]+$/.test(w) || BLOCK.has(w)) continue;
  if (w.length === 1 ? w !== 'a' && w !== 'i' : w.length === 2 ? !TWO_LETTER.has(w) : !inDict(w)) continue;
  words.push(w);
  if (words.length === SIZE) break;
}
writeFileSync('src/words/en1k.json', JSON.stringify(words) + '\n');
console.log(`wrote ${words.length} words`);
