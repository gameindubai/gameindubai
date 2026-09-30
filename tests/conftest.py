"""Shared fixtures for the Samar's Game in Dubai test suite.

Every test runs against a FRESH build of ./site served locally, with the play-counter API
mocked (deterministic numbers) and Google Analytics blocked. Run with:  pytest
"""
import functools, http.server, json, socket, subprocess, sys, threading
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]  # WebGL without a GPU (CI)


def load_worlds():
    js = """global.window={}; global.location={search:'',protocol:'file:'}; global.matchMedia=()=>({matches:false});
global.navigator={}; global.document={createElement:()=>({getContext:()=>({})})};
eval(require('fs').readFileSync('src/pixel.js','utf8')+';console.log(JSON.stringify(WORLDS))');"""
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


WORLDS = load_worlds()
LIVE = [w for w in WORLDS if w.get('live')]
SOON = [w for w in WORLDS if not w.get('live')]
LIVE_IDS = [w['id'] for w in LIVE]
ENGINE_IDS = [w['id'] for w in LIVE if w.get('engine') != 'standalone']      # built on blockkit
STANDALONE_IDS = [w['id'] for w in LIVE if w.get('engine') == 'standalone']  # own engine, wrapped by the site shell

# Deterministic stats for the mocked /api/stats: first live game has plays + best, second too,
# every other live game has no plays yet (so "BE THE FIRST!" is exercised).
MOCK_STATS = {}
for i, w in enumerate(LIVE):
    if i == 0: MOCK_STATS[w['id']] = {'plays': 1284, 'best': 2815, 'best_at': 1}
    elif i == 1: MOCK_STATS[w['id']] = {'plays': 9, 'best': 11410, 'best_at': 1}


def fmt(n):
    return f'{n:,}'


@pytest.fixture(scope='session')
def built_site():
    subprocess.run([sys.executable, 'build_site.py'], cwd=ROOT, check=True, capture_output=True)
    return SITE


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(directory):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(_Quiet, directory=str(directory)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f'http://localhost:{port}'   # "localhost" = secure context, so the service worker runs


@pytest.fixture(scope='session')
def base_url(built_site):
    httpd, url = serve(built_site)
    yield url
    httpd.shutdown()


@pytest.fixture(scope='session')
def pw():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope='session')
def browsers(pw):
    opened = {}
    def get(engine):
        if engine not in opened:
            opened[engine] = pw.chromium.launch(args=GL_ARGS) if engine == 'chromium' else getattr(pw, engine).launch()
        return opened[engine]
    yield get
    for b in opened.values():
        b.close()


class Page:
    """A page with the API mocked, analytics blocked, and every error collected."""
    def __init__(self, browser, w, h, dsf=1, stats=None, context=None):
        self.ctx = context or browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf)
        self.page = self.ctx.new_page(); self.errors = []; self.api = []
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        self.page.on('console', lambda m: self.errors.append(f'console: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        body = json.dumps(MOCK_STATS if stats is None else stats)
        self.ctx.route('**/api/stats', lambda r: r.fulfill(status=200, content_type='application/json', body=body))
        self.ctx.route('**/api/plays', lambda r: (self.api.append(('plays', r.request.post_data)), r.fulfill(status=200, body='{"ok":true}')))
        self.ctx.route('**/api/score', lambda r: (self.api.append(('score', r.request.post_data)), r.fulfill(status=200, body='{"ok":true}')))
        self.ctx.route('**/*googletagmanager.com/**', lambda r: r.abort())
        self.ctx.route('**/*google-analytics.com/**', lambda r: r.abort())
        # record sendBeacon payloads (Playwright can't read beacon bodies)
        self.page.add_init_script("""window.__beacons=[]; if(navigator.sendBeacon){ const o=navigator.sendBeacon.bind(navigator);
          navigator.sendBeacon=(u,d)=>{ try{ if(d&&d.text) d.text().then(t=>window.__beacons.push([String(u),t])); else window.__beacons.push([String(u),String(d)]); }catch(e){} return o(u,d); }; }""")

    def close(self):
        self.ctx.close()


@pytest.fixture
def make_page(browsers):
    made = []
    def make(engine='chromium', w=390, h=844, dsf=1, stats=None):
        p = Page(browsers(engine), w, h, dsf, stats); made.append(p); return p
    yield make
    for p in made:
        p.close()
