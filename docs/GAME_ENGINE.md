# Game Engine API

Everything a new game world needs to know to run inside blockkit.js.

---

## Entry Point

Every game page loads:
1. `three.min.js` (deferred)
2. `pixel.js` (deferred)
3. `blockkit.js` (deferred)
4. `world.js` (deferred) — your game file(s), concatenated

The last thing `world.js` must do is assign to the global `GAMEDEF`:
```js
GAMEDEF = { meta: {...}, ... };
```

blockkit.js picks this up after all scripts load.

---

## GAMEDEF Object

### `meta` (required)

```js
meta: {
  id: 'my-game',           // matches WORLDS[n].id, used for storage key + analytics
  world: 3,                // world number (1–10)
  logo: ['MY', 'GAME'],    // array of strings, each rendered as a line of the title
  place: 'SOME PLACE DXB', // shown below the logo on the title screen (uppercase)
  overTitle: "IT'S OVER!", // shown at top of game-over panel
  lifeIcon: 'bloom',       // sprite name for the life indicator icons
  hint: 'DRAG TO MOVE',    // shown at bottom of title screen, first launch
  hintMotion: 'drag',      // 'drag' | 'swipe' | 'tap' — controls hint animation
  voice: 'tweet',          // AudioKit SFX to play when the commentator speaks
  startSfx: 'sparkle',     // AudioKit SFX to play when the wave starts
  clear: 0xBFE9F3,         // THREE.Color hex for renderer.setClearColor (sky colour)
  accent: 'lime',          // palette name for accent colour (used in some HUD elements)
  accentHex: PAL.lime,     // hex string (same colour, used for Three.js materials)
  scrim: 0.6,              // 0–1 opacity of the dark scrim on the title screen over the 3D scene
}
```

### `lines` (required)

```js
lines: {
  start: 'FEEDING TIME!',           // banner text when a wave begins
  over: "GARDEN'S CLOSED!",         // banner text on game over
  last: 'LAST BLOOM!',              // banner text when lives reach 1
  hurt: ['THE KOI GOT IT!', '...'], // pick() one of these when a life is lost
}
```

### `music` (required)

```js
music: {
  tempo: 126,                        // BPM
  lead: 'triangle',                  // OscillatorType: 'triangle' | 'square' | 'sawtooth' | 'sine'
  leadVol: 0.07,                     // 0–1 volume for the lead melody
  scale: [293.66, 329.63, ...],      // array of frequencies (Hz) for the scale
  mel: [0, 2, 4, -1, ...],          // melody: index into scale, -1 = rest
  bass: [73.42, 73.42, 98.0, ...],  // bass notes (Hz), loops over the bar
  dum: [0, 3, 6],                    // beat positions for the dum (low drum)
  tek: [2, 5, 7],                    // beat positions for the tek (high drum)
  ka: [1, 4],                        // beat positions for the ka (rim)
}
```

A "beat" is 1/8 of a bar. The bar length is `(60 / tempo) * 8` seconds.

### Methods (all required unless noted)

```js
build()
```
Called once at startup. Build all Three.js geometry here — meshes, lights, the scene. This is where you call `buildWorld()` (your own function) and add everything to `actorRoot` (the Three.js Group that the engine provides).

Available globals inside game files:
- `scene`, `camera`, `renderer` — Three.js objects
- `actorRoot` — THREE.Group; add all your scene objects here
- `VOXMAT` — shared MeshLambertMaterial with vertex colours; use for all voxel meshes
- `W`, `H` — canvas width/height in CSS pixels (updated on resize)
- `S` — UI scale factor (W / 480)
- `SAFE` — `{t, b, l, r}` safe area insets in px
- `G` — global game state (see below)
- `PAL` — colour palette
- `SPR` — sprites
- `FONT` — pixel font
- `FX` — particle system
- `AudioKit` — audio engine
- `Track` — analytics + play counter
- `Top` — global top score

---

```js
layout()
```
Called on every canvas resize (desktop window resize, orientation change). Reposition 3D objects that depend on screen dimensions.

---

```js
reset()
```
Called before every run (PLAY and PLAY AGAIN). Clear all game state: remove dynamic meshes from `actorRoot`, reset arrays, reset timers. Do NOT rebuild static geometry here — only in `build()`.

```js
// Pattern:
function clearAll() {
  for (const f of G.fruits) actorRoot.remove(f.mesh);
  G.fruits = []; G.halves = []; G.tokens = []; G.pending = [];
  if (G.boss) { actorRoot.remove(G.boss.mesh); G.boss = null; }
}
// In reset():
reset() { clearAll(); G.powerPity = 0; /* ... other init */ }
```

---

```js
start(wave)
```
Called at the start of each wave (including wave 1 at run start). Set up the wave's parameters and start spawning.

---

```js
update(gdt, dt)
```
Called every frame while the game is running. `gdt` is the game delta time (0 when paused), `dt` is the real delta time (always > 0). Use `gdt` for game logic, `dt` for UI timers that should run even when paused.

Throw from here and the engine's error counter increments. After 30 consecutive throws it ends the run gracefully and reports to GA4.

---

```js
animate(gdt, dt)
```
Called every frame for visual-only updates (material animation, UV scrolling, particle updates, character animation). Keep game logic out of here. Runs after `renderer.render()`.

---

```js
pointerDown(x, y, id)
pointerMove(x, y, id)
pointerUp(x, y, id)
```
Screen-space coordinates in CSS pixels. `id` is the pointer ID (for multi-touch, though games should only use one finger). The engine handles button hit-testing before calling these — they're only called when a button was NOT hit.

---

