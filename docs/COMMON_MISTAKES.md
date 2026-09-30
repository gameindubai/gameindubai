# Common Mistakes

Bugs we hit in production, and bugs we nearly hit. Read this before building a new game, modifying the engine, or changing the deployment setup.

---

## Game Logic Bugs

### 1. The Double-Roll Bug (caused the Dome 5 boss freeze)

**What happened:** The boss tossed extra fruit every 2–3 seconds. One line had two independent `Math.random()` calls deciding (a) whether to spawn a power-up and (b) what the power-up's type is:

```js
// BROKEN — two independent rolls
queueToss(
  Math.random() < 0.15 ? 'power' : pick(['mango', 'banana']),  // roll 1: type
  side, 0, {},
  Math.random() < 0.15 ? { power: pickPower() } : null          // roll 2: power property
);
```

This means ~13% of the time, roll 1 says "power" but roll 2 says null — producing a power-up object with no `.power` property. `tossFruit()` then calls `POW[undefined].icon` and throws. Because the broken item stayed in the pending queue and was retried every frame, the game froze silently while the pause button (in a separate try/catch) still worked.

**Fix:**
```js
// CORRECT — one roll, one variable
const pw = Math.random() < 0.15;
queueToss(
  pw ? 'power' : pick(['mango', 'banana']),
  side, 0, {},
  pw ? { power: pickPower() } : null
);
```

**General rule:** Never make the same decision twice with two independent random rolls in the same expression.

---

### 2. Queue Loop That Retries on Error

**What happened:** the pending-toss queue marked an item done, tossed it, and only filtered the queue *after the loop*:
```js
// BROKEN
for (const q of G.pending) { q.delay -= gdt; if (q.delay <= 0) { q.done = true; tossFruit(q); } }
G.pending = G.pending.filter(q => !q.done);
```
When `tossFruit` threw, the exception skipped the filter line, so the broken item stayed queued and was retried, and threw again, **every frame**. Gameplay froze while the HUD (in its own try/catch) kept working.

**Fix:** take due items out of the queue *first*, then process each one safely:
```js
const due = G.pending.filter(q => (q.delay -= gdt) <= 0);
if (due.length) {
  G.pending = G.pending.filter(q => q.delay > 0);
  for (const q of due) { try { tossFruit(q); } catch (e) { console.error(e); } }
}
```
**Rule:** remove an item from a queue before processing it.

### 3. Missing Defensive Guard on Power-Up Lookup

Always guard optional property lookups when the source is a game-built object:
```js
// Add this to tossFruit()
if (isPow && !POW[it.power]) it.power = pickPower();  // fallback if power is undefined/invalid
```

---

### 4. iOS WebAudio `state === 'closed'`

iOS can permanently close an AudioContext when the app is backgrounded (especially as a PWA on low memory devices). If you only check `state === 'suspended'` and call `.resume()`, you'll get a silent no-op and music never returns.

```js
// BROKEN
init() {
  if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
  // ...
}

// CORRECT
init() {
  if (this.ctx && this.ctx.state === 'closed') { this.ctx = null; this.musicOn = false; }
  if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); return; }
  // ... create new context
}
```

---

### 5. rAF Stall on iOS Home Screen Apps

`requestAnimationFrame` can stop delivering callbacks after the user switches apps and returns, especially on iOS PWAs. Symptoms: the game freezes but buttons still work (if drawn in a separate mechanism).

**Fix:** Implement a watchdog + fallback ticker:
```js
// Watchdog: check every 400ms, restart rAF if it hasn't fired for 600ms
setInterval(() => {
  if (!document.hidden && performance.now() - Loop.rafAt > 600) Loop.kick();
}, 400);

// Fallback ticker: setTimeout chain at 16ms when rAF stalls
function fbTick() {
  Loop.fb = 0;
  if (document.hidden || performance.now() - Loop.rafAt < 200) return;
  step(performance.now());
  Loop.fb = setTimeout(fbTick, 16);
}
```

