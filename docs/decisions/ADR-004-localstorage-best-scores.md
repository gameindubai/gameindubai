# ADR-004: localStorage for per-device best scores

**Status:** Accepted (global best added via D1)  
**Date:** 2026-09  

## Decision
Each player's personal best score is stored in `localStorage` (keyed by `game-in-dubai:<id>:best`). No account or login. The all-time global best across all players is stored in Cloudflare D1.

## Rationale
1. **No auth.** A kids' game must not require login.
2. **Instant write.** localStorage is synchronous. Score is saved before the game-over animation even starts.
3. **Free.** No server storage needed for per-user data.

## Trade-offs
- Score is device-specific. Playing on a new device starts at 0. Accepted — kids play on one device.
- Safari on iOS clears `localStorage` for PWAs that haven't been opened in ~7 days (when not installed). Mitigated by `navigator.storage.persist()` which we call at game boot (requires granted storage permission, which Chrome gives automatically and Safari grants for installed PWAs).
- No leaderboard (only one global best shown, not per-user). Can be added later with D1.

## Global best (D1)
Added in post-launch update. `POST /api/score {id, score, dur}` keeps the highest score server-side. The title screen shows `TOP SCORE <global>` and `YOUR BEST <local>`.
