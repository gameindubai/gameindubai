# Testing

**Rule: nothing ships unless the whole suite passes.** Deploys go through `scripts/deploy.py` (or CI), and both run the tests first.

## Run it
```bash
pip install -r requirements-dev.txt
python -m playwright install --with-deps chromium webkit
python -m pytest            # full suite (~4–5 min): builds ./site fresh, serves it, tests it
python -m pytest -k home    # just one area
python -m pytest -m live    # post-deploy smoke tests against https://gameindubai.com (read-only)
```
Needs Python 3.10+, Node 18+ (for syntax checks and the API test), and Playwright browsers.

## What's covered (`tests/`)
| File | Guards |
|---|---|
| `test_build.py` | Every live game has its page, code, card image, sitemap entry, offline precache entry and play-counter allowlist entry. The GA tag with ad signals off is on every page. Every `?v=` link points to an existing file with the right hash. All JS parses. **No CSS class is defined twice at top level** (catches the `.stats` collision). |
| `test_home.py` | At 7 screen sizes × Chrome + Safari's engine: **every live card shows its PLAY COUNT and TOP SCORE** (or BE THE FIRST!), fully inside the card. Nothing spills out of cards, no sideways scrolling, desktop columns fit the screen, section labels aren't buttons, and the pin, card and coming-soon counts are right. Cards still work if the stats API is down. |
| `test_about.py` | The About page on phone and desktop in both engines: game count, stats grid, Samar's photo, and play counts on the cards. |
| `test_games.py` | For **every live game** (new games are covered automatically): boots with zero errors; a started run sends the play beacon with the right game id; a finished run submits the score; GA `game_start`/`game_over` fire; the bot scores; the wave-5 boss is reached and keeps running; repeated logic errors end the run cleanly (and report to GA); taps work even when animation frames freeze (iOS resume). Plus the Fruit Rush Dome 5 freeze regression. |
| `test_pwa.py` | Installable (Chrome's own check). Home, About and every game boot **offline**. **A new deploy reaches players on their first reload.** |
| `test_worker.py` | The real `_worker.js` API against an in-memory D1: plays counting, records only going up, impossible scores rejected, unknown games rejected, other websites rejected, caching, pass-through, no-DB 503, and every live game accepted. |
| `test_live.py` (`-m live`) | After deploy: pages up, the live site runs **this** build, every live game is listed, the API recognises every live game (without writing anything), play counts are visible on the real home page, and the www redirect works. |

## Proving a test works
When adding a test for a bug, run it against the broken code first and watch it fail. The play-count test fails on the build that hid play counts (laptop and desktop sizes in both engines). Only then trust it.

## Debug hooks
- `?debug=1` exposes `window.__game` (`G`, `GAME`, `Top`, `Loop`, `startGame`, `loseLife`, `pause`, plus each game's `debug` object).
- `?bot=1` auto-plays. `?wave=N` starts at wave N (5 = first boss).
- The tests mock `/api/*`, block Google Analytics, and record `navigator.sendBeacon` payloads in `window.__beacons`.
- `BUILD_MARK=... python build_site.py` appends a marker to each game's code (used to simulate a new deploy).

## When you add a game
Nothing to add: the suite reads `WORLDS` and tests every live game. Add a regression test for anything special (like the Fruit Rush broken-toss test).
