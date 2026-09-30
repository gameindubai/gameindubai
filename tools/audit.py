#!/usr/bin/env python3
"""Performance / resource audit of every live game (engine-agnostic: it watches WebGL calls directly).
Usage:  python3 tools/audit.py [--json out.json] [game-id ...]      (builds nothing; serve ./site first or pass --url)
Measures per game: first-load bytes (shared vs game-only), requests to other servers, boot time,
draw calls per frame, WebGL buffers/textures and JS heap at 8 s, 40 s and 72 s of bot play (steady growth = leak), pixel-ratio cap."""
import argparse, json, sys, time, subprocess, functools, http.server, threading, socket
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))
from conftest import LIVE_IDS, GL_ARGS, serve   # noqa: E402

PROBE = """(() => {
  const P = window.__probe = { calls: 0, frames: 0, buffers: 0, textures: 0, bootAt: null, t0: performance.now() };
  const wrap = (proto) => { if (!proto) return;
    for (const f of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) if (proto[f]) { const o = proto[f]; proto[f] = function(){ P.calls++; return o.apply(this, arguments); }; }
    const cb = proto.createBuffer, db = proto.deleteBuffer, ct = proto.createTexture, dt = proto.deleteTexture;
    proto.createBuffer = function(){ P.buffers++; return cb.apply(this, arguments); }; proto.deleteBuffer = function(){ P.buffers--; return db.apply(this, arguments); };
    proto.createTexture = function(){ P.textures++; return ct.apply(this, arguments); }; proto.deleteTexture = function(){ P.textures--; return dt.apply(this, arguments); }; };
  wrap(window.WebGLRenderingContext && WebGLRenderingContext.prototype); wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  const tick = () => { P.frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  let seen = false; const iv = setInterval(() => { const b = document.getElementById('boot'); if (b) seen = true; else if (seen) { P.bootAt = performance.now() - P.t0; clearInterval(iv); } }, 10);
})();"""


def audit(browser, base, gid):
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3)
    ctx.route('**/api/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    ctx.route('**/*google*/**', lambda r: r.abort())
    pg = ctx.new_page(); pg.add_init_script(PROBE); errs = []; res = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('requestfinished', lambda r: res.append(r))
    cdp = ctx.new_cdp_session(pg); cdp.send('Performance.enable')
    pg.goto(f'{base}/games/{gid}/?debug=1&bot=1&wave=2')
    pg.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=60000)
    boot = pg.evaluate("()=>window.__probe.bootAt")
    shared = own = 0; external = set()
    for r in res:
        try: size = len(r.response().body()) if r.response() else 0
        except Exception: size = 0
        u = r.url
        if not u.startswith(base): external.add(u.split('/')[2]); continue
        path = u[len(base):]
        if path.startswith('/kit/') or path.startswith('/assets/') or path.startswith('/sw.js') or path.startswith('/manifest'): shared += size
        else: own += size
    pg.keyboard.press('Enter'); pg.wait_for_timeout(8000)
    def sample():
        cdp.send('HeapProfiler.collectGarbage')
        m = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
        p = pg.evaluate("()=>({calls:__probe.calls,frames:__probe.frames,buffers:__probe.buffers,textures:__probe.textures})")
        return m['JSHeapUsedSize'] / 1e6, p
    h0, p0 = sample(); pg.wait_for_timeout(32000); h1, p1 = sample(); pg.wait_for_timeout(32000); h2, p2 = sample()
    frames = max(1, p1['frames'] - p0['frames'])
    dpr = pg.evaluate("()=>{ const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0]; return +(c.width/c.clientWidth).toFixed(2); }")
    state = pg.evaluate("()=>[window.__game.G.state, window.__game.G.wave, window.__game.G.score]")
    ctx.close()
    return {'game': gid, 'boot_ms': round(boot or -1), 'bytes_game_only': own, 'bytes_shared': shared, 'external_hosts': sorted(external),
            'draw_calls_per_frame': round((p1['calls'] - p0['calls']) / frames, 1),
            'gl_buffers': [p0['buffers'], p1['buffers'], p2['buffers']], 'gl_textures': [p0['textures'], p1['textures'], p2['textures']],
            'heap_mb': [round(h0, 1), round(h1, 1), round(h2, 1)], 'render_scale_at_dpr3': dpr, 'end_state': state, 'errors': errs[:3]}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('games', nargs='*'); ap.add_argument('--json'); ap.add_argument('--url'); ap.add_argument('--md', help='write a markdown report (e.g. docs/PERF_REPORT.md)')
    a = ap.parse_args(); games = a.games or LIVE_IDS
    httpd = None; base = a.url
    if not base: httpd, base = serve(ROOT / 'site')
    out = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        for g in games:
            r = audit(b, base, g); out.append(r); print(json.dumps(r), flush=True)
        b.close()
    if a.json: Path(a.json).write_text(json.dumps(out, indent=2))
    if a.md:
        import datetime
        rows = ['| Game | Boot (ms, software GL) | Game-only KB | Shared KB | Draw calls / frame | GPU buffers @8/40/72 s | JS heap MB @8/40/72 s | Render scale @3x |',
                '|---|---|---|---|---|---|---|---|']
        for r in out:
            rows.append(f"| {r['game']} | {r['boot_ms']} | {r['bytes_game_only']/1000:.0f} | {r['bytes_shared']/1000:.0f} | {r['draw_calls_per_frame']} | "
                        f"{' / '.join(map(str, r['gl_buffers']))} | {' / '.join(map(str, r['heap_mb']))} | {r['render_scale_at_dpr3']} |")
        Path(a.md).write_text('# Performance report\n\nGenerated by `python3 tools/audit.py --md docs/PERF_REPORT.md` on ' + datetime.date.today().isoformat() +
            ' (headless Chrome, software WebGL, 390x844 @3x, bot playing from wave 2).\nCompare new numbers with these before and after any change; budgets are in `docs/PERFORMANCE.md`.'
            ' Boot times are from software rendering, so compare them relative to each other, not as phone numbers.\n\n' + '\n'.join(rows) + '\n')
    if httpd: httpd.shutdown()
