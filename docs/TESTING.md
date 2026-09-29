# Testing

## Quick Sanity Checks (Run After Every Change)

```bash
# 1. Rebuild
python3 build_site.py

# 2. Syntax check all JS
node --check src/pixel.js && node --check src/blockkit.js && \
node --check src/fruit-rush.3.js && node --check src/juggle-show.rules.js && \
echo "all ok"

# 3. Visual check in browser
cd site && python3 -m http.server 8765
# Open http://localhost:8765 — check home page renders
# Open http://localhost:8765/games/fruit-rush/?wave=5&debug=1 — play the boss
# Open http://localhost:8765/about/ — check Samar's page
```

---

## Browser Coverage

Test in this order of priority:

| Browser | Why | Priority |
|---------|-----|----------|
| Chrome (Android) | Most users in Dubai, target demographic | Must pass |
| Safari (iPhone) | iOS is very common in UAE; has quirks | Must pass |
| Chrome (Desktop) | Most desktop users | Must pass |
| Safari (macOS/iPad) | Same engine as iPhone, verify at larger screen | Should pass |
| Firefox | Low UAE share but good for catching CSS issues | Nice to have |

Playwright is available for automated testing. The test scripts use `--use-gl=angle --use-angle=swiftshader` for software-rendered WebGL (slower but headless-compatible).

---

## Automated Test Scripts

### Home page visual + functionality
```bash
timeout 200 python3 sitetest.py "" \
  home_desk:1440:860:0 \
  home_mob:390:844:0 \
  home_lap:1280:680:0
```
`sitetest.py` takes a path and space-separated `name:width:height:fullpage` specs. Screenshots go to `work/`.

### Boss freeze regression
```bash
# Reproduce the dome 5 fix (should run without freezing)
timeout 120 python3 - <<'EOF'
import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1180,"height":760})
    pg.route("**/api/**",lambda r: r.fulfill(status=200,body='{}'))
    pg.goto("http://localhost:8765/games/fruit-rush/?wave=5&debug=1"); time.sleep(4); pg.keyboard.press("Enter")
    pg.wait_for_function("()=>G.phase==='boss'",timeout=30000)
    for i in range(3): pg.evaluate("()=>queueToss('power',1,0,{},null)")  # simulate broken toss (now recovered)
    time.sleep(0.8); a=pg.evaluate("()=>G.boss.t"); time.sleep(1.5); c=pg.evaluate("()=>G.boss.t")
    assert c > a, f"BOSS FROZEN: t={a} didn't advance to {c}"
    print("PASS: boss clock advanced from", a, "to", c); b.close()
EOF
```

### Service worker: new deploy arrives on first reload
```bash
timeout 150 python3 swtest.py
# Should print "reload #1 serves: <new hash>"
```

### Offline play
```bash
timeout 120 python3 - <<'EOF'
import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}); pg=ctx.new_page()
    pg.route("**/api/**",lambda r: r.fulfill(status=200,body='{}'))
    pg.goto("http://localhost:8765/"); time.sleep(3); pg.wait_for_function("()=>navigator.serviceWorker.controller!==null",timeout=15000)
    ctx.set_offline(True)
    for path in ["/games/fruit-rush/","/about/","/"]:
        t=time.time(); pg.goto("http://localhost:8765"+path,wait_until="domcontentloaded"); d=(time.time()-t)*1000
        assert d < 2000, f"Offline {path} took {d:.0f}ms (too slow)"
        print(f"PASS offline {path} {d:.0f}ms")
    b.close()
EOF
```

### PWA installability
```bash
timeout 60 python3 - <<'EOF'
import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}); pg=ctx.new_page()
    pg.route("**/api/**",lambda r: r.fulfill(status=200,body='{}'))
    pg.goto("http://localhost:8765/"); time.sleep(3)
    cdp=ctx.new_cdp_session(pg); errs=cdp.send('Page.getInstallabilityErrors')['installabilityErrors']
    assert not errs, f"PWA installability errors: {errs}"; print("PASS: no installability errors"); b.close()
EOF
```

---

## Manual Testing Checklist (Before Deployment)