```js
toTitle()
```
Called when transitioning to the title screen. Optionally start an attract-mode animation (fruit tossing in the background, etc.).

---

```js
onOver()
```
Called at game over. Clean up (stop spawning, remove active projectiles, etc.).

---

```js
onPause()    // optional
onLifeLost() // optional
onSay()      // called when the commentator speaks — animate the commentator character
```

---

```js
commentator() → { x, y, z }
```
Returns the world-space position of the commentator character's mouth. Speech bubbles appear here.

---

```js
waveLabel() → string
```
Returns the wave label shown in the HUD (e.g. `'DOME 5'`, `'WAVE 3'`).

---

```js
waveProgress() → number (0–1)
```
Returns the fill fraction of the wave progress bar. Return `1` during boss fights or transitions.

---

```js
bossHUD() → null | { name, hp, max, icon }
```
Return `null` when no boss. During boss fight: `name` (string), `hp` (current), `max` (starting), `icon` (sprite name).

---

```js
powersHUD() → Array<[iconName, fraction]>
```
Returns active power-ups for the HUD bar. E.g. `[['swarm', 0.5], ['basket', 0.8]]`.

---

```js
overStats() → string
```
Two stats shown on the game-over screen below the score. E.g. `'DOME 5   TOP COMBO 12'`.

---

```js
overExtra() → string   // optional
titleExtra() → string  // optional
```
Additional lines on game-over / title screen. E.g. `'BUTTERFLIES SEEN 7'`, `'BUTTERFLY ALBUM 4/13'`.

---

```js
drawOverlay()
```
Called after drawUI(). Use `uctx` (the 2D canvas context) to draw game-specific overlays (blade trail, attract-mode animations, etc.).

---

## Global Game State (G)

```js
G = {
  state: 'title',   // 'title' | 'play' | 'paused' | 'dying' | 'over'
  wave: 1,          // current wave number
  score: 0,         // current run score
  best: 0,          // this-device best (from localStorage)
  lives: 3,         // current lives
  combo: 0,         // current combo count
  maxCombo: 0,      // highest combo this run
  t: 0,             // game clock (seconds, pauses when paused)
  startT: 0,        // G.t value when the run started
  runs: 0,          // number of runs this session
  timeScale: 1,     // multiply by gdt (for slow-motion effects)
  grace: 0,         // invincibility seconds remaining after a hit
  shake: 0,         // camera shake intensity
  flash: 0,         // screen flash intensity (0–1)
  x2: 0,            // seconds of ×2 score multiplier remaining
  newBest: false,   // did this run beat the device best?
  newTop: false,    // did this run beat the global best?
  // ... game-specific fields added by each world
}
```

---

## Scoring

```js
addScore(pts)         // add pts * current multiplier
scoreHit(pts, perfect) // add pts * mult, bump combo, show popup
breakCombo()          // reset combo to 0
```

Multiplier formula: `mult = (1 + Math.floor(G.combo / 8))`, capped at `5`. With a star power-up active (`G.x2 > 0`), the multiplier is doubled (`mult * 2`). 

---

## Utilities

```js
// UI
banner(title, sub, dur, style)    // big centred banner (boss name, wave start, etc.)
popup(text, wx, wy, wz, style, dur) // floating text at world position
say(text, force)                   // commentator speech bubble
pill(x, y, w, h, fillColor)       // rounded rectangle on the UI canvas
panel(x, y, w, h)                 // navy panel with gold corners

// Drawing (2D canvas, coordinates in CSS px)
drawText(ctx, text, x, y, pixelSize, style, align)
renderText(text, pixelSize, style) → HTMLCanvasElement
measureText(text, pixelSize) → number (width in raw pixels)
drawSprite(ctx, sprName, x, y, pixelSize)
renderSprite(sprName, pixelSize) → HTMLCanvasElement

// Math
clamp(v, lo, hi), lerp(a, b, t), sgn(v), rand(lo, hi)
easeOutBack(t), easeInOut(t)
toScreen(wx, wy, wz) → {x, y}      // world pos → screen px (for popups/HUD)
mulberry32(seed) → ()=>number        // seeded PRNG

// Audio
AudioKit.tone(freq, dur, opts)
AudioKit.crack(), .horn(), .burst(), .cheer(loop), .clank(), .splash(), .bloop()
AudioKit.fanfare(), .sparkle(), .tweet(), .startSfx(name)
```

---

## The `?wave=N&debug=1` URL Parameters

| Param | Effect |
|-------|--------|
| `?wave=5` | PLAY button starts at wave 5 instead of wave 1 |
| `?debug=1` | Exposes `window.__game` = `{G, GAME, Top, Loop, startGame, loseLife, pause, Tint}` |
| `?bot=1` | Enables the built-in bot (auto-plays; useful for screenshot captures) |
| `?reduced=1` | Forces reduced-motion mode (disables shake, etc.) |

Use `?wave=5&debug=1` when testing a boss fight:
```
http://localhost:8765/games/fruit-rush/?wave=5&debug=1
```

---

## Adding a New Game (Checklist)

1. Add the world to `WORLDS` array in `pixel.js` with `live: true` when ready
2. Add its icon sprite to `SPR` in `pixel.js`
3. Create `src/<id>.world.js` (scene geometry) and `src/<id>.rules.js` (game logic)
4. Add the file list to `GAMES` dict in `build_site.py`
5. Take a gameplay screenshot, save to `src/static/assets/cards/<id>.webp` at quality 82
6. `python3 build_site.py` → test at `localhost:8765`
7. Deploy

See [`docs/NEXT_GAMES.md`](NEXT_GAMES.md) for the full per-game brief.
