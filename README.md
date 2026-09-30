# Samar's Game in Dubai 🎮

[![CI](https://github.com/gameindubai/gameindubai/actions/workflows/ci.yml/badge.svg)](https://github.com/gameindubai/gameindubai/actions/workflows/ci.yml)

**Live site:** https://gameindubai.com  
**Credited to:** Samar (age 8, 3rd grade, Dubai) — created by his father Nihal  
**Status:** 5 games live · 5 coming soon · installable PWA

A series of free, kid-friendly block games (voxel/Minecraft aesthetic, original) set at real Dubai attractions — each game is a different micro-mechanic tied to a specific location. The website is a pixel-art map of Dubai with pins at each attraction.

---

## What's Built

| # | Game | Location | Status |
|---|------|----------|--------|
| 1 | Juggle Show | Dubai Dolphinarium | ✅ Live |
| 2 | Fruit Rush | Dubai Butterfly Garden | ✅ Live |
| 3 | Shine Crew | Burj Khalifa | ✅ Live |
| 4 | Frame Builder | Dubai Frame | ✅ Live |
| 5 | Fountain Conductor | Dubai Fountain | 🔒 Soon |
| 6 | Pew Pew Space | Museum of the Future | ✅ Live |
| 7 | Camera Flyer | Skydive Dubai | 🔒 Soon |
| 8 | Penguin March | Ski Dubai | 🔒 Soon |
| 9 | Falcon Strike | Dubai Desert | 🔒 Soon |
| 10 | Cheetah Run | Dubai Safari Park | 🔒 Soon |

---

## Quick Start

```bash
# Prerequisites: Python 3.10+, Node.js (for syntax checks only)
pip install Pillow fonttools brotli --break-system-packages

# Build the site into ./site/
python3 build_site.py

# Local dev server
cd site && python3 -m http.server 8765
# → http://localhost:8765
```

**Test** (required before any deploy):
```bash
pip install -r requirements-dev.txt && python -m playwright install --with-deps chromium webkit
python -m pytest
```

**Deploy** (builds, runs every test, deploys only if all pass, then checks the live site):
```bash
export CLOUDFLARE_API_TOKEN=... && python3 scripts/deploy.py
```
CI runs the same suite on every push (see the Actions tab). See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full Cloudflare setup including D1 database binding.

---

## Repository Layout

```
src/
  pixel.js              # Layer 1: palette, pixel font, sprites, WORLDS registry, Track helper
  blockkit.js           # Layer 2: Three.js game engine (audio, input, HUD, scoring, lives)
  juggle-show.world.js  # Game 1 scene (Three.js geometry)
  juggle-show.rules.js  # Game 1 logic (seal, balls, waves, boss)
  fruit-rush.1.js       # Game 2 geometry + species definitions
  fruit-rush.2.js       # Game 2 butterfly system
  fruit-rush.3.js       # Game 2 logic (blade, fruit, waves, boss)
  shine-crew.world.js   # Game 3 scene (Burj facade, gondola, crusts, sky + city backdrop)
  shine-crew.rules.js   # Game 3 logic (pendulum gondola, auto-spray, sandstorm boss)
  frame-builder.world.js / .rules.js   # Game 4 (crane pendulum, beat drops, Stack-style trimming, sky-bridge boss)
  pew-pew-space/        # Game 6: a standalone game (own engine) adopted from kidzee.games; the build wraps it in the site shell
  site/
    site.css            # Website stylesheet
    site.js             # Website script (map, logo, pins, cards, PWA, stats)
  vendor/
    three.min.js        # Three.js r128 (self-hosted for cache + offline)
  static/
    assets/             # Pre-built binary assets (font, sticker, card images, og.png)

build_site.py           # Single build script → generates ./site/ entirely from ./src/
tests/                  # Test suite (pytest + Playwright): build, home, about, games, PWA, API, live
scripts/deploy.py       # The only deploy path: build → tests → deploy → live smoke tests
.github/workflows/ci.yml  # CI: tests on every push; test-gated auto-deploy on main
docs/                   # All documentation (read this before adding a new game)
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| 3D rendering | Three.js r128 (self-hosted) | Stable, offline-capable, 1-year cache |
| Audio | Web Audio API (synth) | Zero download, offline, fits pixel aesthetic |
| Website map | Procedural canvas (real lat/lng) | No raster download, responsive, updateable |
| Font | Custom WOFF2 (1.4 KB) built from pixel font | Matches game, tiny |
| Hosting | Cloudflare Pages (free) | Global CDN, Workers, D1 on free tier |
| Database | Cloudflare D1 (SQLite at edge) | Play counts + global top scores |
| Analytics | Google Analytics 4 | game_start / game_over / exception events |
| PWA | Service worker (network-first pages) | Installable, offline play, instant updates |
| Build | Python 3 (no bundler) | Simple, readable, no npm dependency chain |

---

## Documentation Index

| Document | Contents |
|----------|----------|
| [`CLAUDE.md`](CLAUDE.md) | **Start here, every session**: rules, budgets, "if you touch X watch Y", definition of done |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) | Performance budgets, how they're measured, how to fix failures |
| [`docs/PERF_REPORT.md`](docs/PERF_REPORT.md) | Current per-game performance numbers (baseline) |
| [`docs/CONCEPTS.md`](docs/CONCEPTS.md) | **Source of truth:** the 10 agreed game concepts + the rules every game follows |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Full system architecture and data flow |
| [`docs/DESIGN_LANGUAGE.md`](docs/DESIGN_LANGUAGE.md) | Visual system, palette, typography, UX rules |
| [`docs/GAME_ENGINE.md`](docs/GAME_ENGINE.md) | blockkit.js + pixel.js API reference |
| [`docs/WORLDS_REGISTRY.md`](docs/WORLDS_REGISTRY.md) | All 10 worlds, coordinates, icons |
| [`docs/NEXT_GAMES.md`](docs/NEXT_GAMES.md) | Briefs for games 4–10, the proven build workflow, AI-credit tips |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Build → Cloudflare Pages → domain → D1 |
| [`docs/ANALYTICS.md`](docs/ANALYTICS.md) | GA4 custom dimensions and event taxonomy |
| [`docs/COMMON_MISTAKES.md`](docs/COMMON_MISTAKES.md) | Every bug we hit and how to avoid it |
| [`docs/TESTING.md`](docs/TESTING.md) | How to test games, the site, and deploys |
| [`docs/games/juggle-show.md`](docs/games/juggle-show.md) | Full spec for Juggle Show |
| [`docs/games/fruit-rush.md`](docs/games/fruit-rush.md) | Full spec for Fruit Rush |
| [`docs/games/shine-crew.md`](docs/games/shine-crew.md) | Full spec for Shine Crew |
| [`docs/games/frame-builder.md`](docs/games/frame-builder.md) | Full spec for Frame Builder |
| [`docs/games/pew-pew-space.md`](docs/games/pew-pew-space.md) | Pew Pew Space: what it is, what changed, how it's wired in |
| [`docs/decisions/`](docs/decisions/) | Architecture Decision Records (ADRs) |
