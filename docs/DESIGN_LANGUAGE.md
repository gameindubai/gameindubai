# Design Language

Everything visual, typographic, and interactive. Follow these rules exactly when adding new games, new cards, new UI, or new sprites. Deviating from them is what makes things look "messy".

---

## Core Principles

1. **Kid-first, adult-enjoyable.** Age 3–10 must be able to understand what's happening at a glance. Adults should find it charming, not patronising. No reading required to play.
2. **One verb per game.** Each game has exactly one physical gesture: drag, swipe, tap in rhythm. Never more than one input type.
3. **Dubai is the star, not the game.** Every game is grounded in a real attraction. The setting should be instantly recognisable to anyone who's been there.
4. **Nothing upsets location owners.** No harming animals, no defacing landmarks, no aggressive themes. Playful and respectful only.
5. **Block-style is the aesthetic, not Minecraft.** Original voxel look. No Minecraft names, textures, or assets.

---

## Colour Palette

Defined in `pixel.js` as `PAL` constants and CSS custom properties in `site.css`.

| Name | Hex | CSS var | Use |
|------|-----|---------|-----|
| INK | `#14181F` | `--ink` | All outlines, borders, shadows |
| NIGHT | `#0D2340` | `--night` | Darkest background (game, footer) |
| NAVY | `#17416E` | `--navy` | Card background, panel background |
| NAVY_L | `#2A5E93` | `--navy-l` | Panel highlight edge |
| NAVY_D | `#0F2D52` | `--navy-d` | Panel shadow edge |
| AQUA | `#39CCE3` | `--aqua` | Sea, water, accent blue |
| GOLD | `#F4B731` | `--gold` | Primary action colour: PLAY, stars, badges |
| GOLD_L | `#FFE28A` | `--gold-l` | Gold highlight |
| GOLD_D | `#B87B12` | `--gold-d` | Gold shadow |
| CORAL | `#F0503C` | `--coral` | Danger, SOON badges, new-top-score |
| LIME | `#7ED957` | `--lime` | Health, blooms, positive |
| SAND | `#E8C98A` | `--sand` | Website background, desert |
| WHITE | `#FFFFFF` | — | Text on dark, wave highlights |

### Shading rule (Minecraft-map style)
Every surface has three shades: base, +10% lighter (top-left highlight), -15% darker (bottom-right shadow). The `Vox` class handles this automatically via the voxel geometry builder.

---

## Typography

### Samar Blocks (pixel font)
- **File:** `src/static/assets/samar-blocks.woff2` (1.4 KB)
- **Built from:** the in-game 5×7 pixel `FONT` bitmap in `pixel.js`, converted via `fontTools` + `skia-pathops`
- **CSS:** `font-family: 'Samar Blocks', ui-monospace, monospace`
- **Use for:** game names, score numbers, HUD labels, ribbon text, section headings on the website
- **Do not use for:** body text, long descriptions, taglines — use the system rounded font instead

### System rounded font
- **CSS:** `font-family: ui-rounded, 'SF Pro Rounded', 'Nunito', 'Segoe UI Rounded', system-ui, sans-serif`
- **Weight:** always 700
- **Use for:** card descriptions, speech bubbles, loading text, instructional copy

### Text rendering in games
Use `renderText(text, pixelSize, style)` → canvas, then `drawImage` on the UI canvas. Styles:
- `'title'` → gold text, full ink outline (all 8 directions + drop shadow)
- `'hud'` → white with ink outline
- `'gold'` → gold with ink outline
- `'aqua'` → aqua with ink outline
- `'lime'` → lime with ink outline
- `'ink'` → dark text (used on gold backgrounds)
- `'red'` / `'coral'` → coral/danger
- `'ghost'` → semi-transparent white

---

## Panel System (website cards and UI)

