# Architecture

## System Overview

```
Browser
  │
  ├─ / (home)          index.html → kit/pixel.js + assets/site.js
  ├─ /about/           about/index.html → same
  ├─ /games/<id>/      games/<id>/index.html → kit/three.min.js + kit/pixel.js + kit/blockkit.js + games/<id>/world.js
  └─ /api/plays        Cloudflare Worker (_worker.js) → D1 database
     /api/stats

Cloudflare Pages (static hosting)
  ├─ CDN serves all files
  ├─ _headers → 1-year immutable cache for /kit/* and /assets/*
  ├─ _routes.json → only /api/* hits the Worker
  └─ _worker.js → play count + global top scores

D1 database (SQLite at the edge)
  └─ games table: id TEXT PK, plays INTEGER, best INTEGER, best_at INTEGER
```

---

## Source → Build → Deploy

```
src/               build_site.py         site/                 Cloudflare Pages
─────────────────  ──────────────────►  ──────────────────   ──────────────────
pixel.js           generates HTML        index.html            CDN + SW caches
blockkit.js        inlines fonts         about/index.html      immutable assets
site.css           hashes assets (?v=)   404.html              D1 plays/scores
site.js            builds SW             manifest.webmanifest  GA4 analytics
juggle-show.*.js   writes SW             sw.js
fruit-rush.*.js    writes worker         _worker.js
three.min.js       writes _routes.json   _routes.json
static/assets/     icon PNGs             kit/ (pixel+blockkit+three)
                                         assets/ (css,js,font,sticker,cards)
                                         games/<id>/index.html + world.js
```

The build script (`build_site.py`) is the single source of truth. Running it rebuilds the entire `site/` directory. Nothing in `site/` should be hand-edited.

---

## Source Layers

### Layer 1: `src/pixel.js` (shared by games AND website)

Loaded first on every page. Contains:

- **PAL** — colour palette constants (INK, NIGHT, NAVY, AQUA, GOLD, CORAL, LIME, SAND, WHITE)
- **FONT** — 5×7 pixel bitmap font, 51 glyphs, stored as arrays of `"#..."` strings per row
- **SPR** — 24 pixel sprites (landmark icons + game commentators + UI sprites), each defined as `{pal: {letter: hex}, rows: [strings]}`
- **WORLDS** — array of 10 world descriptors `{id, n, live, name, place, area, lat, lng, color, icon, tag}` — single source of truth for the map, pins, cards, and game pages
- **Track** — analytics + play counter: `Track.ev(name, params)`, `Track.play(id)`, `Track.score(id, score, dur)`
- **Utilities** — `renderText`, `drawText`, `measureText`, `renderSprite`, `spriteURL`, `mulberry32` (PRNG), `hashStr`, `clamp`, `lerp`, `sgn`, `rand`, `fmt`, `rgbCss`

pixel.js has no Three.js dependency and loads on the website (no game engine) as well as in games.

### Layer 2: `src/blockkit.js` (games only, loads after three.js + pixel.js)

The shared game engine. Provides:

- **Store** — async localStorage wrapper with per-game key prefix `game-in-dubai:<id>:<key>`
- **AudioKit** — Web Audio API synthesiser: music loop (notes + bass + percussion), SFX (tone, crack, horn, burst, cheer, clank, splash, bloop, fanfare, sparkle, tweet)
- **Vox + vmesh** — voxel geometry builder: `v.box(x0,y0,z0,x1,y1,z1,color)`, `v.set(x,y,z,color)`, `vmesh(v, scale)` → THREE.Mesh
- **FX** — particle system: `FX.emit(x,y,z, {count, colors, speed, up, size, life, grav, drag})`
- **Shared screens** — title, HUD, pause overlay, game-over panel (all drawn on a 2D canvas overlay)
- **Scoring** — `addScore(pts)`, `scoreHit(pts, perfect)`, combo multiplier `1 + floor(combo/8)` capped at 5, ×2 with star power-up
- **Lives** — `loseLife()`, `G.grace` (invincibility frames after a hit)
- **Input** — unified pointer events (touch + mouse): `pointerDown/Move/Up` dispatched to the GAME object, `ptrs` Set tracks active pointer IDs, `releaseAll()` on visibility change
- **Loop** — `requestAnimationFrame` with watchdog + fallback timer (handles iOS rAF stall), `Loop.kick()`, `Loop.nudge()`, `Loop.back()`
- **Top** — global top score loader: fetches `/api/stats` on title, shows `TOP SCORE` + `YOUR BEST` on title and game-over screens
- **Kit.run(GAME)** — entry point; sets up canvas, camera, renderer, resize handler, input, lifecycle, then calls `GAME.build()` and enters the frame loop

### Layer 3: `src/<game>.*.js` (individual game worlds)

