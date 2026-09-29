# Next Games Guide

How to build worlds 3–10 without reinventing the wheel, and how to prompt an LLM assistant efficiently to save tokens.

---

## Shared Infrastructure (Already Done)

Every new game gets for free:
- Pixel font, palette, sprite system (`pixel.js`)
- Title screen, HUD, pause, game-over screens (`blockkit.js`)
- Scoring with combos and multipliers
- Lives system with per-game icons
- TOP SCORE (global) + YOUR BEST (device) on title and game-over
- Speech bubbles and commentator system
- Particle effects (`FX.emit`)
- Web Audio synth (new music needs new `music:{}` config only)
- Service worker, PWA install, offline play
- Play counter + global best score (D1)
- GA4 analytics (game_start, game_over, exception)
- The Dubai map pin (just set `live: true` in WORLDS)

A new game only needs to provide: the 3D scene, the game logic, and the music config.

---

## LLM Prompting Strategy (Save Tokens)

The engine is large. An LLM assistant doesn't need to re-read all of blockkit.js every session. Instead:

1. **Start each new game session with this context brief:**
   > "We are building game N for gameindubai.com. The engine is blockkit.js (shared). I need you to write only: src/<id>.world.js (scene) and src/<id>.rules.js (logic). The GAMEDEF interface is in docs/GAME_ENGINE.md. The existing games (juggle-show and fruit-rush) are in src/ as reference. The build step is `python3 build_site.py`. Don't re-explain the engine to me."

2. **Reference the existing games, don't redescribe the engine.** Say "follow the same pattern as juggle-show.rules.js for the wave system" instead of asking the LLM to invent a wave system from scratch.

3. **Describe each game in terms of its differences from existing games, not from scratch.** "Like fruit-rush but instead of slicing, you tap rhythm targets" is much more efficient than a full description.

4. **Build incrementally:**
   - Session 1: Scene geometry only (the 3D world, no gameplay)
   - Session 2: Core game mechanic (the one verb)
   - Session 3: Wave system + boss
   - Session 4: Power-ups + commentator + polish
   
   Each session is independent and small, with a working playable result at each step.

5. **Test with `?wave=5&debug=1`** to jump straight to the boss without replaying earlier waves each time.

---

## World Briefs (Games 3–10)

### 3 — Shine Crew (Burj Khalifa)
**Location:** Downtown Dubai (25.1972, 55.2744)  
**Core verb:** Drag a squeegee horizontally across dirty window panels  
**Setting:** Looking down the Burj Khalifa facade. Panels come into view from the top, the floor receding below. City view in the background.  
**Wave structure:** Floors (1→163). Each floor is a set of windows to clean before time runs out.  
**Hazards:** Pigeons land on panels and re-dirty them. Sandstorm waves blur visibility (reduced-opacity scrim). Maintenance drone crosses the path.  
**Boss (every 20 floors):** Giant pigeon blocking a huge section. Swipe rapidly across it to shoo it away before it damages the clean panel.  
**Power-ups:** Water bucket (refill speed), wind gust (blows away pigeons), star (×2), harness (safety net — saves one fall).  
**Commentator:** Seagull perched on a nearby ledge. Says things like "SHINING!" and "PIGEON ALERT!"  
**Music:** Upbeat, urban. Higher tempo. Square wave lead.  
**Special mechanic:** Dirty meter per window — needs a full swipe to turn clean. Partial swipes count.  
**Colour:** `#6C8EBF` (steel-blue sky)

---

### 4 — Frame Builder (Dubai Frame)
**Location:** Zabeel Park (25.2355, 55.3004)  
**Core verb:** Tap to drop falling golden blocks into the right columns  
**Setting:** Looking up at the Dubai Frame silhouette. Blocks fall from the top of the screen.  
**Wave structure:** "LEVEL N". Each level requires building a specific pattern to match the golden frame outline shown as a ghost image.  
**Hazards:** Some blocks are silver (wrong material) — tap to reject before they land. Speed increases each level.  
**Boss:** A construction crane swings and disrupts the drop zone — time your taps between swings.  
**Power-ups:** Slow time, clear row, match-anywhere (any column), star (×2).  
**Commentator:** Construction worker in a hard hat (appears at the base).  
**Music:** Rhythmic, percussive — blocks landing in beat.  
**Colour:** `#F4B731` (gold)