---

### 6. Pointer Events Leaking Across Sessions

If a user starts a drag gesture, switches apps mid-drag, and comes back, the `pointerup` event never fires. The next `pointerdown` is then a second concurrent pointer, breaking single-finger games.

**Fix:** Track active pointer IDs in a `Set`. Call `releaseAll()` on `visibilitychange`, `pagehide`, `blur`, and `pageshow`:
```js
const ptrs = new Set();
const releaseAll = () => {
  UI.pressed = null;
  for (const id of ptrs) { try { if (GAME.pointerUp) GAME.pointerUp(-1, -1, id); } catch(e) {} }
  ptrs.clear();
};
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
```

---

### 7. WebGL Context Loss (Not Handled)

iOS drops the WebGL context when the app uses too much GPU memory in the background. Without handling, the game returns to a black screen.

```js
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  Loop.glLost = true;
  Loop.glLostAt = performance.now();
  if (G.state === 'play') pause();
}, false);
// The watchdog auto-reloads after 2s if glLost stays true
```

---

### 8. Tapping a Button Also Fires the Game Input

Pointer events bubble. If `pointerdown` hits a UI button AND the game's `pointerDown`, you get unintended gameplay input on button taps.

**Fix:** Hit-test buttons FIRST in the `pointerdown` handler. Only dispatch to the game if no button was hit:
```js
stage.addEventListener('pointerdown', e => {
  const b = hitButton(e.clientX, e.clientY);
  if (b) { UI.pressed = b.id; return; }           // button wins, game doesn't see it
  ptrs.add(e.pointerId);
  if (G.state === 'play' && GAME.pointerDown) GAME.pointerDown(e.clientX, e.clientY, e.pointerId);
}, { passive: false });
```

---

## Deployment Bugs

### 9. Cache-First Pages = Bug Fixes Never Arrive

The original service worker served HTML pages from cache first (instant, but stale). After a deploy, users kept running the old buggy game because the new sw.js was waiting to activate, and even after it activated, the pages it had cached were still the old ones.

**Fix:** Network-first for pages (with 1.8s timeout fallback to cache for slow connections):
```js
if (r.mode === 'navigate') {
  const net = fetch(r).then(res => { if (res.ok) cache.put(pathname, res.clone()); return res; });
  e.respondWith((async () => {
    const quick = await Promise.race([net.catch(() => null), new Promise(ok => setTimeout(() => ok(null), 1800))]);
    return quick || (await caches.match(pathname)) || net;
  })());
  return;
}
```

Also: call `registration.update()` immediately after `register()`, so the browser checks for a new sw.js on every page load (not just when it feels like it).

---

### 10. D1 "No Such Table" 503 on Fresh Database

If the D1 database exists but the table hasn't been created yet, every query throws. Don't run `CREATE TABLE` as a separate setup step — wrap it in every query handler:

```js
async function q(db, fn) {
  try { return await fn(); }
  catch (e) {
    if (!/no such table/i.test(String(e?.message))) throw e;
    await db.prepare('CREATE TABLE IF NOT EXISTS games (...)').run();
    return await fn();
  }
}
```

---

### 11. Versioned Assets Missing the `immutable` Directive

Without `immutable`, browsers send conditional requests (If-None-Match / If-Modified-Since) on every navigation even when the URL has a version hash. This wastes a round-trip.

