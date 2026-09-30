"""One look, one feel, shared code. Guards the design language and code sharing across ALL games."""
import re, collections
from pathlib import Path
import pytest
from conftest import ROOT, LIVE, LIVE_IDS, ENGINE_IDS, STANDALONE_IDS

HOOK_NAMES = {'layout', 'beginWave', 'waveClear', 'startBoss', 'bossWin', 'clearAll', 'activatePower', 'pickPower', 'botTick',
              'screenToWorldX', 'updateWind'}   # per-game hooks with the same name are expected; everything else is shared code


def game_sources():
    out = collections.defaultdict(str)
    for f in (ROOT / 'src').glob('*.js'):
        if f.name not in ('pixel.js', 'blockkit.js'): out[f.name.split('.')[0]] += f.read_text(encoding='utf-8') + '\n'
    return out


def test_no_helper_is_copied_between_games():
    """If two games need the same function, it belongs in blockkit.js (Shared gameplay helpers)."""
    src = game_sources(); names = collections.defaultdict(set); bodies = collections.defaultdict(set)
    for g, text in src.items():
        for m in re.finditer(r'(?m)^function ([A-Za-z_]\w*)\(([^)]*)\)\s*\{', text):
            names[m.group(1)].add(g)
            body = text[m.end():m.end() + 400]
            if len(body) >= 200: bodies[re.sub(r'\s+', '', body)].add(g)
    dup_names = {n: sorted(gs) for n, gs in names.items() if len(gs) > 1 and n not in HOOK_NAMES}
    assert not dup_names, f'defined in several games, move to blockkit.js: {dup_names}'
    dup_bodies = [sorted(gs) for gs in bodies.values() if len(gs) > 1]
    assert not dup_bodies, f'identical function bodies in several games (copy-paste), share them: {dup_bodies}'


@pytest.mark.parametrize('gid', ENGINE_IDS)
def test_engine_games_use_unlit_materials(make_page, base_url, gid):
    """No lights exist in engine scenes: Lambert/Phong/Standard materials render BLACK."""
    p = make_page('chromium', 390, 844); p.page.goto(f'{base_url}/games/{gid}/?debug=1')
    p.page.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=45000)
    lit = p.page.evaluate("""()=>{ const bad=new Set(); scene.traverse(o=>{ const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
        ms.forEach(m=>{ if(/Lambert|Phong|Standard|Physical|Toon/.test(m.type)) bad.add(m.type); }); }); return [...bad]; }""")
    assert not lit, f'{gid}: lit materials in an unlit engine scene: {lit}'


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_every_game_pauses_when_the_app_is_hidden(make_page, base_url, gid):
    """Phones background apps constantly (calls, app switch): the game must pause itself, not keep playing or die."""
    p = make_page('chromium', 390, 844); p.page.goto(f'{base_url}/games/{gid}/?debug=1')
    p.page.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=45000)
    p.page.keyboard.press('Enter'); p.page.wait_for_function("()=>window.__game.G.state==='play'", timeout=15000)
    p.page.evaluate("()=>{ Object.defineProperty(document,'hidden',{value:true,configurable:true}); Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); }")
    p.page.wait_for_timeout(400)
    assert p.page.evaluate("()=>window.__game.G.state") == 'paused', f'{gid}: did not pause when the app was hidden'


@pytest.mark.parametrize('gid', STANDALONE_IDS)
def test_standalone_game_follows_the_design_language(make_page, base_url, gid):
    """Standalone games keep their own engine but must look and behave like the rest (docs/DESIGN_LANGUAGE.md)."""
    w = next(x for x in LIVE if x['id'] == gid)
    p = make_page('chromium', 390, 844); p.page.goto(f'{base_url}/games/{gid}/?debug=1')
    p.page.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=45000)
    r = p.page.evaluate("""()=>{ const q=s=>document.querySelector(s), cs=(s,k)=>q(s)?getComputedStyle(q(s))[k]:null;
      return {map:q('.screen .home')&&q('.screen .home').getAttribute('href'), chip:q('.chip')&&q('.chip').innerText.trim(), place:q('.place')&&q('.place').innerText.trim(),
        pause:!!q('#pauseBtn'), mute:!!q('#mute'), scoreFont:cs('#score','fontFamily'), btnBg:cs('.btn','backgroundColor'), btnFont:cs('.btn','fontFamily')}; }""")
    assert r['map'] == '../../', 'needs a MAP button back to the home map'
    assert r['chip'] == f"WORLD {w['n']}", f"title needs the 'WORLD {w['n']}' chip, got {r['chip']!r}"
    assert r['place'] == w['place'].upper(), f"title needs the place name {w['place'].upper()!r}, got {r['place']!r}"
    assert r['pause'] and r['mute'], 'HUD needs a pause button (top-left) and a sound button (top-right)'
    assert 'Samar Blocks' in r['scoreFont'] and 'Samar Blocks' in r['btnFont'], 'score and buttons must use the Samar Blocks pixel font'
    assert r['btnBg'] == 'rgb(244, 183, 49)', f"primary buttons must be gold #F4B731, got {r['btnBg']}"
    p.page.keyboard.press('Enter'); p.page.wait_for_function("()=>window.__game.G.state==='play'", timeout=15000)
    p.page.click('#pauseBtn'); p.page.wait_for_timeout(300)
    assert p.page.evaluate("()=>window.__game.G.state") == 'paused'
    t0 = p.page.evaluate("()=>window.__game.G.t"); p.page.wait_for_timeout(800)
    assert p.page.evaluate("()=>window.__game.G.t") == t0, 'game clock must stop while paused'
    assert not p.errors, p.errors


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_every_game_uses_the_shared_kit(built_site, gid):
    """One copy of three.js for the whole site (cached once), shared pixel kit, no CDN copies."""
    page = (built_site / 'games' / gid / 'index.html').read_text()
    threes = re.findall(r'src="[^"]*three[^"]*\.js[^"]*"', page)
    assert len(threes) == 1 and '/kit/three.min.js?v=' in threes[0], f'{gid}: must load the shared kit/three.min.js exactly once, found {threes}'
    assert 'kit/pixel.js?v=' in page, f'{gid}: must load the shared kit/pixel.js'
    if gid in ENGINE_IDS: assert 'kit/blockkit.js?v=' in page


@pytest.mark.parametrize('gid', ENGINE_IDS)
def test_engine_games_declare_powers_for_prewarm(make_page, base_url, gid):
    """The engine uploads every load-time geometry and each declared power-up texture before the first frame
    (no first-appearance hitch; keeps the GPU leak test honest). Games must declare GAMEDEF.powers."""
    p = make_page('chromium', 390, 844); p.page.goto(f'{base_url}/games/{gid}/?debug=1')
    p.page.wait_for_function("()=>!document.getElementById('boot')&&!!window.__game", timeout=45000)
    n = p.page.evaluate("()=>{ const P=window.__game.GAME.powers; return P?Object.values(P).filter(x=>x&&x.icon&&x.bg).length:0; }")
    assert n >= 1, f'{gid}: declare powers:POW (each entry with icon + bg) in the game object'
    assert p.page.evaluate("()=>GEO_PREWARMED===true"), f'{gid}: geometry pre-warm did not run'
