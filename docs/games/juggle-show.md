# Juggle Show — Game Spec

**World:** 1 · **Location:** Dubai Dolphinarium, Creek Park (25.2365, 55.3240)  
**Status:** Live  
**Source files:** `src/juggle-show.world.js`, `src/juggle-show.rules.js`

---

## Concept

The player controls a trained seal at the Dubai Dolphinarium. Two wetsuit trainers toss balls of increasing speed and complexity. The seal must catch/juggle each ball without dropping it. The more balls in the air at once, the higher the combo multiplier.

**Why this location:** The Dubai Dolphinarium has real juggling seal and parrot shows. The mechanic is direct: the animal performs, the player is the brain of the animal.

**Why this mechanic:** One-finger drag — the simplest possible input. Works on a baby's phone. No timing pressure on the player, only positioning.

---

## Core Mechanic

- **Drag** to move the seal left and right along the pool platform
- Balls follow a parabolic arc from one of two trainers
- The seal must be positioned under the ball when it reaches juggle height (y ≈ 0)
- Catching = seal's X is within ±radius of ball's X
- Missing = ball falls into the pool, lose a life, crowd groans

---

## Characters

| Character | Description | Role |
|-----------|-------------|------|
| Seal | Brown voxel seal, sits on platform, turns head toward ball | Player character |
| Trainer L | Wetsuit (dark blue + gold), bearded | Throws from left |
| Trainer R | Wetsuit, shorter | Throws from right |
| African Grey Parrot | On a swing above the right tray | Commentator |

The parrot says: "NICE!", "PERFECT!", "OOPS!", "KEEP GOING!", "THE CROWD LOVES IT!", "AWK! MORE!", "JUGGLE MASTER!" etc.

---

## Ball Types

| Name | Colour | Points | Radius | Speed factor |
|------|--------|--------|--------|-------------|
| Beach | Yellow `#FFD23F` | 10 | 0.75 | 1.0 |
| Rubber | Red-orange `#FF7A5C` | 15 | 0.5 | 1.0 |
| Basket | Orange `#FF9A3C` | 20 | 0.62 | 1.0 |

Balls have `bv` (bounce velocity) property. Higher bv = faster arc = harder to track.

---

## Wave Structure

`spec = makeSpec(wave)` determines each wave's parameters:

| Wave | Balls per volley | Speed | Features |
|------|-----------------|-------|---------|
| 1 | 1–2 | Slow | Beach balls only |
| 2 | 2–3 | Normal | + Rubber balls |
| 3 | 2–4 | Normal | + Basketballs |
| 4 | 3–5 | Fast | Mixed |
| 5 | Boss | — | Macaw Hoops |
| 6+ | Harder | Faster | All balls, boss every 5 waves |

A "volley" is a set of balls tossed in rapid succession. `spec.volleys` volleys make a wave. After all volleys are cleared (all balls caught or fell), a wave-clear bonus is awarded: `50 × wave × balls_kept`.

---

## Boss: Macaw Hoops (every 5th wave)

- A giant colourful macaw appears holding a floating basketball hoop
- The hoop oscillates side to side
- Balls are only basketballs (pts 20 each)
- Must bounce balls through the hoop (ball must pass through the hoop's X within ±hoop_radius)
- Hoop moves faster each boss tier
- Boss has an HP bar (4 per tier, increases with tier)
- Defeating: `+1000 × (tier + 1)` bonus, "MACAW DEFEATED!" banner
- Failing (ball falls): 1 life lost, `bossDunk()`

---

## Power-Ups

| Icon | Name | Effect | Duration |
|------|------|--------|---------|
| `whistle` | Whistle | Slows all balls to 0.6× speed | 6 seconds |
| `dolphin` | Dolphin | Next dropped ball is saved by a dolphin (no life lost) | 1 save |
| `star` | Star | ×2 score multiplier | 8 seconds |
| `fish` | Fish | +1 life | Instant |

Power-ups appear on the platform as glowing items. The seal picks them up by passing over them.

Pity system: if no power-up in 9 volleys and wave > 1, force a power-up next volley (preferred: fish if lives ≤ 2, else random).

---

## Scoring

- **Base:** ball type × combo multiplier
- **Combo:** each successive ball caught without a miss
- **Multiplier:** `1 + floor(combo / 8)`, capped at 5×, doubled by star
- **Wave clear bonus:** `50 × wave × balls_juggled_in_row`
- **Boss HP hit:** `scoreHit(200 × (tier + 1), perfect)` where perfect = hit within inner 30% of hoop

---

## Scene Structure

```
actorRoot
├── floorMesh (pool platform, voxel grid)
├── waterMesh (animated UV pool)
├── crowd (amphitheatre, pre-built grid of voxel heads)
│   ├── left section
│   └── right section
├── hoopStructure (side poles, scoreboard, banners)
├── trainers[]
│   ├── trainerL (mesh group: body, arms)
│   └── trainerR (mesh group: body, arms)
├── sealMesh (mesh group: body, head, flippers)
├── parrotMesh (mesh group: body, wings)
├── parrotSwing (rope + perch)
└── [dynamic] ball meshes added/removed during play
```

The scene is built once in `build()`. Dynamic objects (balls) are added with `actorRoot.add(mesh)` and removed when dead.

---

## Known Issues / Edge Cases

- **Ball spawn rate:** if `spec.volleys` is high and `volleyT` (delay between volleys) is low, multiple volleys can be in the air simultaneously. This is intentional at high waves. Capped by `BALL_CAP = 12` (never more than 12 balls on screen at once).
- **Trainer toss arm:** the arm animation (`k.toss`) is a simple sine curve. It looks odd when two balls are tossed in quick succession — the arm doesn't have time to return. Acceptable at this art style.
- **Parrot commentator position:** fixed at right tray position. `commentator()` returns `{x: parrotPos.x, y: parrotPos.y + 1.5, z: parrotPos.z}`.

---

## Files

- `src/juggle-show.world.js`: scene geometry (pool, crowd, trainers, seal, parrot, hoop structure), `build()`, `layout()`, `animate()`, `drawOverlay()`
- `src/juggle-show.rules.js`: wave spec, ball spawning, collision detection, boss logic, power-up handling, `update()`, `pointerDown/Move/Up()`