---

### 5 — Fountain Conductor (Dubai Fountain)
**Location:** Downtown (25.1950, 55.2765)  
**Core verb:** Tap on jets at the right moment to launch them in sync with the music  
**Setting:** Overhead view of the fountain (or side view from the lake). The Burj Khalifa and Dubai Mall in the background.  
**Wave structure:** "SONG N". Each song is a sequence of tap prompts synced to the music beat.  
**Hazards:** Missing a beat breaks the combo and the jet droops. Multiple misses in a row and the crowd boos.  
**Boss:** The entire fountain needs to be conducted at once — all jets must fire on the downbeat of a climax passage.  
**Power-ups:** Rhythm lock (auto-taps for 4 beats), crowd cheer (forgives misses), star (×2), megajet (double height).  
**Commentator:** A tourist with a camera on the bridge, cheering.  
**Music:** This game IS the music — the music config drives the gameplay. Write a proper Arabic pop-influenced melody.  
**Special:** This is the most musical game. The music track and the tap prompts are the same thing.  
**Colour:** `#2E7CF6` (electric blue, water)

---

### 6 — OSS Hope (Museum of the Future)
**Location:** Sheikh Zayed Road (25.2192, 55.2820)  
**Core verb:** Swipe broken panels back into their correct slots (jigsaw/sliding puzzle feel)  
**Setting:** Interior of a space station. The Museum of the Future's torus shape visible through the windows.  
**Wave structure:** "SECTION N". Each section is a set of broken panels to fix before life support fails.  
**Hazards:** Malfunctioning robot bumps fixed panels out of place. Time limit per section.  
**Boss:** A critical system — 8 panels that must all be fixed simultaneously (multi-touch or very fast sequential swipes).  
**Power-ups:** Gravity boots (slows panel drift), repair kit (auto-fixes one panel), star (×2), hull patch (+life).  
**Commentator:** A floating robot assistant with an LED face.  
**Music:** Ambient electronic. Minor key, futuristic. Sine wave lead.  
**Colour:** `#8E9AAF` (grey-silver)

---

### 7 — Camera Flyer (Skydive Dubai)
**Location:** Palm Drop Zone (25.0904, 55.1386)  
**Core verb:** Drag to steer the skydiver's body position and frame the perfect shot  
**Setting:** Bird's eye view falling from the plane. The Palm Jumeirah visible below, growing larger as you fall.  
**Wave structure:** "JUMP N". Each jump has a series of photo targets (fellow skydivers in formation, the Palm outline, the Burj Al Arab) that appear in frame and must be captured before the altitude runs out.  
**Hazards:** Clouds (obscure targets), birds (block the frame), wind gusts (force reframing).  
**Boss:** The formation jump — 8 skydivers who form a shape only briefly before breaking apart. Capture all of them.  
**Power-ups:** Zoom lens (targets easier to hit), clear sky (removes cloud hazards), star (×2), extra altitude (+life).  
**Commentator:** The photographer (yourself — speech bubbles float above the camera).  
**Music:** Fast, exhilarating, wind-like. Sawtooth lead. High tempo.  
**Colour:** `#F0503C` (jump suit red)

---

### 8 — Penguin March (Ski Dubai)
**Location:** Mall of the Emirates (25.1181, 55.2006)  
**Core verb:** Tap left/right to steer the penguin parade around obstacles  
**Setting:** A snowy slope inside Ski Dubai. Colour-lit ski run. Other skiers and snowboarders in the background.  
**Wave structure:** "RUN N". Each run is a different slope with increasing obstacles and speed.  
**Hazards:** Ski equipment left on the slope, other skiers crossing, snowballs. Hitting one shuffles the parade order.  
**Boss:** The avalanche — a rolling snowball that must be outrun while still dodging obstacles.  
**Power-ups:** Magic scarf (invincibility), fish trail (attracts penguins back into line), star (×2), warm coat (+life).  
**Commentator:** A ski instructor by the side of the slope.  
**Music:** Jolly, march-like. Staccato square wave. Moderate tempo.  
**Special mechanic:** The parade has 5 penguins. Collecting bonus fish adds more penguins (score multiplier). Hitting an obstacle loses the rear penguin.  
**Colour:** `#7FC8EE` (ice blue)

