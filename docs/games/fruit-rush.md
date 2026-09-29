# Fruit Rush — Game Spec

**World:** 2 · **Location:** Dubai Butterfly Garden, Al Barsha South (25.0600, 55.2445)  
**Status:** Live  
**Source files:** `src/fruit-rush.1.js`, `src/fruit-rush.2.js`, `src/fruit-rush.3.js`

---

## Concept

Players swipe to slice fruit tossed by butterfly garden keepers. Each sliced fruit sends a piece to the hanging trays, which attracts butterflies. The butterfly album fills as new species arrive. Uncut fruit falls into the koi pond — lose a bloom (life). The game is set inside the Dubai Butterfly Garden dome.

**Why this location:** The Butterfly Garden is one of Dubai's most family-friendly attractions. The combination of tropical fruit, butterflies, and a koi pond creates natural game elements. Nothing is harmed — fruit goes to the butterflies.

**Why this mechanic:** Swipe/slice gesture — the most satisfying single-finger input. Infinitely learnable, universally understood by kids. The blade trail provides immediate visual feedback.

---

## Core Mechanic

- **Swipe** anywhere on screen to draw a blade trail
- Fruit arcs through the air at different speeds and heights
- A fruit is sliced if the blade path intersects it
- Sliced fruit splits into halves (flying apart at the cut angle) and sends a token piece flying to the tray
- Missed fruit lands in the koi pond: lose a bloom, koi rush to the spot, combo breaks
- **Two-hit fruits:** watermelon and pineapple need 2 hits. First hit shows a crack; second hit slices.

---

## File Structure

Split into three files (concatenated by build script into world.js):

| File | Contents |
|------|---------|
| `fruit-rush.1.js` | World geometry (dome, glass panels, waterfall, flower beds, trays, koi pond, keepers, budgie), FGEO (fruit geometries), BOSSDEF, POW, SPECIES definitions |
| `fruit-rush.2.js` | Butterfly system (makeButterfly, updateButterflies, arriveButterfly, speciesGeo), koi system (buildKoi, updateKoi), species/album helpers |
| `fruit-rush.3.js` | Game logic (blade, fruit spawning, slicing, halves, tokens, tray feeding, wave spec, boss, power-ups, bot, GAMEDEF) |

---

## Fruit Types

| Name | Points (base) | Hits | Colour | Hazard? |
|------|--------------|------|--------|---------|
| Mango | 60 | 1 | Orange-yellow | No |
| Orange | 50 | 1 | Orange | No |
| Banana | 40 | 1 | Yellow | No |
| Watermelon | 80 | 2 | Green/red | No |
| Pineapple | 100 | 2 | Yellow/brown | No |
| Coconut | — | — | Brown (red outline) | ✅ Lose life |
| Syrup bottle | — | — | Brown glass | ✅ Sticky blade (3s) |

Hazards have a red pulsing outline to warn the player. The syrup bottle sticks the blade mid-cut (G.sticky timer), slowing the next 3 seconds of slicing.

---

## Keepers

