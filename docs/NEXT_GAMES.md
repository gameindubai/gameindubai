# Next Games Guide (worlds 4–10)

**Source of truth:** [`CONCEPTS.md`](CONCEPTS.md). Build from it, never from a summary. The briefs below restate each concept in build terms (verb, fail state, boss, power-ups, what to reuse).

Suggested order: **4 Frame Builder → 5 Fountain Conductor → 8 Penguin March → 10 Cheetah Run → 9 Falcon Strike → 7 Camera Flyer → 6 OSS Hope**. Each step reuses the most from the last; OSS Hope's momentum physics is the most novel, so it goes last. Check GA4 first: `select_content` events with `content_type=coming_soon` show which locked game kids tap most. Build demand first if it's clear.

---

## The workflow that worked for Shine Crew (copy it, and save AI credits)

Shine Crew went from nothing to live in one working session with this sequence. Each step produces something testable.

1. **Read the concept** in `CONCEPTS.md` and the closest existing game's files (the engine contract is in `GAME_ENGINE.md`). Don't have an AI re-read the whole engine each session; point it at `GAME_ENGINE.md` plus one reference game.
2. **Write two files:** `src/<id>.world.js` (textures, sprites, scene, models, `World`, `layout()`) and `src/<id>.rules.js` (`let GAMEDEF=null;` at the top, gameplay, then `GAMEDEF={...}; Kit.run(GAMEDEF);`).
3. **Wire it:** set `live:true` in `WORLDS` (`src/pixel.js`), and add the file list to `GAMES`, a page colour to `GAME_BG`, and 5 loading lines to `GAME_LINES` in `build_site.py`.
4. **Placeholder card:** copy any card to `src/static/assets/cards/<id>.webp` (the build needs one), then replace it with a real capture at the end.
5. **Boot test:** open `/games/<id>/?debug=1&bot=1` and look for zero console errors.
6. **Bot run:** `?debug=1&bot=1&wave=2`, and log `G.state, G.phase, G.wave, G.score, G.lives` every few seconds. This finds pacing problems fast.
7. **Force the rare stuff** through the `debug` object (spawn the special enemy, each power-up, jump to `?wave=5` for the boss) instead of playing until it happens.
8. **Screens:** a phone at 390×844 and a landscape desktop. Check that the HUD doesn't overlap the play area and the speech bubble placement.
9. **Card capture:** 480×640 viewport, hide `#ui`, grab a frame mid-action, crop to 480×360, save as WebP q82.
10. **Home check:** the desktop columns must still fit (Chrome + WebKit, 1280×700 / 1366×650 / 1440×860).
11. **Regression:** installability, offline boot of every game, then deploy and live-verify.

**Credit-saving rules of thumb**
- Give the AI the concept paragraph, `GAME_ENGINE.md`, and *one* reference game, not the whole repo.
- Ask for the world file and the rules file in separate steps; review visuals between them.
- Test with the bot and debug hooks, not by describing screenshots at length.
- When something breaks, reproduce it with a forced state (`__game` hooks) before changing code.

---

## World briefs

