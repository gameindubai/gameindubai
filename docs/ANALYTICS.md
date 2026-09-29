# Analytics

**GA4 Property:** G-1BHJTF5SVL (in `build_site.py` as `GA_ID`)

---

## GA4 Custom Dimension (Do This Before Launch)

GA4 doesn't retroactively apply custom dimensions. Set this up first:

1. GA4 → Admin → Custom definitions → Create custom dimension
2. **Dimension name:** Game  
3. **Scope:** Event  
4. **Event parameter:** `game_id`

Without this, you can't filter "game_start" events by which game was played.

---

## Events Taxonomy

### `game_start`
Fired when a player taps PLAY (or PLAY AGAIN).
```js
Track.ev('game_start', { game_id: 'juggle-show', run_number: 1 });
```
**Use:** count = total game plays (per GA4 "Event count"). Filter by `game_id` to see per-game play count. Compare to D1 play counter for sanity check (D1 may be higher — beacons can fail, GA can be blocked by ad-blockers).

### `game_over`
Fired at the end of every run (including runs that end early via HOME button: those don't fire game_over. Only natural game endings do.)
```js
Track.ev('game_over', {
  game_id: 'fruit-rush',
  score: 4321,
  wave: 5,              // which wave the player reached
  new_best: 1,          // 1 if this beat the device best
  duration_sec: 82      // seconds from game start to game over
});
```
**Use:** Average score, average duration, drop-off by wave (which wave kills most players), new_best rate (engagement quality).

### `select_content`
Fired when a player taps a pin or card on the home page.
```js
Track.ev('select_content', {
  content_type: 'game',          // 'game' | 'coming_soon'
  content_id: 'juggle-show',     // game id
  source: 'pin'                  // 'pin' | 'card'
});
```
**Use:** Which coming-soon games generate the most interest (demand signal for build priority).

### `app_open`
Fired when the site is opened from the installed home-screen icon.
```js
Track.ev('app_open');
```
**Use:** % of sessions that are installed-app sessions vs browser.

### `app_installed`
Fired when the browser confirms the app was installed.
```js
Track.ev('app_installed');
```

### `app_install_click`
Fired when the INSTALL button is tapped.
```js
Track.ev('app_install_click', { platform: 'ios' });  // 'ios' | 'other'
```
**Use:** Installation funnel (click → installed). iOS installs can't be confirmed with the web API, so use click as a proxy.

### `exception`
Fired when a JS error occurs in game logic (unique errors only, first 3 per session).
```js
Track.ev('exception', {
  description: 'Cannot read properties of undefined (reading icon)',
  fatal: false,           // true = run was ended by the safety net
  game_id: 'fruit-rush',
  state: 'play'
});
```
**Use:** Bug detection in production. Check this regularly — fatal exceptions mean players lost a run due to a bug.

---

## Where to Look for What

| Question | GA4 Location |
|----------|-------------|
| How many people played today? | Reports → Engagement → Events → game_start → Event count |
| Which game is more popular? | Events → game_start → filter by game_id dimension |
| What wave do players reach on average? | Events → game_over → Custom → average of wave |
| Which coming-soon game has most interest? | Events → select_content → filter content_type=coming_soon → by content_id |
| How many people installed the app? | Events → app_installed |
| Are there production bugs? | Events → exception → description |
| How long do sessions last? | Engagement → Sessions → Engagement time |

---

## Privacy Compliance

The GA tag is configured with:
```js
gtag('config', 'G-1BHJTF5SVL', {
  allow_google_signals: false,            // no cross-device tracking
  allow_ad_personalization_signals: false // no ad targeting
});
```

This is appropriate for a children's site. No cookie consent banner is needed under UAE law for analytics-only tracking. If expanding to EU users, a consent mechanism would be required under GDPR (kids under 16 need parental consent for any tracking).

---

## D1 Play Counter vs GA

| | D1 plays counter | GA4 game_start |
|-|-----------------|---------------|
| Source | `navigator.sendBeacon` (POST /api/plays) | `gtag('event', ...)` |
| Blocked by ad blockers? | No | Yes (~30% of users) |
| Accuracy | Higher (beacons queue even on page close) | Lower |
| Per-game breakdown | Yes (per game_id row) | Yes (with custom dimension) |
| Historical | Cumulative, can't be reset per period | Date-ranged |
| Shown to users | Yes (on home page cards) | No |

Use D1 for the public play count. Use GA4 for analysis and segmentation.