A "panel" is the navy box with gold corner dots and inset highlight/shadow edges:
```css
background: var(--navy);
border: 3px solid var(--ink);
box-shadow: inset 3px 3px 0 var(--navy-l), inset -3px -3px 0 var(--navy-d), 0 6px 0 rgba(8,20,40,.35);
/* plus four 6×6 gold dots at corners via layered gradients */
```

Always use `.panel` CSS class. Never invent new box styles.

## Button System

In-game buttons are drawn on the 2D canvas via `blockBtn`. On the website, use the `.btn` CSS class with colour modifier: `.btn.gold`, `.btn.navy`, `.btn.aqua`, `.btn.lime`.

**Rule:** anything that looks like a button must BE a button. Section labels ("PLAY NOW", "COMING SOON") must NOT look like buttons — use plain text + icon.

Button hierarchy:
1. **Gold** — primary action (PLAY, PLAY AGAIN, PLAY MY GAMES)
2. **Navy** — secondary navigation (MAP, MEET SAMAR)
3. **Aqua / Lime** — contextual positive actions

---

## Sprite System

All sprites in `SPR` object in `pixel.js`. Each sprite is `{pal: {letter→hex}, rows: [strings]}`.

```js
// Example sprite definition
SPR.mySprite = {
  pal: { K: '#14181F', R: '#F0503C', Y: '#F4B731' },
  rows: [
    "..K.K..",
    ".KRKRK.",
    "KKYRYRK",
    ".KRKRK.",
    "..K.K.."
  ]
};
```

Rules:
- `K` is always `#14181F` (INK) — the outline/shadow colour
- `.` is always transparent
- Keep sprites small (5–16px wide, 5–16px tall) — they're rendered at 2–8× pixel scale
- Sprites are referenced by name in HTML via `data-spr="name"` attribute; `site.js` renders them on load
- Landmark icons follow naming convention `ico_<thing>` (e.g. `ico_burj`, `ico_bfly`)

---

## 3D World Style

### Camera
- Three.js PerspectiveCamera, FOV ~55°, positioned ~18 units back and ~6 up
- Looks slightly downward so the "stage" is fully visible
- No user camera control — the camera is fixed per scene

### Materials
All voxel meshes share a single `VOXMAT` (MeshLambertMaterial with `vertexColors: true`). This means:
- One draw call for all static geometry (merged into one mesh at build time)
- Dynamic objects (characters, fruit, tokens) each have their own mesh but reuse the same material

### Lighting
- Ambient: `0x9CBACC` (bluish-white), intensity 0.9
- Directional: `0xFFEECC` (warm sun), intensity 1.1, position (6, 12, 8)
- No shadows (too expensive, not needed at this art style)

### Colour temperature rule
Games set outdoors in Dubai use warm afternoon lighting. Games indoors (Dolphinarium, Butterfly Garden, Ski Dubai) use cooler, softer light.

### `Vox` class usage pattern
```js
const v = new Vox(seed);   // seed for deterministic random colour variation
v.box(x0, y0, z0, x1, y1, z1, '#hexcolor', variation);  // fill a box
v.set(x, y, z, '#hexcolor');                              // single voxel
const mesh = vmesh(v, 1/12);   // 1/12 means each voxel = 1/12 of a world unit
```

---

## Map Style (website home page)

The Dubai map is drawn programmatically on a canvas from real WGS84 coordinates, using the Minecraft top-down map colour style:

| Feature | Colour family |
|---------|--------------|
| Sea | Blues (`#2475BA` → `#3196D2`) |
| Shallow water / beach | Light blue + sand |
| Coastal city (dense) | Light grey + glass blue blocks |
| Suburbs | Warm sand + orange/brown buildings |
| Parks | Greens |
| Desert | Sandy yellows → orange-red dunes toward east |
| Roads | Medium grey with yellow dashes for major routes |
| Creek / canal | Blue-grey |
| Palm Jumeirah | Island sand + frond shapes |
| Airport | Grey apron + dark runways |

Three shades of each colour (hashStr per cell gives the shade index) give the characteristic dithered Minecraft map look.