### 4 — Frame Builder (Dubai Frame) · verb: **place**
- **Real hook:** 150 m × 93 m, golden-ratio proportions, gold-toned steel (Dubai's old name, City of Gold). A 93 m glass-floored bridge joins the towers, and the floor turns clear halfway across.
- **Play:** drag the crane hook; a block drops **on a steady beat**, alternating left tower then right tower. Keep both towers **level**. A badly placed block overhangs and is trimmed (Stack-style).
- **Fail state:** an overhang trimmed to nothing, or towers more than N blocks out of level, costs a life.
- **Boss (each 5 waves = 150 m):** lower the bridge across both towers in the wind. If the towers are uneven, it won't seat. A perfect placement turns the glass floor clear.
- **Power-ups:** laser guide, slow crane, gold block (auto-levels the towers).
- **View:** the Creek and souks to the north, the Burj and Business Bay to the south, changing as you climb.
- **Reuse:** Shine Crew's pendulum (crane hook swing), Juggle's drag mapping, the engine's beat clock from `AudioKit` for drop timing.

### 5 — Fountain Conductor (Dubai Fountain) · verb: **conduct** (auto-fire)
- **Real hook:** Shooters, Oarsmen, robots, and Extreme Shooters reaching 500 ft that boom. Five circles and two arcs, with abras crossing Burj Lake.
- **Play:** move the nozzle rig around the circles and arcs; jets **fire on every beat**. Be under each light cue when its beat lands. Soaking an abra is a penalty.
- **Boss:** the Extreme Shooter finale. Hold inside a ring for 3 beats to build pressure, then BOOM.
- **Power-ups:** Superlights (×2), an extra nozzle, a slowed beat. **Original music only.**
- **Reuse:** the engine music scheduler (make gameplay read `AudioKit` beat timing), Shine Crew's auto-fire targeting.

### 6 — OSS Hope (Museum of the Future) · verb: **fix**
- **Real hook:** a Falcon capsule to the OSS Hope station (2071), 600 km up, with moon energy and gliding robots.
- **Play:** zero-G drift; you steer with **momentum**. Micrometeoroids knock hull blocks loose, and drifting into a gap snaps a replacement block in. Too many open gaps and the station goes dark.
- **Boss:** the moon-energy array overloads. Fix 5 relay nodes while dodging its sweeping beam.
- **Power-ups:** robot helper, jet burst, magnet (pulls loose blocks to you).

### 7 — Camera Flyer (Skydive Dubai) · verb: **capture**
- **Real hook:** 60 s freefall at 120 mph from 13,000 ft over the Palm, the Burj Al Arab and The World Islands, and every jump is filmed.
- **Play:** you're the videographer. Each wave is one freefall. Hold each tandem pair **in frame until the shutter fills**.
- **Boss:** an 8-person formation. Frame it before it breaks, then end with a canopy landing on the target.
- **Power-ups:** wide-angle lens, burst mode, speed suit. Bonus for landmarks in the background, and best frames save as shareable photos.

### 8 — Penguin March (Ski Dubai) · verb: **herd**
- **Real hook:** Gentoo and King penguins' March of the Penguins; zorbing, a 45 km/h bobsled, the ice cave.
- **Play:** lead the march **snake-style**. Walk into stray penguins to grow the line. If a zorb, a tuber or your own line cuts across, the penguins behind the cut **waddle back to the colony** (never hurt).
- **Boss:** a snow-gun blizzard while zorbs roll down the slope.
- **Power-ups:** hot cocoa (speed), fish bucket (magnet), chairlift (jump across the park).

### 9 — Falcon Strike (Dubai Desert) · verb: **catch**
- **Real hook:** desert-camp falconry; the Dubai Desert Conservation Reserve (oryx and gazelles as **scenery only**).
- **Play:** you're the falcon. The falconer swings a lure in loops; **drag to intercept**. Each catch makes the next arc faster. Diving from higher multiplies speed and score but risks overshooting, and rival falcons compete for the lure.
- **Boss:** a sandstorm round where the lure only shows in flashes.
- **Power-ups:** thermal updraft, falcon-eye slow-mo, tailwind.

### 10 — Cheetah Run (Dubai Safari Park) · verb: **run and jump**
- **Real hook:** the cheetah run at Explorer Village; Salam the white rhino calf (born 1 March 2026) and Zuri the giraffe calf.
- **Play:** auto-run; **drag to switch lanes**, jump streams and logs, weave through herds. Brushing an animal only makes you **stumble and lose speed**; no animal is ever hit.
- **Boss:** race the Explorer Safari bus to the gate. Passing Salam and Zuri gently earns a bonus.
- **Power-ups:** sprint burst, pounce (long jump), second wind.

---

## What every new game gets for free
Title/HUD/pause/game-over screens, TOP SCORE (global) + YOUR BEST, scoring and combos, lives, speech bubbles, particles, synth audio, PWA/offline, play counter + global best (D1), GA4 events, the map pin and card (via `WORLDS`), the loading splash (via `GAME_LINES`).

## Reusable parts by game
| Need | Take it from |
|---|---|
| Drag-to-position | `juggle-show.rules.js` `screenToWorldX`, `shine-crew.rules.js` (same idea at the gondola plane) |
| Pendulum / swing | `shine-crew.rules.js` `updateCradle` |
| Auto-fire at nearest target | `shine-crew.rules.js` `spray` |
| Weak point / core mechanics | `fruit-rush.3.js` boss weak point, `shine-crew` thick-crust core |
| Wall-style boss with HP = blocks left | `shine-crew.rules.js` `startBoss` |
| Toss arcs + queue (safe pattern) | `fruit-rush.3.js` `queueToss` / due-queue processing |
| Collectible album | `fruit-rush.2.js` species + `discover` |
| Lifetime counter on title | `shine-crew` `Life.windows` + `titleExtra` |
| Voxel people | `buildKeeper` (fruit-rush), `buildCradle` workers (shine-crew) |
| Scrolling world with pane/grid snapping | `shine-crew.world.js` `buildFacade` + `paneY` |
