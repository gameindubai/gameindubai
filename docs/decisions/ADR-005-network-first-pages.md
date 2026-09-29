# ADR-005: Network-first service worker strategy for HTML pages

**Status:** Accepted (fixed after initial cache-first bug)  
**Date:** 2026-09  

## What happened initially
The first service worker used cache-first for all pages (instantaneous load). After a deploy fixing a game-breaking bug (the dome 5 freeze), affected users couldn't get the fix because:
1. Their SW was serving the old `index.html` from cache
2. The old `index.html` referenced old versioned assets (also cached)
3. The new sw.js was waiting to install but needed the page to navigate away and back

Users on the broken version had to switch to another tab/app and return — they couldn't figure this out from the game itself.

## Current strategy

**HTML pages (navigate requests):** Network-first with 1.8s timeout
- If online: fetch fresh from network, save to cache, return network response (user always gets latest)
- If offline or slow: fall back to cached version

**Versioned assets (`?v=<hash>`):** Cache-first (immutable)
- Hash in URL ensures cache is busted when content changes
- One download, then served from device forever

**Service worker update trigger:** `registration.update()` on every page load + on visibility change (return from background)
- The browser fetches sw.js on every load, diff it against the installed version, install/activate new one immediately
- This means: deploy a fix → user's next page load → new SW installs → next reload → new HTML → fix arrives

## Trade-offs
- HTML pages require a network round-trip on every load. Mitigated by Cloudflare's edge CDN (Dubai PoP) — round-trip is ~20ms typically.
- First offline load is slower (waits 1.8s for timeout). Acceptable — users who've never visited before can't play offline anyway.
