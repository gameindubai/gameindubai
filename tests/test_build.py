"""Static checks on the generated ./site (no browser). Fast; run first."""
import hashlib, json, re, shutil, subprocess, tempfile
from pathlib import Path
import pytest
from conftest import ROOT, LIVE, SOON, LIVE_IDS, ENGINE_IDS, STANDALONE_IDS

GA_ID = 'G-1BHJTF5SVL'


def html_pages(site):
    return [site / 'index.html', site / 'about' / 'index.html', site / '404.html'] + [site / 'games' / g / 'index.html' for g in LIVE_IDS]


def test_every_live_game_is_built(built_site):
    for g in LIVE_IDS:
        assert (built_site / 'games' / g / 'index.html').is_file(), f'{g}: page missing'
        if g in ENGINE_IDS:
            assert (built_site / 'games' / g / 'world.js').stat().st_size > 5000, f'{g}: world.js missing/empty'
        else:
            page = (built_site / 'games' / g / 'index.html').read_text()
            assert 'GID:' not in page, f'{g}: site-shell placeholder left unfilled'
            assert 'id="boot"' in page and 'Track.play(' in page and 'Track.score(' in page, f'{g}: splash or play/score reporting missing'
            assert 'cdnjs.cloudflare.com' not in page, f'{g}: must use the shared self-hosted three.js'
        assert (ROOT / 'src' / 'static' / 'assets' / 'cards' / f'{g}.webp').is_file(), f'{g}: card image missing'


def test_home_and_about_list_the_right_games(built_site):
    home = (built_site / 'index.html').read_text()
    for g in LIVE_IDS:
        assert f'href="games/{g}/"' in home, f'{g}: no card link on home'
        assert f'data-id="{g}"' in home
    assert home.count('class="soon-row"') == len(SOON)
    about = (built_site / 'about' / 'index.html').read_text()
    assert about.count('class="card panel live"') == len(LIVE)
    assert f'<span class="v px">{len(LIVE)}</span>' in about, 'About "GAMES MADE" count is wrong'


def test_analytics_on_every_page(built_site):
    for f in html_pages(built_site):
        t = f.read_text()
        assert f'googletagmanager.com/gtag/js?id={GA_ID}' in t, f'{f}: GA tag missing'
        assert 'allow_ad_personalization_signals: false' in t, f'{f}: ad signals not disabled (kids site)'


def test_versioned_links_resolve_and_match(built_site):
    for f in html_pages(built_site):
        for url in re.findall(r'(?:src|href)="([^"]+\?v=[0-9a-f]{8})"', f.read_text()):
            path, v = url.split('?v=')
            target = (built_site / path.lstrip('/')) if path.startswith('/') else (f.parent / path).resolve()
            assert target.is_file(), f'{f.name}: {url} points to a missing file'
            assert hashlib.md5(target.read_bytes()).hexdigest()[:8] == v, f'{f.name}: {url} has a stale version hash'


def test_sitemap_manifest_and_service_worker(built_site):
    sm = (built_site / 'sitemap.xml').read_text()
    for g in LIVE_IDS:
        assert f'https://gameindubai.com/games/{g}/' in sm
    man = json.loads((built_site / 'manifest.webmanifest').read_text())
    assert man['start_url'] and man['display'] == 'standalone'
    for ic in man['icons']:
        assert (built_site / ic['src'].split('?')[0].lstrip('/')).is_file(), f'manifest icon missing: {ic["src"]}'
    sw = (built_site / 'sw.js').read_text()
    core = json.loads(re.search(r'CORE=(\[.*?\]);', sw).group(1))
    for g in LIVE_IDS:
        assert f'/games/{g}/' in core, f'{g} page not precached for offline'
        if g in ENGINE_IDS:
            assert any(c.startswith(f'/games/{g}/world.js?v=') for c in core), f'{g} code not precached for offline'
    for c in core:
        assert c.endswith('/') or (built_site / c.split('?')[0].lstrip('/')).is_file(), f'precached file missing: {c}'


def test_play_counter_allowlist_and_routes(built_site):
    wk = (built_site / '_worker.js').read_text()
    allowed = json.loads(re.search(r'new Set\((\[.*?\])\)', wk).group(1))
    assert sorted(allowed) == sorted(LIVE_IDS), f'worker allowlist {allowed} != live games {LIVE_IDS}'
    assert json.loads((built_site / '_routes.json').read_text())['include'] == ['/api/*']
    hd = (built_site / '_headers').read_text()
    assert '/kit/*' in hd and 'immutable' in hd and '/sw.js' in hd


def test_all_javascript_parses(built_site):
    files = sorted((ROOT / 'src').glob('*.js')) + [ROOT / 'src/site/site.js', built_site / 'sw.js'] + [built_site / 'games' / g / 'world.js' for g in ENGINE_IDS]
    for g in STANDALONE_IDS:   # standalone games: check every inline script of the built page
        for i, code in enumerate(re.findall(r'<script>(.*?)</script>', (built_site / 'games' / g / 'index.html').read_text(), re.S)):
            f = Path(tempfile.gettempdir()) / f'{g}-inline-{i}.js'; f.write_text(code); files.append(f)
    for f in files:
        r = subprocess.run(['node', '--check', str(f)], capture_output=True, text=True)
        assert r.returncode == 0, f'{f}: {r.stderr[:300]}'
    with tempfile.TemporaryDirectory() as d:   # the worker is an ES module
        m = Path(d) / 'w.mjs'; shutil.copy(built_site / '_worker.js', m)
        r = subprocess.run(['node', '--check', str(m)], capture_output=True, text=True)
        assert r.returncode == 0, r.stderr[:300]


def test_css_classes_are_not_shared_between_pages():
    """Two different components once shared the class .stats; the later rule silently broke the
    game cards. Every top-level class selector in site.css must be defined in one block only,
    unless it is deliberately repeated inside a media query or with a state/modifier."""
    css = (ROOT / 'src/site/site.css').read_text()
    css_top = re.sub(r'@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css)          # ignore media-query blocks
    seen = {}
    for sel in re.findall(r'(?:^|\})\s*([^{}@]+)\{', css_top):
        for s in sel.split(','):
            s = s.strip()
            if re.fullmatch(r'\.[a-z][a-z0-9-]*', s):
                seen[s] = seen.get(s, 0) + 1
    dupes = {k: n for k, n in seen.items() if n > 1}
    assert not dupes, f'class selectors defined more than once at top level (possible collision): {dupes}'


def test_ci_workflow_is_valid_yaml():
    """A YAML error makes GitHub skip CI entirely (it happened once: 'secret: tests' in a one-line run:)."""
    yaml = pytest.importorskip('yaml')
    for f in (ROOT / '.github' / 'workflows').glob('*.yml'):
        wf = yaml.safe_load(f.read_text())
        assert 'jobs' in wf and 'test' in wf['jobs'], f'{f.name}: missing test job'
        needs = wf['jobs']['deploy']['needs']; needs = [needs] if isinstance(needs, str) else needs
        assert 'test' in needs and 'perf' in needs, 'deploy must wait for the functional tests AND the performance budgets'
