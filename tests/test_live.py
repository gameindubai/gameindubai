"""Post-deploy smoke tests against the real site. Read-only (never writes plays or scores).
Run:  pytest -m live        (scripts/deploy.py runs these automatically after deploying)"""
import json, os, re, urllib.request, urllib.error
import pytest
from conftest import LIVE_IDS, LIVE

SITE = os.environ.get('LIVE_URL', 'https://gameindubai.com')
pytestmark = pytest.mark.live
UA = {'User-Agent': 'Mozilla/5.0 (smoke test)'}


def get(url, method='GET', data=None, headers=None):
    req = urllib.request.Request(url, method=method, data=data, headers={**UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=20) as r: return r.status, r.read().decode(), dict(r.headers)
    except urllib.error.HTTPError as e: return e.code, e.read().decode(), dict(e.headers)


def test_pages_up():
    for p in ['/', '/about/', '/sitemap.xml', '/manifest.webmanifest', '/sw.js'] + [f'/games/{g}/' for g in LIVE_IDS]:
        assert get(SITE + p)[0] == 200, p


def test_live_version_matches_this_build(built_site):
    local = re.search(r"gid-[0-9a-f]+", (built_site / 'sw.js').read_text()).group(0)
    assert local in get(SITE + '/sw.js')[1], 'live site is not running this build'


def test_home_lists_every_live_game():
    home = get(SITE + '/')[1]
    for g in LIVE_IDS: assert f'href="games/{g}/"' in home


def test_api_up_and_accepts_every_live_game():
    code, body, _ = get(SITE + '/api/stats'); assert code == 200; json.loads(body)
    for g in LIVE_IDS:   # an invalid score is rejected AFTER the game id is accepted (422, not 400) -> nothing is written
        code, _, _ = get(SITE + '/api/score', 'POST', json.dumps({'id': g, 'score': 0, 'dur': 1}).encode(),
                         {'Content-Type': 'application/json', 'Origin': SITE})
        assert code == 422, f'{g}: play counter does not recognise this game ({code})'


def test_home_shows_stats_in_a_real_browser(browsers):
    ctx = browsers('chromium').new_context(viewport={'width': 1440, 'height': 860})
    ctx.route('**/*google*/**', lambda r: r.abort())
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(SITE + '/'); pg.wait_for_function("()=>[...document.querySelectorAll('.card.live .stats')].every(s=>!s.hidden)", timeout=20000)
    stats = json.loads(get(SITE + '/api/stats')[1])
    shown = pg.evaluate("()=>Object.fromEntries([...document.querySelectorAll('.card.live')].map(c=>{ const p=c.querySelector('.stats .plays'); return [c.dataset.id, p&&!p.hidden&&getComputedStyle(p).display!=='none'?p.innerText:null]; }))")
    for g in LIVE_IDS:
        if stats.get(g, {}).get('plays', 0) > 0:
            assert shown[g] and 'PLAY' in shown[g], f'{g}: play count not visible on the live home page'
    assert not errs, errs
    ctx.close()


def test_redirects():
    import http.client
    c = http.client.HTTPSConnection('www.gameindubai.com', timeout=15); c.request('GET', '/about/', headers=UA); r = c.getresponse()
    assert r.status == 301 and r.getheader('Location') == 'https://gameindubai.com/about/'
