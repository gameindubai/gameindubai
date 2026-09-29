# Worlds Registry

The WORLDS array in `src/pixel.js` is the single source of truth for all 10 game locations. Every downstream system (map pins, cards, game pages, sitemap) reads from this array.

## Adding a World

1. Set `live: true` when the game is ready to deploy
2. The build script automatically includes it in the home page, generates its game page shell, and adds it to the sitemap
3. Add its icon sprite to `SPR` in `pixel.js` (`ico_<key>` convention)

---

## All 10 Worlds

| n | id | name | place | area | lat | lng | color | icon | live |
|---|----|------|-------|------|-----|-----|-------|------|------|
| 1 | juggle-show | JUGGLE SHOW | Dubai Dolphinarium | Creek Park | 25.2365 | 55.3240 | #39CCE3 | ico_dolphin | ✅ |
| 2 | fruit-rush | FRUIT RUSH | Dubai Butterfly Garden | Al Barsha South | 25.0600 | 55.2445 | #7ED957 | ico_bfly | ✅ |
| 3 | shine-crew | SHINE CREW | Burj Khalifa | Downtown | 25.1972 | 55.2744 | #6C8EBF | ico_burj | 🔒 |
| 4 | frame-builder | FRAME BUILDER | Dubai Frame | Zabeel Park | 25.2355 | 55.3004 | #F4B731 | ico_frame | 🔒 |
| 5 | fountain-conductor | FOUNTAIN CONDUCTOR | Dubai Fountain | Downtown | 25.1950 | 55.2765 | #2E7CF6 | ico_fountain | 🔒 |
| 6 | oss-hope | OSS HOPE | Museum of the Future | Sheikh Zayed Rd | 25.2192 | 55.2820 | #8E9AAF | ico_motf | 🔒 |
| 7 | camera-flyer | CAMERA FLYER | Skydive Dubai | Palm Drop Zone | 25.0904 | 55.1386 | #F0503C | ico_chute | 🔒 |
| 8 | penguin-march | PENGUIN MARCH | Ski Dubai | Mall of the Emirates | 25.1181 | 55.2006 | #7FC8EE | ico_penguin | 🔒 |
| 9 | falcon-strike | FALCON STRIKE | Dubai Desert | Desert safari | 24.9950 | 55.4000 | #D9A066 | ico_falcon | 🔒 |
| 10 | cheetah-run | CHEETAH RUN | Dubai Safari Park | Al Warqa | 25.1747 | 55.4407 | #E39A2E | ico_cheetah | 🔒 |

---

## Geographic Notes

- Coordinates are in WGS84 decimal degrees
- The map projection uses `const KX = Math.cos(25.15 * Math.PI / 180)` to account for longitude compression at Dubai's latitude (~25°N)
- Map viewport: W: 55.11°E → 55.465°E, S: 24.975°N → N: 25.30°N
- The "Falcon Strike" desert pin (world 9) is at the desert safari area, not a specific building — approximate location
- The "Fountain Conductor" and "OSS Hope" pins are close together in Downtown. The pin declutter algorithm separates them automatically.

---

## Map Declutter Algorithm

Pins are placed at their true lat/lng position, then a spring physics simulation runs for 160 iterations:

1. Each pair of pins with overlapping bounding boxes pushes each other apart
2. Playable game pins (live) have a lower push weight (0.3) — they stay closer to true position
3. Coming-soon pins have a higher push weight (0.7) — they move more freely
4. All pins are clamped to the visible map area
5. Pins are kept away from the logo bounding box
6. Pins are kept away from Palm Jumeirah (so the Palm's shape stays visible)

After the simulation, the pin `el.style.left/top` is set in CSS. The true-location dot (`dot.style.left/top`) stays at the exact lat/lng position. A stem line is drawn connecting the two.

---

## Excluded Locations

**Aquaventure "Tower Hop" (Palm Jumeirah)** was considered and benched. Reasons:
- Atlantis is a private resort — using the Aquaventure brand requires licensing consideration
- The Palm already has two nearby pins (Skydive Dubai drop zone, Ain Dubai wheel)
- The Tower Hop mechanic (jump across platforms) would work but the location doesn't add UAE cultural value above Skydive Dubai

Can be revisited later as "Tower Hop" without the Atlantis/Aquaventure branding.
