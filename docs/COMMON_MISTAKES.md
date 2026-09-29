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

**What happened:** The pending fruit queue was processed like this:
```js
// BROKEN
for (const q of G.pending) {
  q.delay -= gdt;
  if (q.delay <= 0) { q.done = true; tossFruit(q); }   // if tossFruit throws, q stays in queue
}
G.pending = G.pending.filter(q => !q.done);             // q.done was set BEFORE the throw, but...
```

Wait — actually the problem is that `tossFruit` throws AFTER `q.done = true`, so the item IS filtered out. But if the throw happens inside the for loop and you're relying on the filter after, an uncaught error earlier in the loop can prevent the filter from running at all.

**Fix:** Extract due items first, remove them from pending, THEN toss each in a try/catch:
```js
// CORRECT
const due = G.pending.filter(q => (q.delay -= gdt) <= 0);
if (due.length) {
  G.pending = G.pending.filter(q => q.delay > 0);  // remove before processing
  for (const q of due) {
    try { tossFruit(q); } catch(e) { console.error(e); }  // one bad item can't block others
  }
}
```

**General rule:** When processing a queue, remove items from the queue BEFORE processing them, not after.

---

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
