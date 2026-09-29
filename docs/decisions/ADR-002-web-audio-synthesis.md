# ADR-002: Web Audio API synthesis instead of audio files

**Status:** Accepted  
**Date:** 2026-09  

## Decision
All game audio (music + SFX) is synthesised in real-time using the Web Audio API. No `.mp3`, `.ogg`, or `.wav` files are used.

## Rationale
1. **Zero download.** Audio files for a game of this scope would be 2–5 MB. Synthesis is 0 bytes.
2. **Offline-first.** Works immediately on first visit with no audio download.
3. **Procedural variation.** Synthesised audio can be varied parametrically (different pitches for different ball types, etc.) without additional files.
4. **Fits the aesthetic.** Chiptune / synthesised audio matches the voxel visual style perfectly.

## Trade-offs
- Less realistic sound than samples. Accepted — the abstract sound design is intentional.
- Web Audio API requires a user gesture on iOS before creating an AudioContext. Handled by initialising on first `pointerdown`.
- iOS can close the AudioContext after backgrounding. Handled by checking `ctx.state === 'closed'` and recreating.

## Music Structure
`music: { tempo, lead, leadVol, scale[], mel[], bass[], dum[], tek[], ka[] }`
- `mel[]`: melody indices into scale, -1 = rest, 8 beats per bar
- `bass[]`: direct frequencies for bass line (loops)
- `dum/tek/ka[]`: beat positions for darbuka percussion pattern
