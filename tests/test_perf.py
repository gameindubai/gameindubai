"""Performance budgets for EVERY live game (engine or standalone). A new game that is too heavy,
leaks GPU memory, draws too much, or is too hard for the bot fails here, before it can ship.
Budgets live in BUDGET below and are explained in docs/PERFORMANCE.md. Slow (~80 s per game): marker 'perf'."""
import sys
from pathlib import Path
import pytest
from conftest import LIVE_IDS, ROOT
sys.path.insert(0, str(ROOT / 'tools'))
from audit import PROBE   # noqa: E402  (the same WebGL probe the audit tool uses)

BUDGET = {
    'game_bytes': 150_000,     # game-only download (uncompressed), first visit
    'shared_bytes': 800_000,   # three.js + kit + font etc. (cached once for all games)
    'draw_calls': 150,         # average WebGL draw calls per frame during play (phones start to struggle past ~200)
    'leak_runs': 3,            # identical runs compared at the same point (game over)
    'leak_game_s': 15,         # each run lasts this much GAME time, so objects really spawn and die (wall time lies on slow machines)
    'leak_buffers_total': 60,  # sanity cap only: the real leak signature is growth in EVERY run (new content steps up once, then plateaus)
    'leak_textures_total': 8,
    'render_scale': 2.0,       # never render above 2x on 3x phones
    'survive_game_s': 30,      # the naive bot must survive this much GAME time from wave 2 (kid difficulty smoke test; wall time depends on the machine)
}
pytestmark = pytest.mark.perf


def gl(pg): return pg.evaluate("()=>({calls:__probe.calls,frames:__probe.frames,buffers:__probe.buffers,textures:__probe.textures})")


def end_run(pg):
    pg.evaluate("()=>{ const g=window.__game; for(let i=0;i<9;i++){ g.G.grace=0; g.loseLife(); } }")
    pg.wait_for_function("()=>window.__game.G.state==='over'", timeout=30000); pg.wait_for_timeout(1500)


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_performance_budget(browsers, base_url, gid):
    ctx = browsers('chromium').new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3)
    ctx.route('**/api/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    ctx.route('**/*google*/**', lambda r: r.abort())
    pg = ctx.new_page(); pg.add_init_script(PROBE); res = []; errs = []
    pg.on('requestfinished', lambda r: res.append(r)); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'{base_url}/games/{gid}/?debug=1&bot=1&wave=2')
    pg.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=60000)
    own = shared = 0; hosts = set()
    for r in res:
        if not r.url.startswith(base_url): hosts.add(r.url.split('/')[2]); continue
        try: n = len(r.response().body())
        except Exception: n = 0
        p = r.url[len(base_url):]
        if p.startswith(('/kit/', '/assets/', '/sw.js', '/manifest')): shared += n
        else: own += n
    assert not hosts, f'{gid}: requests to other servers {hosts}'
    assert own <= BUDGET['game_bytes'], f'{gid}: game download {own:,} B > budget {BUDGET["game_bytes"]:,} B'
    assert shared <= BUDGET['shared_bytes'], f'{gid}: shared download {shared:,} B > budget'
    scale = pg.evaluate("()=>{ const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0]; return c.width/c.clientWidth; }")
    assert scale <= BUDGET['render_scale'] + 0.01, f'{gid}: renders at {scale:.2f}x on a 3x phone (cap is 2x)'

    pg.keyboard.press('Enter'); pg.wait_for_function("()=>window.__game.G.state==='play'", timeout=15000)
    pg.wait_for_timeout(3000); a = gl(pg); t0 = pg.evaluate("()=>window.__game.G.t")
    pg.wait_for_function(f"()=>window.__game.G.t>={t0 + BUDGET['survive_game_s']}||!['play','paused'].includes(window.__game.G.state)", timeout=240000); b = gl(pg)
    calls = (b['calls'] - a['calls']) / max(1, b['frames'] - a['frames'])
    assert calls <= BUDGET['draw_calls'], f'{gid}: {calls:.0f} draw calls per frame > budget {BUDGET["draw_calls"]} (batch blocks: InstancedMesh / merged geometry)'
    st = pg.evaluate("()=>window.__game.G.state")
    assert st in ('play', 'paused'), f'{gid}: the bot lost every life within {BUDGET["survive_game_s"]} s of game time from wave 2 (too hard for young kids?)'

    assert not errs, errs
    ctx.close()


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_no_gpu_leak_across_runs(browsers, base_url, gid):
    """Games unlock NEW content as you play (a new butterfly = new geometry, uploaded once), so GPU memory can step up
    now and then and plateau. A real leak grows in EVERY run. Runs are measured in GAME time at normal resolution so
    objects really spawn and die (a first version used 8 s of wall time at 3x: no enemy ever spawned and a real leak passed)."""
    ctx = browsers('chromium').new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    ctx.route('**/api/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    ctx.route('**/*google*/**', lambda r: r.abort())
    pg = ctx.new_page(); pg.add_init_script(PROBE)
    pg.goto(f'{base_url}/games/{gid}/?debug=1&bot=1&wave=2')
    pg.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=60000)
    runs = []
    for _ in range(BUDGET['leak_runs']):
        pg.keyboard.press('Enter'); pg.wait_for_function("()=>window.__game.G.state==='play'", timeout=15000)
        t0 = pg.evaluate("()=>window.__game.G.t")
        pg.wait_for_function(f"()=>window.__game.G.t>={t0 + BUDGET['leak_game_s']}||window.__game.G.state==='over'", timeout=90000)
        if pg.evaluate("()=>window.__game.G.state") != 'over': end_run(pg)
        else: pg.wait_for_timeout(1500)
        runs.append(gl(pg))
    for k, total in (('buffers', BUDGET['leak_buffers_total']), ('textures', BUDGET['leak_textures_total'])):
        seq = [r[k] for r in runs]; steps = [b - a for a, b in zip(seq, seq[1:])]
        assert not all(s > 0 for s in steps), f'{gid}: GPU {k} grew in every one of {len(steps)} identical runs {seq}: a leak (dispose per-object geometry / InstancedMesh / textures)'
        assert seq[-1] - seq[0] <= total, f'{gid}: GPU {k} grew by {seq[-1]-seq[0]} across {len(steps)} identical runs {seq} (budget {total})'
    ctx.close()