```
# _headers
/kit/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

---

### 12. Three.js r128 Limitations

- `CapsuleGeometry` doesn't exist in r128 (added in r142). Use `CylinderGeometry` + `SphereGeometry` composites.
- `THREE.CameraHelper` works, `OrbitControls` as a class import doesn't (use `three/examples/jsm/...` path, but simpler to just not use them).
- `GLTFLoader` is available via CDN but adds 50 KB — avoid for this project.

---

### 13. Score Validation Too Loose

Accepting any client-provided score invites tampering. The boss in Fruit Rush can give 1,000–3,000 point bonuses, so a naive `score < max_combo * 30` check would fail legitimately. Use time-based validation:

```js
const MAX_SCORE = 50_000_000;
const PTS_PER_SEC = 3_000;  // far above any real play rate
const PTS_SLACK = 20_000;   // allowance for boss bonuses and power-ups
if (score < 1 || score > MAX_SCORE || score > PTS_SLACK + dur * PTS_PER_SEC) {
  return json({ ok: false, error: 'score rejected' }, 422);
}
```

---

### 14. Cross-Origin Score Submission Not Blocked

Any website can POST to your `/api/score` endpoint and inflate scores. Check the `Origin` header:

```js
const origin = req.headers.get('origin');
if (origin) {
  try { if (new URL(origin).host !== url.host) return json({ ok: false }, 403); }
  catch (e) { return json({ ok: false }, 403); }
}
```

---

## Build Bugs

### 15. Font Not Loaded on Canvas Before Drawing

`renderText()` uses the `Samar Blocks` font. If called before `document.fonts.ready` resolves, the canvas falls back to the system monospace and the pixel font doesn't appear.

**Fix:** Wrap all initial layout calls in `document.fonts.ready.then(...)`.

### 16. GA Tag Missing from a Page

The `ga_tag()` function in `build_site.py` generates the GA script tags. Make sure all HTML-generating functions (`head()`, `game_page()`, etc.) call it. If you add a new page type, don't forget to include it.

### 17. Forgetting to Rebuild Before Testing

`site/` is generated by `build_site.py`. Never edit `site/` directly. If you change `src/pixel.js` or `src/site/site.css`, run `python3 build_site.py` before testing.

---

## UX/Design Mistakes

### 18. Things That Look Like Buttons But Aren't

Kids (and adults) will tap anything that looks interactive. "PLAY NOW" and "COMING SOON" section headers used to be styled like buttons, causing confusion. They must be plain labels, not panels with borders and 3D effects.

**Rule:** The `.btn` CSS class and the in-game `blockBtn` drawing function must only be used for actual tappable actions.

### 19. Desktop Cards Too Tall for the Screen

The first desktop layout had equal-width/height cards for all 10 games. On a 1280×680 laptop, the columns overflowed and the layout collapsed to the stacked (phone) view — showing the map but no side panels.

**Fix:** The layout code now measures column height after rendering and iteratively reduces thumbnail height, then switches to row-mode cards (image left, text right), and only falls back to stacked mode if columns still don't fit after both reductions.

### 20. Coming-Soon Cards That Look Like Game Cards

Coming-soon games should never look as prominent as playable ones. They got their own compact list style (not a full card with a big thumbnail), so the playable games stand out clearly as the call to action.

---

## Lessons from building Shine Crew (World 3)

### 21. Lit Materials Render Black
There are no lights in any scene. The first facade used `MeshLambertMaterial` for its bands and fins, and they rendered solid black. Use `VOXMAT` or `MeshBasicMaterial` (see `DESIGN_LANGUAGE.md`).

### 22. The Build Needs a Card Image Before the Game Exists
`build_site.py` hashes `src/static/assets/cards/<id>.webp` for the home card, so a missing file stops the build. Copy any card as a placeholder, then capture the real one from gameplay before deploying.

### 23. Pacing: Nothing to Do for 13 Seconds
The first version spawned crusts just below the screen at a speed where they took 13 s to reach the gondola. A kid would think the game was broken. Two fixes: scale speed to screen height (constant travel time per device, about 8 s), and **pre-place the first targets partway up the screen** so action starts within seconds. Check "time to first action" on every new game.

### 24. HUD Collisions Near the Top of the Screen
The gondola and its speech bubble first overlapped the score and floor label. Keep a HUD band clear (`hudUnits = (SAFE.t + ~120·S)/H × viewHeight`), and remember the engine draws speech bubbles *up-left* of the commentator point.

### 25. Two Pills in a Narrow Flex Row Didn't Wrap
On compact desktop cards, `TOP SCORE` and `N PLAYS` sat on one line and overflowed the card. Instead of fighting the layout engine, compact rows show only the more important pill. Measure with `getBoundingClientRect()` when something looks off, rather than guessing.

### 26. The Summary Drifted From the Agreed Concept
A condensed brief for Shine Crew added pigeons that dirty windows, plus a pigeon boss to shoo away, which breaks the "no animal is ever annoyed" rule. Always build from `CONCEPTS.md`.

### 27. Test Scripts Killing Themselves
`pkill -f "http.server 8765"` also matches the shell running that command, so the script dies silently. Kill by port or PID instead, and start servers with `--directory <absolute path>`: if the build deletes and recreates `site/`, a server started with `cd site` keeps serving the deleted folder.

---

## The play-count regression (and why a test framework exists now)

### 28. Two Components Shared One CSS Class
The About page's stat boxes and the game cards' stat pills were both called `.stats`. The About rule came later in the file, so it silently turned every card's pill row into a two-column grid, and the pills overflowed on compact desktop cards. **Fix:** scope class names per component (`.about-stats`). **Guard:** `test_css_classes_are_not_shared_between_pages`.

### 29. "Fixing" a Layout by Hiding a Feature
Instead of finding that cause, the overflow was "fixed" by hiding the play count on compact cards, a feature the owner had explicitly asked for, and it shipped. **Rules:** never remove or hide a requested feature to make a layout fit; find the cause (measure with `getBoundingClientRect` and list the matching CSS rules); and if a trade-off is truly needed, ask first. **Guard:** `test_every_card_shows_plays_and_top_score` runs at 7 sizes in 2 engines.

### 30. Tests That Lived Only on One Machine
The earlier checks were ad-hoc scripts outside the repo, so they ran only when someone remembered, and not at all for this change. Now the suite lives in `tests/`, runs on every push (CI), and gates every deploy (`scripts/deploy.py`).

### 31. `shutil.ignore_patterns('site')` Matches Every Folder Named `site`
It excluded `src/site` too (the same class of bug as the early `.gitignore` rule `site/`). Anchor exclusions to the top level.

---

## Lessons from Frame Builder (World 4)

### 32. "Visible" Isn't the Same as "Noticeable"
The target arrow and drop timer existed, sat in the right place, and were visible, but at 20 px and 3 px tall a kid would never notice them. Size key cues for a 5-year-old: the arrow is now 3× bigger with an outline and bounce, and the timer is a bright "fuse" across the block itself.

### 33. Stack Mechanics Punish Too Hard for Ages 3–10
With a pure Stack rule, towers narrowed to slivers within a minute, even for the bot. Tuning: a perfect window of 0.45 units on the first floor, down to 0.25; +0.3 width regrow on a perfect; minimum width a third of full; calmer early swing. Test difficulty with the bot and look at the numbers (tower widths over time), not just at screenshots.

### 34. Every New Game Squeezes the Desktop Column
Four games broke the laptop layout, and five needed another step. The fitting ladder is now: big cards → shrink thumbnails → compact rows (▶ badge) → `tight` → `mini` → stacked. The tests guarantee stats and a play affordance at every step. At about 7+ live games, redesign the desktop column (e.g. two tiles per row, or a scrolling shelf).

---

## The performance & consistency audit (why these tests exist)

### 35. Nothing Measured Speed, Weight or Leaks
Every earlier test checked that things *work*. Nobody measured draw calls, downloads or leaks, so Pew Pew Space shipped at 689 draw calls per frame (7–12× the others). **Now:** `tests/test_perf.py` budgets every game, and `tools/audit.py` measures any game in minutes.

### 36. One Mesh per Block
Voxel ships built from one `Mesh` per block cost one draw call per block. **Fix:** one `InstancedMesh` per material per ship, and hide a destroyed block by setting its instance matrix to scale 0. Pew Pew Space went from 689 to 70 calls.

### 37. InstancedMesh per Object Leaks Unless Disposed
The batching fix itself leaked: every spawned ship created instance-matrix buffers that were never freed. **Fix:** `im.dispose()` when the object leaves (`removeShip`). **Detect leaks by comparing identical runs**, not by growth within one run (new content legitimately uploads the first time).

### 38. Collisions Tunnel on Slow Frames
Frame Builder checked "is the block inside a 0.9-unit window at the tower top?". On a slow frame the block moved 1.5 units in one step and passed straight through, so a perfect drop counted as a miss. **Fix:** swept test (previous bottom above the top, current bottom at or below it). The perf test runs at 3× resolution, which makes frames slow on purpose.

### 39. Copy-Paste Between Games
The pendulum, gusts, streaks, screen-to-world mapping and weighted pick were copied from game to game. **Fix:** they live in blockkit's "Shared gameplay helpers", and `test_no_helper_is_copied_between_games` fails on new copies.

### 40. An Adopted Game Kept Its Own Look and Lifecycle
Pew Pew Space had no pause, no auto-pause on background, no iOS audio recovery, and a different HUD. **Fix:** the standalone design contract, enforced by `test_design.py`.

### 41. Guessing the Cause
The first theory for Frame Builder's failures (the wind) was wrong; the second (swing lag) was wrong too. A 40-second diagnostic that logged the block's offset at each drop showed perfect aim at normal frame rates, which pointed straight at frame-rate tunnelling. **Measure before fixing.**

### 42. A Leak Test That Flagged New Content as a Leak
The first leak test compared two identical runs and allowed at most +6 GPU buffers. Fruit Rush failed with +8, but six back-to-back runs showed 168, 168, 168, 168, then 174, exactly when a new butterfly species appeared (3 geometries × 2 buffers). Not a leak. **Fix:** four runs; fail only on growth in *every* run (the signature of a real leak) or too much in total. **Lesson:** when a test fails, check whether the test or the code is wrong before changing either.

### 43. A Leak Test Blind to the Leak It Was Written For
The second version of the leak test passed even with the Pew Pew leak put back. Its 8-second runs at 3× resolution were so slow in game time that no enemy ever spawned, so nothing could leak. **Fix:** run the leak phase at normal resolution for 15 s of *game time*; it now fails on the reintroduced leak (56 → 76 → 96 buffers). Its first rule ("≤ 12 buffers in total") also flagged Shine Crew's one-off new crust type (131 → 131 → 149), so the rule is now "grows in every run" plus a loose sanity cap. **Always prove a test both ways:** it fails on the broken code AND passes on content-rich correct code.

### 44. Content Uploaded on First Appearance (a Hitch, and a Fake Leak)
Shapes and power-up icons were uploaded to the GPU the first time they appeared on screen, which causes a small mid-game stutter. With 18 crust shapes and 5 power-up icons, Shine Crew's GPU memory also stepped up across consecutive runs, and the leak test couldn't tell that from a leak. **Fix:** the engine pre-warms every geometry built at load, **every geometry attached to the scene (including hidden ones)**, and every texture in `GAMEDEF.powers` before the first frame. (The first version covered only voxel geometry; Shine Crew's hidden glints, backup gondola and jets still uploaded on first use and failed the full-suite run: 163 → 171 → 183. Now flat: 183 buffers in five consecutive runs.) Fruit Rush builds its butterflies and bosses at load. Proven both ways: correct code is flat, and an injected per-crust geometry leak fails (235 → 267 → 327).

### 45. Two Deploy Gates at Once (and pkill Killing Itself, Again)
A gate from an earlier session was still running when a new one started. Both rebuilt `./site` and ran the suite together, and three tests failed for no real reason (the log even had null bytes from two writers). **Fix:** `scripts/deploy.py` takes a lock and refuses to start while another gate runs. **Check `ps` before starting a long job.** While cleaning up, `pkill -f "<pattern>"` matched the shell running it and killed the whole command (lesson 27 repeated). Kill by PID from `ps`, never with a pattern that appears in your own command line.
