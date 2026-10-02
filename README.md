# practice-typing

A MonkeyType-style typing trainer where one mistake ends the test.
Live at https://rainbowcockroach.github.io/practice-typing/ (deployed from `main` by GitHub Actions).

- 60-second tests built from the 1000 most common English words
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

The word list lives in `src/words/en1k.json`. To rebuild it from
[google-10000-english](https://github.com/first20hours/google-10000-english) (MIT), run
`node scripts/build-words.mjs <google-10000-english-usa-no-swears.txt>` (macOS, uses `/usr/share/dict/words`).
