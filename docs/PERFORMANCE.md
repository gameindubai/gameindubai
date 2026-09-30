# Performance

Kids play on whatever phone is in the house, often an old one. Every game must stay fast, light and leak-free. Budgets are enforced by `tests/test_perf.py` on every push and every deploy, and the current numbers are in `PERF_REPORT.md`.

## Budgets and why
| Budget | Limit | Why |
|---|---|---|
| Game-only download | ≤ 150 KB | The first tap should feel instant on 4G; shared files are already cached from other games |
| Shared download | ≤ 800 KB | three.js (~600 KB raw, ~130 KB compressed) + kit + font, cached once for the whole site |
| Draw calls / frame | ≤ 150 | Mid-range phones stutter past ~200; each separately drawn object costs one call |
| GPU buffers between identical runs | +≤ 6 | Anything more is a leak: memory grows every run until the tab dies |
| Render scale | ≤ 2× | 3× phones would render 2.25× the pixels for no visible gain |
| Bot survives from wave 2 | ≥ 40 s | Catches difficulty spikes (and physics bugs) that would frustrate young kids |
| Other servers | none (GA allowed) | Privacy, reliability, offline play |

## How it's measured (`tools/audit.py`, shared with the tests)
A probe wraps WebGL itself (`drawElements`/`drawArrays`/instanced variants, `createBuffer`/`deleteBuffer`, `createTexture`/`deleteTexture`), so it measures **any** game, engine or standalone, without hooks. The page runs at 390×844 @3×, so software rendering makes frames deliberately slow, which is also how physics tunnelling was caught.
- **Leaks:** play → game over → play → game over, then compare GPU buffers at the same point. Growth *during* one run is often just first-time uploads of new content (it levels off); growth *between identical runs* is a leak.
- Generate the report: `python3 tools/audit.py --md docs/PERF_REPORT.md` (≈6 min, all games).

## Fixing a failure
| Failure | Usual cause | Fix |
|---|---|---|
| Draw calls | One `Mesh` per block/piece | `InstancedMesh` per material (hide a block by setting its matrix to scale 0), or merge static decoration into one geometry. See Pew Pew Space `BlockRef` (689 → 70 calls) |
| GPU buffer leak | Geometry/InstancedMesh created per spawned object and never disposed | Share geometries (build once, reuse), or `dispose()` when the object leaves (`removeShip` in Pew Pew Space) |
| Texture leak | A canvas texture made per popup/item | Cache by key (see `powerBlockMat`) |
| Game download | Big inline data or images in code | Move images to `src/static/assets` (hashed, cached), generate geometry procedurally |
| Bot dies early | Difficulty spike, or a collision missed on a slow frame | Tune with the bot and read the numbers; use swept collision tests |
| Render scale | Standalone renderer without a pixel-ratio cap | `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` |

## Engine features that keep games fast (use them)
Shared `BOXGEO` + `VOXMAT` (one material for all voxel models), `Particles` (one InstancedMesh for all particles), `powerBlockMat` cache, `blockMat` cache, the watchdog/fallback loop, the DPR cap, and the shared helpers (`stepSwing`, `stepGusts`, `windStreaks`, `screenToPlaneX`, `pickWeighted`).
