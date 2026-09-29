# ADR-001: Three.js r128 locally hosted

**Status:** Accepted  
**Date:** 2026-09  

## Decision
Host Three.js r128 (`three.min.js`, 603 KB raw, 148 KB brotli) in `src/vendor/` and serve it from Cloudflare Pages with `Cache-Control: immutable` rather than loading from cdnjs or any other CDN.

## Rationale
1. **Offline play.** The service worker can only cache resources from the same origin. A CDN script can't be pre-cached.
2. **Reliability.** No external dependency means no CDN outage breaks the game.
3. **Performance.** Cloudflare edge-serves the file from a location close to the user (Dubai → Cloudflare GRU/DXB), with brotli compression matching or beating the CDN.
4. **Cache stability.** The file hash in the URL (`?v=<hash>`) means the URL only changes if the file changes. Users who have visited once never re-download it.
5. **Simplicity.** No CORS preflight for the SW to deal with.

## Trade-offs
- Manual upgrade required if switching Three.js versions. Not a concern — we intentionally freeze at r128 (a stable, well-tested version) for the lifetime of the current game engine.
- First-visit download is 148 KB brotli. Accepted — it's cached forever after.

## r128-specific constraints
- `CapsuleGeometry` not available (added in r142). Use `CylinderGeometry` + `SphereGeometry`.
- `THREE.CameraHelper` works. `OrbitControls` unavailable as ES module import (use inline or omit).
- `GLTFLoader` available via CDN extra but adds weight — avoid.
