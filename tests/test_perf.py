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
    'leak_buffers': 6,         # GPU buffers gained from run 2 to run 3 (same point in the game): more means a leak
    'leak_textures': 2,
    'render_scale': 2.0,       # never render above 2x on 3x phones
    'survive_s': 40,           # the naive bot must survive this long from wave 2 (kid difficulty smoke test)
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
    pg.wait_for_timeout(3000); a = gl(pg); pg.wait_for_timeout((BUDGET['survive_s'] - 3) * 1000); b = gl(pg)
    calls = (b['calls'] - a['calls']) / max(1, b['frames'] - a['frames'])
    assert calls <= BUDGET['draw_calls'], f'{gid}: {calls:.0f} draw calls per frame > budget {BUDGET["draw_calls"]} (batch blocks: InstancedMesh / merged geometry)'
    st = pg.evaluate("()=>window.__game.G.state")
    assert st in ('play', 'paused'), f'{gid}: the bot lost every life within {BUDGET["survive_s"]} s of wave 2 (too hard for young kids?)'

    end_run(pg); runs = []
    for _ in range(2):   # identical short runs: GPU memory must return to the same level
        pg.keyboard.press('Enter'); pg.wait_for_function("()=>window.__game.G.state==='play'", timeout=15000)
        pg.wait_for_timeout(12000); end_run(pg); runs.append(gl(pg))
    db, dt = runs[1]['buffers'] - runs[0]['buffers'], runs[1]['textures'] - runs[0]['textures']
    assert db <= BUDGET['leak_buffers'], f'{gid}: GPU buffers grew by {db} between identical runs (dispose geometries / InstancedMesh when objects leave)'
    assert dt <= BUDGET['leak_textures'], f'{gid}: textures grew by {dt} between identical runs (cache or dispose textures)'
    assert not errs, errs
    ctx.close()