---

### 9 — Falcon Strike (Dubai Desert)
**Location:** Desert safari area (24.9950, 55.4000)  
**Core verb:** Draw a curved line to guide the falcon's flight path toward the lure  
**Setting:** Open desert. Camel caravan in the background. The falconer's glove visible at the bottom. Red dunes, warm sky.  
**Wave structure:** "FLIGHT N". Each flight has a series of lures thrown in sequence. The falcon must catch each before it hits the ground.  
**Hazards:** Sand devils (wind vortices that deflect the path), other birds crossing, sun glare.  
**Boss:** The royal falcon — a larger, faster lure thrown by the master falconer, requiring a precision curved approach.  
**Power-ups:** Tailwind (increases speed), keen eye (shows optimal path), star (×2), falconer's call (+life).  
**Commentator:** The falconer, who reacts to each catch.  
**Music:** Desert-inspired. Oud-like sawtooth lead, Maqam Bayati scale. Slow, stately.  
**Colour:** `#D9A066` (sand gold)

---

### 10 — Cheetah Run (Dubai Safari Park)
**Location:** Al Warqa (25.1747, 55.4407)  
**Core verb:** Swipe left/right to dodge obstacles while running, swipe up to jump  
**Setting:** Savanna habitat inside Dubai Safari Park. Acacia trees, other animals watching.  
**Wave structure:** "KM N" (distance covered). Endless runner, increasing speed.  
**Hazards:** Rocks, logs, safari vehicles, other animals crossing the path.  
**Boss:** The fence (end of the enclosure) — must jump at the exact moment or bounce back and lose speed.  
**Power-ups:** Speed burst (brief invincibility + points per metre), gazelle friend (clears obstacles ahead), star (×2), water hole (+life).  
**Commentator:** A zookeeper on a nearby jeep.  
**Music:** Upbeat African. Layered percussion, bright triangle lead.  
**Special mechanic:** Score is distance × speed multiplier (combo). Going fast is rewarded but harder.  
**Colour:** `#E39A2E` (savanna gold)

---

## Reusable Patterns from Existing Games

| Pattern | Source | Reuse in |
|---------|--------|---------|
| Wave system (volleyball timing) | juggle-show.rules.js `launchVolley()` | Frame Builder, Fountain Conductor |
| Boss weak-point + wpCool cooldown | fruit-rush.3.js `bossHit()` | All bosses |
| Token flight (arc from hit to tray) | fruit-rush.3.js `sendToken()` | Any "collect item and send to counter" mechanic |
| Power-up queue with pity counter | fruit-rush.3.js `G.powerPity` | All games |
| Attract mode (auto-play on title) | fruit-rush.3.js `botTick()` | All games |
| Keeper toss animation | fruit-rush.world.js `tossFruit()` | Any character throw |
| Vox pattern for human characters | juggle-show.world.js `buildKeeper()` | All character designs |
| Crowd amphitheatre fill | juggle-show.world.js `buildCrowd()` | Games with spectators |
| koi fish movement (wander + rush) | fruit-rush.2.js `updateKoi()` | Any ambient animal AI |
| Butterfly arrival at tray slots | fruit-rush.2.js `arriveButterfly()` | Any collectible that fills a display |
| Species/collectible album system | fruit-rush.2.js entire file | Any game with unlockables |
| Frenzy power-up (rapid spawning) | fruit-rush.3.js `G.frenzy` | Games with rapid-fire modes |

## Scene Size Reference

World space units: approximately 1 unit = 0.8 metres at the default camera.
- `World.halfW` ≈ 10–12 units (scene is ~20 units wide)
- `World.apexMax` ≈ 10–12 units (maximum height before falling offscreen)
- Camera is at Z ≈ 18, Y ≈ 6, looking at origin

Game objects should stay within X ∈ [-halfW, +halfW], Y ∈ [-1, apexMax].
