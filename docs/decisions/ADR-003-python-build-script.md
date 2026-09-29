# ADR-003: Single Python build script (no bundler)

**Status:** Accepted  
**Date:** 2026-09  

## Decision
`build_site.py` handles all build steps: HTML generation, asset copying, font URL versioning, icon rendering, service worker generation, Cloudflare worker generation. No webpack, Vite, Rollup, or esbuild.

## Rationale
1. **Readability.** The build script is 250 lines of plain Python. Any developer can understand it immediately.
2. **No npm dependency chain.** One less thing to go out of date, break, or have security issues.
3. **Control.** HTML templates are written directly in the script — no template language to learn.
4. **Speed.** The build runs in ~2 seconds.
5. **PIL for image processing.** Python + Pillow handles icon generation, card image processing, sticker cutout, font building. No separate image pipeline.

## Trade-offs
- No tree shaking. All of pixel.js and blockkit.js is shipped to every game page. Acceptable — the files are small and cached.
- No TypeScript. Acceptable at this project scale.
- Manual module concatenation (game files). The build script joins src files in declared order. No circular dependency detection.

## Python-only dependencies
- `Pillow`: image processing
- `fonttools` + `brotli`: WOFF2 font building from the pixel font bitmap