Each game exports a `GAMEDEF` object that the engine calls. See [`GAME_ENGINE.md`](GAME_ENGINE.md) for the full interface.

Games are built in multiple files only for size management. The build script concatenates them in order into `games/<id>/world.js`.

### Website layer: `src/site/site.js` + `src/site/site.css`

Loaded only on the website pages (not in games). Responsibilities:
- Draw the `GAME IN DUBAI` logo word-art with skyline (canvas)
- Render the procedural pixel map of Dubai from real WGS84 coordinates
- Place pins at true lat/lng, run a spring-based declutter loop
- Fill live game cards with stats from `/api/stats`
- Handle the install-as-app flow (Android prompt + iOS instructions)
- Register and update the service worker
- Draw the About page sky scene and skyline

---

## Game Frame Loop

```
requestAnimationFrame(loop)
  └─ step(now)
      ├─ dt = min(DTMAX, now - last)       DTMAX = 50ms (caps spiral)
      ├─ try { logic block }
      │    ├─ G.t += dt                    game clock
      │    ├─ update banners, popups, bubbles
      │    ├─ if state==='play': GAME.update(gdt, dt)
      │    │    where gdt = dt * G.timeScale (0 when paused)
      │    ├─ Tint.v lerps toward Tint.target (screen colour overlay)
      │    └─ GAME.animate(gdt, dt)
      ├─ try { Three.js renderer.render(scene, camera) }
      ├─ try { drawUI() }                  2D canvas HUD
      └─ try { AudioKit.pumpMusic() }

Watchdog: setInterval every 400ms → Loop.kick() if rAF hasn't fired for 600ms
Fallback ticker: setTimeout chain at 16ms, starts when rAF stalls, stops when rAF resumes
```

Error isolation: each block (logic, render, UI, audio) is in its own try/catch. A crash in game logic doesn't take down the UI; the pause button always works. After 30 consecutive logic errors the run ends on the game-over screen cleanly.

---

## State Machine

```
title ──► play ──► paused ──► play
  ▲          │
  │          ▼
  └──── over ◄── dying (1.3s death animation)
```

Transitions:
- `title → play`: tap PLAY button → `startGame(wave)`
- `play → paused`: tap pause button, or app goes to background
- `paused → play`: tap RESUME button, or return from background
- `play → dying`: `loseLife()` called when lives reach 0
- `dying → over`: after 1.3s → `finishGameOver()` → saves best score, sends `Track.score()`
- `over → play`: tap PLAY AGAIN → `startGame(wave)`
- `over → title`: tap HOME → `toTitle()` → `Top.load()` refreshes global top score

---

## Service Worker Strategy

```
Navigate (HTML pages)
  ├─ online: fetch from network (saves to cache), timeout 1.8s → fallback to cache
  └─ offline: immediately serve from cache

Versioned assets (?v=<hash>)
  ├─ cache hit: serve immediately (immutable, no network)
  └─ cache miss: fetch from network, save to cache

/api/* and other origins: never intercepted
```

The service worker version key is `gid-<hash>` where the hash covers all CORE URLs + all generated HTML. A new deploy → new sw.js → browser installs new SW → old SW deleted → new assets in new cache. On every page load, `registration.update()` is called immediately, so the next reload gets any new fix.

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS games (
  id       TEXT    PRIMARY KEY,
  plays    INTEGER NOT NULL DEFAULT 0,
  best     INTEGER NOT NULL DEFAULT 0,
  best_at  INTEGER                       -- Unix ms timestamp
);
```

**Write paths:**
- `POST /api/plays {id}` → `INSERT ... ON CONFLICT DO UPDATE SET plays = plays + 1`
- `POST /api/score {id, score, dur}` → upsert only when `excluded.best > games.best`

**Validation on score submission:**
- `score > 0 && score <= 50_000_000`
- `score <= 20_000 + dur_seconds * 3_000` (far above real game limits)
- Origin header must match request host (blocks cross-site forgery)
- `id` must be in the GAMES Set

**Read path:**
- `GET /api/stats` → returns `{id: {plays, best, best_at}}` for all rows
- Cached at the edge for 60 seconds

---

## Analytics Events

| Event | When | Key params |
|-------|------|-----------|
| `game_start` | Tap PLAY | `game_id`, `run_number` |
| `game_over` | Run ends | `game_id`, `score`, `wave`, `new_best`, `duration_sec` |
| `select_content` | Tap pin or card | `content_type` (game / coming_soon), `content_id`, `source` (pin / card) |
| `app_open` | Launch from home screen | — |
| `app_installed` | Installed via prompt | — |
| `app_install_click` | Tap INSTALL button | `platform` (ios / other) |
| `exception` | JS error in game logic | `description`, `fatal`, `game_id`, `state` |

Custom dimension needed in GA4: **game_id** (event-scoped). See [`docs/ANALYTICS.md`](ANALYTICS.md).
