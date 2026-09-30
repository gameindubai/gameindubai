# Pew Pew Space — World 6 (adopted)

**Location:** Museum of the Future, Sheikh Zayed Road (25.2192, 55.2820). The museum's OSS Hope space-station experience.
**Status:** Live · **Engine:** standalone (its own three.js r128 engine, wrapped by the site shell)
**Source:** `src/pew-pew-space/game.html` (adapted); `src/pew-pew-space/original-kidzee.html` (the untouched original from kidzee.games)

## Why it's here
Samar's first game, already built for kidzee.games. Rather than rebuild it, it was adopted into World 6 because its space setting matches the Museum of the Future's trip to the OSS Hope station. This replaces the unbuilt "OSS Hope" concept (archived in `CONCEPTS.md`).

## How it plays
Drag anywhere to fly, and your guns fire by themselves. Enemies break apart **block by block**; their glowing **pink cores** are the weak point. Scouts dive at you, heavier bots fire spread shots, and the **Junk King** boss arrives every 5th wave. Your hull loses blocks when hit and rebuilds with repair pickups. Other power-ups: rapid fire, triple shot.

## What changed from the kidzee.games version
| Area | Before | Now |
|---|---|---|
| Story | Alien battleships invading | **Runaway junk-bots trashing the orbit around the OSS Hope station**: you clean up space (keeps the "never attacking" rule) |
| Enemy look | Purple alien hulls, green veins and lights | Grey scrap metal with rust streaks, steel armour, orange warning lights; **pink cores unchanged** |
| Enemy shots | Green plasma | Orange scrap bolts |
| Boss | Mothership | **Junk King** |
| Background | Purple banded planet | Block **Earth** + the **OSS Hope station** ring turning in the distance |
| Game-over title | SHIP DESTROYED | **BACK TO BASE** (kinder; the title font only has 17 letters) |
| Best score | Reset on every reload | Saved on the device |
| Site features | None | MAP button, loading splash, analytics, play count, TOP SCORE / YOUR BEST, NEW TOP SCORE!, offline play, Samar Blocks font, gold buttons |
| Hardening | None | Error isolation + run-ending safety net, frame-stall fallback, 3D-context-loss reload, keyboard start |
| Tests | None | The whole suite (boot, play beacon, score submit, GA, bot, boss, safety net, frozen frames, offline) via the `?debug=1` bridge |

kidzee.games still serves the original alien version. Whether to point it at gameindubai.com is an open decision.

## Debug
`/games/pew-pew-space/?debug=1&bot=1&wave=5`: the bot flies, and wave 5 is the Junk King.
