"""Installable app + offline play + "a new deploy reaches players on their first reload"."""
import os, shutil, subprocess, sys, tempfile
from pathlib import Path
import pytest
from conftest import ROOT, LIVE_IDS, serve, GL_ARGS


def test_installable_and_offline(browsers, base_url):
    ctx = browsers('chromium').new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/api/**', lambda r: r.fulfill(status=200, body='{}')); ctx.route('**/*google*/**', lambda r: r.abort())
    pg = ctx.new_page(); pg.goto(base_url + '/')
    pg.wait_for_function("()=>navigator.serviceWorker.controller!==null", timeout=20000)
    assert ctx.new_cdp_session(pg).send('Page.getInstallabilityErrors')['installabilityErrors'] == []
    pg.wait_for_timeout(2000)
    ctx.set_offline(True)
    for path in ['/', '/about/'] + [f'/games/{g}/' for g in LIVE_IDS]:
        pg.goto(base_url + path, wait_until='domcontentloaded')
        if path.startswith('/games/'):
            pg.wait_for_function("()=>!document.getElementById('boot')&&!!window.THREE", timeout=45000)
        else:
            assert pg.title(), f'{path} did not load offline'
    ctx.close()


def test_new_deploy_arrives_on_first_reload(browsers, tmp_path):
    """Build a copy, load it, 'deploy' a change, reload ONCE: the new game code must be served."""
    work = tmp_path / 'repo'
    top_level_skip = {'site', '.git', 'node_modules', 'tests'}          # only the TOP-level build output: src/site must be copied
    shutil.copytree(ROOT, work, ignore=lambda d, names: [n for n in names if (Path(d) == ROOT and n in top_level_skip) or n == '__pycache__'])
    def build(mark):
        subprocess.run([sys.executable, 'build_site.py'], cwd=work, check=True, capture_output=True, env=dict(os.environ, BUILD_MARK=mark))
    build('')
    httpd, url = serve(work / 'site')
    try:
        g = LIVE_IDS[0]
        ctx = browsers('chromium').new_context(); ctx.route('**/*google*/**', lambda r: r.abort()); ctx.route('**/api/**', lambda r: r.fulfill(status=200, body='{}'))
        pg = ctx.new_page(); pg.goto(f'{url}/games/{g}/', wait_until='domcontentloaded')
        pg.wait_for_function("()=>navigator.serviceWorker.controller!==null", timeout=20000)
        served = lambda: pg.evaluate("()=>{const s=[...document.scripts].map(s=>s.src).find(s=>s.includes('world.js')); return s.split('v=')[1]}")
        before = served()
        build('\n// deploy marker')
        new = (work / 'site' / 'games' / g / 'index.html').read_text().split('world.js?v=')[1][:8]
        assert new != before
        pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(1500)
        assert served() == new, 'a new deploy did not reach the player on the first reload'
        ctx.close()
    finally:
        httpd.shutdown()
