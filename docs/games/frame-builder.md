# Frame Builder — Game Spec

**World:** 4 · **Location:** Dubai Frame, Zabeel Park (25.2355, 55.3004) · **Status:** Live
**Source:** `src/frame-builder.world.js` (scene), `src/frame-builder.rules.js` (gameplay + game object) · **Verb:** place

## Concept (from `docs/CONCEPTS.md`)
The Frame is 150 m tall and 93 m wide (golden ratio), clad in gold-toned steel for Dubai's old name, the City of Gold, with a glass-floored bridge across the top. You drag the crane hook, blocks drop on a steady beat, and you keep both towers level. Boss: lower the bridge across both towers in the wind. A perfect placement turns the glass floor clear.

## What the player sees
A side view from Zabeel Park: palms, grass, two concrete foundations, and a yellow tower crane with a cab (the crane operator is the commentator). The gold blocks carry the Frame's lattice motif. As the towers rise, the camera and crane climb with them and the skyline sinks (parallax): **old Dubai to the north (left)** with sand-coloured houses, wind towers, the Creek and dhows; **new Dubai to the south (right)** with Business Bay glass and the Burj Khalifa.

## Controls
Drag anywhere to move the crane trolley. The block hangs on a cable, so it **swings** (pendulum, same physics as Shine Crew). Nothing to tap: blocks drop on the beat.

## Core loop
1. A gold block appears on the hook. A **bouncing arrow** marks the target: the shorter tower (ties alternate).
2. A **fuse** along the block's front edge fills (red in the last 0.5 s, with a click), then the block drops. It inherits some of the swing.
3. Landing:
   - **Perfect** (within 0.45 units on the first floor, down to 0.25): the block snaps into place and the tower regrows 0.3 of width.
   - **Off-centre**: the overhang is sliced off and falls, and the tower narrows, but never below a third of its full width.
   - **Wrong tower** (the taller one): UNEVEN! and the combo breaks.
   - **Both towers level** after a drop: LEVEL! +20 × mult.
4. **Miss** (no tower under it): the block thuds into the park, costing a life.
5. Each wave is 6 levels (37.5 m). Four waves take the frame to 24 levels = **150 m**.

## Boss: SKY BRIDGE (every 5th wave)
If the towers are uneven, blocks keep coming for the shorter tower first ("LEVEL THE TOWERS FIRST!"). Then the hook carries the bridge: a long gold beam with a glass floor, a slower beat and stronger gusts. It seats if it rests on both tower tops.
- **Seated:** FRAME COMPLETE! +1000 × (cycle + 1).
- **Perfect** (centred): **GLASS FLOOR!** +500 more, and the floor turns clear.
- **Slipped:** it tips off, costing a life, and a new bridge comes down.

After a completed frame the site clears and a new frame starts: faster beat, more wind, less damping.

## Power-ups (a glowing block on the hook; place it on a tower to trigger it)
| Power | Icon | Effect |
|---|---|---|
| Laser guide | `laser` | a red laser shows exactly where the block will land, 8 s |
| Slow crane | `slowc` | beat ×1.6 slower + calmer swing, 8 s |
| Gold block | `goldb` | **auto-level**: the shorter tower rises to match and both get full width back |
| Double points | `star` | engine ×2 for 10 s |
| Safety net | `net` | +1 life (or +200 × mult at max lives) |
Pity: guaranteed within ~9 drops from wave 2. Gold is weighted up when towers are uneven or thin, and the net when lives are low.

## Wind
From wave 2: telegraphed gusts ("WIND!" + streaks, 0.9 s), then a 1.4 s push. Stronger each cycle, and 30% stronger during the bridge.

## Hooks for adults
Precision drops (perfect streaks keep the tower wide), swing control, the glass-floor perfect bridge, and the lifetime **FRAMES BUILT** counter on the title (`game-in-dubai:frame-builder:frames`).

## Debug
`?debug=1` → `__game.beginWave, activatePower(p,x,y), Towers, Hook, World, Life, rehang, release`. Boss: `?wave=5`. Bot: `&bot=1`.