### Home page
- [ ] Logo renders at correct size (not overlapping the map)
- [ ] "PLAY NOW" and "COMING SOON" are labels, not clickable buttons
- [ ] Game 1 and 2 cards show "TOP SCORE" and "X PLAYS" (mocked data works)
- [ ] Fruit Rush card shows "BE THE FIRST!" when no plays (on a fresh session)
- [ ] All 10 map pins visible, no pins in the Arabian Gulf or off-map
- [ ] Hovering a card highlights its pin (and vice versa)
- [ ] Leader line appears on hover, disappears on mouse-out
- [ ] INSTALL button hidden (Chrome desktop: becomes visible after user gesture; Safari iOS: always visible)
- [ ] MEET SAMAR button navigates to /about/
- [ ] Works at 390×844 (iPhone), 820×1180 (iPad), 1260×735 (laptop), 1440×900 (desktop)

### Game pages (both games)
- [ ] Loading splash appears instantly with correct game name + location
- [ ] Microcopy rotates (second message appears after ~1.7s)
- [ ] Game boots (3D scene appears, splash dismisses)
- [ ] Title screen shows TOP SCORE and YOUR BEST
- [ ] PLAY button starts the game
- [ ] MAP button (top-left) returns to home
- [ ] Score appears top-centre
- [ ] Lives display as the correct icon type
- [ ] Combo multiplier appears after 8 consecutive hits
- [ ] Wave progress bar fills
- [ ] Boss appears at wave 5
- [ ] Boss HP bar visible
- [ ] Weak point pulsing and moving
- [ ] "TOO THICK!" on body hits
- [ ] Game over screen: YOUR BEST, overStats text, PLAY AGAIN + HOME buttons

### Juggle Show specific
- [ ] Drag moves the seal smoothly
- [ ] Ball follows parabolic arc
- [ ] Catching ball increments combo
- [ ] Missing ball loses life, koi rush
- [ ] Wave 5 boss has the hoop
- [ ] Parrot commentator speaks

### Fruit Rush specific
- [ ] Swipe creates blade trail
- [ ] Slicing mango/orange/banana works in 1 hit
- [ ] Watermelon/pineapple requires 2 hits (crack appears after 1st)
- [ ] Coconut (red outline) loses life if hit
- [ ] Syrup bottle makes blade sticky for 3s
- [ ] Sliced pieces fly to trays
- [ ] Butterflies arrive at trays
- [ ] "NEW BUTTERFLY!" toast appears for new species
- [ ] Dome 5 boss doesn't freeze (play through the boss fight for >30s)
- [ ] Budgie commentator speaks

### About page
- [ ] Samar's sticker photo renders
- [ ] Speech bubble says the correct text
- [ ] Stats grid shows correct values (age 8, grade 3rd, etc.)
- [ ] PLAY MY GAMES button works
- [ ] Game cards show real play counts (mocked)

### After deployment
- [ ] https://gameindubai.com loads over HTTPS
- [ ] www.gameindubai.com redirects to gameindubai.com (301)
- [ ] http://gameindubai.com upgrades to https
- [ ] `/api/plays` POST returns `{"ok":true}`
- [ ] `/api/stats` GET returns current play counts
- [ ] Game plays and score are reflected in D1 (check Cloudflare dashboard)
- [ ] GA4 real-time shows a user on the game page
- [ ] GA4 shows `game_start` event with `game_id` after playing

---

## Debug Tips

### Inspect game state at runtime
Open the browser console on any game with `?debug=1`:
```js
window.__game.G          // full game state
window.__game.G.boss     // boss state (null if no boss)
window.__game.Top        // global top score state
window.__game.Loop       // frame loop state
window.__game.G.t        // game clock (should increase over time)
```

### Force a boss fight without playing through waves
```
http://localhost:8765/games/fruit-rush/?wave=5&debug=1
```
Tap PLAY — starts at dome 5 (the watermelon boss).

### Test a specific error
```js
// In console with debug=1:
queueToss('power', 1, 0, {}, null)  // should no longer freeze (the fix)
```

### Check service worker cache
```js
// In console:
const r = await navigator.serviceWorker.getRegistration();
const keys = await caches.keys();
const cache = await caches.open(keys[0]);
const entries = await cache.keys();
entries.map(e => e.url)  // all cached URLs
```