Two garden keepers toss fruit from the sides. One is a woman in a hijab (respectful representation of Dubai's demographics). They have a heave animation when tossing, cheer animation when a boss is beaten.

Keeper positions: left (X ≈ -10) and right (X ≈ +10). They alternate sides per volley.

---

## Wave Structure ("Domes")

Domes 1–∞, boss every 5 domes:

```js
function makeSpec(wave) {
  const tier = Math.floor((wave - 1) / 5);
  return {
    boss: wave % 5 === 0,   // every 5th dome is a boss
    tier,
    dome: wave,
    speed: 1 + tier * 0.18 + (wave % 5) * 0.04,
    volleys: 4 + Math.min(wave - 1, 6),
    minN: 2 + Math.min(tier, 2),
    maxN: 4 + Math.min(tier, 4),
    pool: [...],   // fruit types unlocked at this tier
    coco: 0.05 + tier * 0.04,    // coconut probability per slot
    syrup: 0.03 + tier * 0.03,   // syrup probability per slot
    gap: 0.3 - tier * 0.02,      // seconds between fruits in a volley
    intro: 0.5
  };
}
```

Wave clear: `100 × wave` bonus, "DOME N CLEAR!" banner.

---

## Bosses

| Dome | Name | HP | HP per tier | Special |
|------|------|----|-------------|---------|
| 5, 10, 15... | Giant Watermelon | 4 | +2/tier | Horizontal oscillation |
| 10, 20... | Giant Pineapple | 6 | +2/tier | Faster oscillation, rotating weak point |
| 15, 25... | Giant Mango | 8 | +2/tier | Very fast, lobs fruit more often |

**Boss mechanic:**
- A giant fruit (R ≈ 3 units) flies in and oscillates side to side
- Has a gold weak point (wp) that moves to a new random position every 0.4s after being hit
- Hit the weak point: `bossHit()` → `-1 HP`, `wpCool = 0.4s` (brief immunity), `+150 × (tier+1)` pts
- Hit the body (not wp): "TOO THICK!" popup, `thickCd = 0.7s` (no re-trigger)
- Boss sinks toward the pond over time (`sink` speed). When it reaches the pond: `bossDunk()` → lose 1 life, boss lobs back up
- Defeat: `bossBurst()` → 90 particles, 8 token pieces, 4 butterflies arrive, `+1000 × (tier+1)` bonus

**Critical bug (fixed):** The boss's extra-toss timer fires a random fruit every 2–3 seconds. The type roll and the power-up-property assignment were originally two independent random calls, so ~13% of tosses produced a power-up object without a power type, crashing `tossFruit()` every frame. Fixed by using one variable for the roll:
```js
const pw = Math.random() < 0.15;
queueToss(pw ? 'power' : pick([...]), side, 0, {}, pw ? { power: pickPower() } : null);
```

---

## Butterfly System

13 butterfly species with 4 rarity tiers:

| Tier | Species |
|------|---------|
| 0 (common) | Monarch, African Queen, Great Eggfly, Paper Kite |
| 1 (uncommon) | Tailed Jay, Doris, Red Rim, Yellow Sulphur |
| 2 (rare) | Blue Morpho, Orange Oakleaf, Golden Birdwing |
| 3 (legendary) | Owl Butterfly, Atlas Moth |

**How butterflies arrive:**
1. Player slices fruit → sliced pieces fly to trays (as `tokens`)
2. Token lands on tray → `trayFed(tray)` → 55% chance → `arriveButterfly(tray, rollSpecies())`
3. `rollSpecies()` uses combo-weighted random selection (higher combo = rarer species)
4. `arriveButterfly(tray, sp)` → butterfly flies in, lands on a slot. If all slots full, displaces the oldest.
5. If species not yet seen this run → `discover(sp, tray)` → "NEW BUTTERFLY!" toast + album update

Tray system:
- Two trays (left and right), each with 5 perch slots
- Butterflies wander, enter escort mode (follow fruit) during swarm power-up, leave when displaced
- Budgie commentator on the right tray

Album storage: `Store.set(game.key('album'), [...Album].join(','))` — comma-separated species IDs in localStorage.

---

## Power-Ups

| Icon | Name | Effect | Duration |
|------|------|--------|---------|
| `bfly` | Butterfly Swarm | All butterflies enter escort mode (slow fruit fall by buffeting) + slow modifier 0.6× | 6s |
| `basket` | Fruit Basket | Frenzy mode: auto-toss bonus fruit rapidly for extra points | 4s |
| `star` | Star | ×2 score multiplier | 8s |
| `bloom` | Bloom | +1 life (bloom) | Instant |

---

## Blade System

```js
Blade = {
  on: false,      // pointer is down
  id: null,       // pointer ID (single touch)
  x, y,           // current position
  tx, ty,         // target position (interpolated if G.sticky > 0)
  pts: [],        // trail points {x, y, t, gap?}
  stroke: {n, t, x, y}, // stroke metadata for combo detection
  stun: 0         // seconds of blade stun (after hitting a hazard)
};
```

Each frame with `Blade.on`, `bladeStep(x, y)` is called which:
1. Adds point to `Blade.pts` trail
2. Tests against all live fruits: `segDist(blade, fruit) < fruit.r * ppu`
3. If boss phase: tests `bossCut(x0, y0, x1, y1, ppu)`
4. Calls `sliceFruit()` or `bossHit()` on hit

Trail rendering: `Blade.pts` are filtered to last 0.16s, drawn as a fading gradient stroke. Bot trail is rendered separately for the attract mode.

---

## Scoring

- Per fruit: `scoreHit(FRUIT[type].pts, perfect)` where perfect = blade crosses the fruit centre within ±0.15 of its radius
- Perfect adds +20% to the pts (rounding)
- Boss hit: `scoreHit(150 × (tier + 1), false)` 
- Wave clear: `addScore(100 × wave)`
- Boss defeat: `addScore(1000 × (tier + 1))`

---

## Bot (Attract Mode)

When `BOT=true` (from URL param or `state === 'title'`), `botTick(dt)` runs each frame:
- Targets the nearest sliceable fruit (or the boss weak point)
- Simulates a swipe gesture by updating `G.botTrail`
- Bot trail is drawn on the overlay canvas alongside the player trail

---

## Koi Pond

5 koi fish (3 colour varieties) swim in the pond at the base of the scene:
- Normal mode: wander to random targets in the pond
- Rush mode (`koiRush(x)` called when a fruit hits): 2 nearest koi rush to X, hover for 1.6s

Koi are entirely ambient — they have no effect on gameplay. Their mesh is always present at Y ≈ -0.35.