Decorative pixel sprites appear at key locations (Burj Al Arab as sail, Ain Dubai as wheel, plane at DXB, dhows in the Creek, camels in the desert, palms along the coast).

---

## Animation Principles

- **Bouncing:** pins on the home map use a `bob` CSS animation (translateY 0 → -5px → 0, 1.6s ease-in-out)
- **Pulse:** anything that just got hit / scored / activated pulses via `mesh.scale.setScalar(1 + 0.08 * pulse)` where pulse decays at rate 3/s
- **Screen shake:** `G.shake` → random camera offset, decays at 1/s. Used for boss hits, life lost.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables all CSS animations. Screen shake is also disabled (`REDUCED` flag from media query).

---

## UI/UX Principles

### Home page (desktop wide)
- Map fills the full screen
- Two columns: playable games left, coming-soon list right
- Columns size themselves to fit the screen height (thumbnail shrinks, or cards go row-mode, before falling back to stacked layout)
- Section labels ("PLAY NOW", "COMING SOON") use icon + pixel text — NOT buttons
- Playable game pins: bigger, bouncing, have "PLAY" flag
- Coming-soon pins: smaller, desaturated, have lock icon
- Hover a card or pin → a gold dashed leader line connects them; the other one highlights
- Desktop: leader lines appear only on hover (not permanently, which creates visual clutter)

### Home page (mobile / stacked)
- Map hero at top (scrolls away)
- Full-width game cards with big PLAY button at the bottom
- Coming-soon as a compact 2-column or 4-column grid of small rows

### Game cards
- Screenshot from actual gameplay (not a logo or illustration)
- Stats row: 🏆 TOP SCORE (global best) + number of plays, OR "BE THE FIRST!" if no plays yet
- PLAY button always full-width at the bottom, large enough to tap on mobile

### Loading screen
- Appears instantly (pure CSS, no JS needed)
- Shows game name + attraction name in pixel font
- Five bouncing coloured squares (game's colour + gold alternating)
- Rotating one-liners about Samar or Dubai (one per game set + one shared set)
- Disappears the moment the 3D engine finishes building the scene (no minimum wait)

### In-game HUD
- Top centre: score (large, pixel font)
- Top left: lives (as game-specific icons, e.g. beach balls for Juggle Show, blooms for Fruit Rush)
- Top right: mute button
- Top left (outside safe area): MAP button → returns to home
- Score multiplier badge: appears bottom-left when combo ≥ 8
- Wave label: top centre, below score
- Boss HP bar: top centre, replaces wave bar during boss fight
- Combo popups: float up from the hit point and fade

### Speech bubbles / commentator
- Each game has a commentator character (parrot, budgie, etc.) at a fixed position
- Speech appears as a pixel-art bubble next to the commentator
- Duration: 1.4s typical; shorter for rapid reactions

---

## Audio Design

No audio files. All sound is synthesised with Web Audio API.

Music:
- Square wave lead melody (triangle for fruit-rush, square for juggle-show)
- Bass (sine wave, octave below the scale root)
- Percussion: darbuka pattern `{dum, tek, ka}` — Middle-Eastern feel
- Scale: Hijaz-like (D, Eb, F#, G, A, Bb, C# for desert/spice; diatonic for water/sea)
- Tempo: 126 BPM (fruit-rush), 118 BPM (juggle-show)

SFX palette:
| Sound | Trigger | Description |
|-------|---------|-------------|
| `tone` | fruit tossed | short rising triangle |
| `crack` | boss weak point hit | sharp percussive |
| `clank` | boss body hit (too thick) | metallic reject |
| `horn` | boss arrives | fanfare |
| `burst` | boss defeated | big explosion sound |
| `cheer` | boss defeated | crowd cheer shimmer |
| `fanfare` | boss defeated | celebratory |
| `splash` | fruit/ball hits water | water plop |
| `bloop` | fruit falls offscreen | soft pop |
| `sparkle` | power-up collected | glittery |
| `tweet` | commentator speaks | bird chirp (customised per game) |
