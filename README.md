# practice-typing

A MonkeyType-style typing trainer where one mistake ends the test.
Live at https://rainbowcockroach.github.io/practice-typing/ (deployed from `main` by GitHub Actions).

- 60-second tests built from the ~2800 core English words of the New General Service List
- Any wrong key fails the test, then you retype the missed word until you get it right twice
- Pass the full minute and you get your WPM
- Words you miss come back more often until you type them right a few times
- Colours from the Ghostty "Novel" theme, UI in Fira Code; pick the typing font at the bottom (default Crimson Text)

Keys: `esc` restarts (or skips the drill), `tab` shows the words you miss.

```sh
npm install
npm run dev    # http://localhost:5173
npm test
npm run build  # static site in dist/
```

The word list lives in `src/words/ngsl.json`. It is the
[New General Service List 1.2](https://www.newgeneralservicelist.com) by Browne, Culligan and Phillips,
licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), so `ngsl.json` is shared under the same license.
To rebuild it, download `NGSL_12_stats.csv` from that site and run `node scripts/build-words.mjs <NGSL_12_stats.csv>`.
