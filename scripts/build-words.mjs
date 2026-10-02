// Builds src/words/ngsl.json from the New General Service List 1.2
// (https://www.newgeneralservicelist.com, CC BY-SA 4.0): about 2800 core English words,
// most common first. We only lowercase it ("I", and "TRUE"/"FALSE" that a spreadsheet uppercased).
// Usage: node scripts/build-words.mjs <NGSL_12_stats.csv>
import { readFileSync, writeFileSync } from 'node:fs';

const words = readFileSync(process.argv[2], 'utf8')
  .trim()
  .split('\n')
  .slice(1) // header row
  .map((line) => line.split(',')[0].toLowerCase());

if (!words.every((w) => /^[a-z]+$/.test(w))) throw new Error('unexpected word in the list');
writeFileSync('src/words/ngsl.json', JSON.stringify(words) + '\n');
console.log(`wrote ${words.length} words`);
