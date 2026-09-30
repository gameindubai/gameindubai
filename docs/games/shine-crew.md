# Shine Crew — Game Spec

**World:** 3 · **Location:** Burj Khalifa, Downtown Dubai (25.1972, 55.2744)
**Status:** Live
**Source files:** `src/shine-crew.world.js` (scene), `src/shine-crew.rules.js` (gameplay + game object)
**Verb:** clean (auto-fire; the player only positions)

---

## Concept (from `docs/CONCEPTS.md`)
The real spot: a crew of 36 takes three to four months to clean all 24,348 windows; the cleaning machines park inside the building and travel out on custom tracks. You ride the cleaning gondola. You drag it along its roof track while a pressure washer sprays the nearest sand crust by itself. Thick crusts have a core block you must hit. The wind swings the gondola like a pendulum. Boss: a sandstorm wall that coats a whole section at once.

**Why it's kid-safe and owner-safe:** you only ever clean. No animals. The tower ends every run shinier.

---

## What the player sees
- A straight-on view of the Burj's glass curtain wall: blue pixel-glass panes, light aluminium bands, stainless fins.
- The facade scrolls **up** because the gondola is descending. Crusts ride up with their window pane.
- Beside the tower: sky above the horizon, Dubai's coast, city and desert far below (a procedural canvas backdrop), and clouds drifting up past (parallax).
- The gondola: yellow cradle, two crew in hi-vis vests and hard hats, a water tank, a lance. The crew chief (right) waves when he speaks.

## Controls
Drag anywhere: the roof trolley moves toward your finger's X (max 15 units/s). The gondola hangs 12–13 units below on cables, so it **swings** (pendulum physics). Release: it stays where it is. There's no tapping and no second finger.

## Core loop
1. Crust rows spawn below the screen, snapped to window-pane centres.
2. The lance auto-targets the **nearest crust within range** (3.6 units; 5.0 with Wide Nozzle), 3.3 HP/s.
3. A crust that rises past the gondola (the escape line, 1.3 units above it) **costs a life**. It counts once per crust group, and thick clusters count once.
4. When all rows of a floor are resolved, you get **FLOOR N SHINY** plus a bonus of 100 × wave, and descend 8 floors.

## Crusts
| Kind | HP | Points | Appears |
|---|---|---|---|
| dust (sand) | 1 | 10 | always |
| packed | 2 | 15 | floor-wave 3+ (18%→50%) |
| mud | 3 | 20 | tier 2+ (wave 11+), 25% |
| thick cluster | 3×2 blocks: 5 armour + 1 glowing core | core 50 (+perfect bonus); each block 10 | wave 2+ |
| storm (boss wall) | 1.35 | 10 | boss only |

**Thick clusters** are the skill: the core sits top-centre, so it's the nearest block only when you're lined up with the middle column. Spraying armour shows **TOO THICK!**, a clank, and (first time per run) the chief says **"AIM FOR THE GLOWING CORE!"**. Breaking the core shatters the whole cluster in a cascade.

## Patterns
`single`, `pair`, `column` (3 stacked), `diag`, `zig` (far-left then far-right), `line` (3 across, every other column), `thick`. The pool grows with the wave: see `shineSpec(w)`.

## Wind
From wave 2. A gust is **telegraphed** for 0.9 s ("WIND!" popup + streaks), then pushes for 1.4 s with a sine profile. Strength grows by tier; boss gusts come 40% more often. Pendulum damping falls from 2.4 to 1.1 as tiers rise, so early waves barely swing.

## Boss: SANDSTORM (every 5th wave)
- The storm "coats" a wall of the facade: 6 columns × (4 + tier, max 6) rows, appearing left→right, starting 6.2 units below the gondola.
- 3 + tier (max 6) glowing **cores** are embedded; breaking one clears its 3×3 neighbourhood.
- HP bar = blocks remaining. The wall rises slowly (0.5 + 0.08 × tier units/s, screen-scaled).
- If the wall's top reaches the gondola: **life lost**, the wall is shoved back down 2 rows ("HOLD TIGHT!").
- Cleared: **SPOTLESS!**, +1000 × (tier + 1), fanfare, sparkles.
- Sand blows across the screen and the scene dims slightly (`Tint`) with an orange haze plane.

## Power-ups (rise up the facade; touch one with the gondola)
| Power | Icon sprite | Effect |
|---|---|---|
| Wide Nozzle | `nozzle` | range 5.0 + splash to neighbouring panes, 8 s |
| Rain Shower | `cloud` | every crust on screen takes 2.6 HP/s for 1.3 s (armour protected by its core) |
| Crew Cradle | `crew` | a second gondola drops in on the other side, auto-positions and sprays at 75% for 10 s |
| Double Points | `star` | engine ×2 for 10 s |
| Hard Hat | `hat` | +1 life (or +200 × mult at max lives) |
Pity timer: a power-up is guaranteed within 10 rows (wave 2+). Hard Hat is weighted up when lives are low.

## Hooks for adults
- **Lifetime counter:** windows cleaned across all runs, saved on the device (`game-in-dubai:shine-crew:windows`). The title shows `WINDOWS n / 24,348`; at 24,348 it reads `ALL 24,348 WINDOWS!`.
- Pendulum control at higher tiers, core alignment, and routing between zig patterns.

## Pacing decisions (tested)
- Descent speed is scaled by screen height (`World.vsScale = half/12`), so a crust takes about **8 s** from the bottom to the gondola on every device.
- The **first two crusts of a run** are pre-placed partway up the screen, so the action starts within seconds. (The first build had 13 s of nothing.)
- Waves run about 20–30 s. The early-wave `G.assist` boosts range and spray power for the first floors.

## Layout rules
- Camera straight at the facade. Width is fitted so the facade (13.2 units) plus a 2-unit margin shows on portrait; height is at least 23 units on landscape.
- The gondola sits under the HUD: `cy = min(half*0.36, half - hudUnits - 3.8)`. That leaves room for the crew's heads.
- The speech bubble anchors at the gondola's lower-left, because the engine draws bubbles up-left of the anchor.

## Debug
`?debug=1` exposes `window.__game` with `beginWave, activatePower(p,x,y), spawnPattern(name, y?), spawnPower(p), Blocks, Groups, Crad, World, Life`.
Boss shortcut: `/games/shine-crew/?wave=5`. Bot: `&bot=1`.

## Loading-screen lines
Harness click, water tank glug, windy up high, counting 24,348 windows, parking the machine on the roof. These live in `GAME_LINES` in `build_site.py`.
