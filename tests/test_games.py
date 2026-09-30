"""Every live game, in Chrome with software WebGL (works on CI without a GPU).
New games are covered automatically once they are live in WORLDS."""
import json
import pytest
from conftest import LIVE_IDS

BOOT = "()=>!document.getElementById('boot')&&!!window.__game"


def boot(make_page, base_url, gid, query='debug=1', w=390, h=844):
    p = make_page('chromium', w, h)
    p.page.goto(f'{base_url}/games/{gid}/?{query}')
    p.page.wait_for_function(BOOT, timeout=45000)
    return p


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_boots_to_title_without_errors(make_page, base_url, gid):
    p = boot(make_page, base_url, gid)
    assert p.page.evaluate("()=>window.__game.G.state") == 'title'
    assert p.page.evaluate("()=>window.__game.GAME.meta.id") == gid
    p.page.wait_for_timeout(1500)
    assert not p.errors, p.errors


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_play_count_score_and_analytics(make_page, base_url, gid):
    """Starting a run must count a play for THIS game; ending it must submit the score and send GA events."""
    p = boot(make_page, base_url, gid)
    p.page.keyboard.press('Enter')
    p.page.wait_for_function("()=>window.__game.G.state==='play'", timeout=10000)
    p.page.wait_for_function("()=>window.__beacons.some(b=>b[0].endsWith('/api/plays'))", timeout=10000)
    plays = [json.loads(b) for u, b in p.page.evaluate("()=>window.__beacons") if u.endswith('/api/plays')]
    assert plays == [{'id': gid}], f'play beacon wrong: {plays}'
    p.page.evaluate("()=>{ const g=window.__game; g.G.score=1234; for(let i=0;i<9;i++){ g.G.grace=0; g.loseLife(); } }")
    p.page.wait_for_function("()=>window.__game.G.state==='over'", timeout=20000)
    p.page.wait_for_function("()=>window.__beacons.some(b=>b[0].endsWith('/api/score'))", timeout=10000)
    score = [json.loads(b) for u, b in p.page.evaluate("()=>window.__beacons") if u.endswith('/api/score')]
    assert score and score[0]['id'] == gid and score[0]['score'] == 1234, f'score beacon wrong: {score}'
    ev = p.page.evaluate("()=>(window.dataLayer||[]).filter(a=>a&&a[0]==='event').map(a=>[a[1],a[2]&&a[2].game_id])")
    assert ['game_start', gid] in ev and ['game_over', gid] in ev, f'GA events missing: {ev}'
    assert not p.errors, p.errors


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_bot_scores_points(make_page, base_url, gid):
    p = boot(make_page, base_url, gid, 'debug=1&bot=1&wave=2')
    p.page.keyboard.press('Enter')
    p.page.wait_for_function("()=>window.__game.G.score>0", timeout=90000)
    assert p.page.evaluate("()=>window.__game.G.state") in ('play', 'dying', 'over')
    assert not p.errors, p.errors


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_boss_is_reached_and_keeps_running(make_page, base_url, gid):
    """?wave=5 starts at the first boss; the boss must appear and the game clock must keep moving."""
    p = boot(make_page, base_url, gid, 'debug=1&wave=5')
    p.page.keyboard.press('Enter')
    p.page.wait_for_function("()=>{const g=window.__game; return g.G.phase==='boss'&&!!g.GAME.bossHUD()}", timeout=60000)
    t0 = p.page.evaluate("()=>window.__game.G.t"); p.page.wait_for_timeout(2500); t1 = p.page.evaluate("()=>window.__game.G.t")
    assert t1 > t0, 'game clock stopped during the boss'
    assert p.page.evaluate("()=>window.__game.G.state") in ('play', 'dying', 'over')
    assert not p.errors, p.errors


# ---------- regressions ----------
def test_fruit_rush_broken_powerup_toss_does_not_freeze(make_page, base_url):
    """Dome 5 freeze: a power-up with no power used to throw every frame and freeze the boss."""
    if 'fruit-rush' not in LIVE_IDS: pytest.skip('fruit-rush not live')
    p = boot(make_page, base_url, 'fruit-rush', 'debug=1&wave=5', 1180, 760)
    p.page.keyboard.press('Enter')
    p.page.wait_for_function("()=>G.phase==='boss'", timeout=60000)
    p.page.evaluate("()=>{ for(let i=0;i<3;i++) queueToss('power',1,0,{},null); }")
    p.page.wait_for_timeout(800); a = p.page.evaluate("()=>[G.boss.x,G.boss.t]")
    p.page.wait_for_timeout(1500); b = p.page.evaluate("()=>[G.boss.x,G.boss.t]")
    assert b[1] > a[1], 'boss froze after a broken power-up toss'
    assert not p.errors, p.errors


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_repeated_logic_errors_end_the_run_cleanly(make_page, base_url, gid):
    """Safety net: if gameplay throws every frame, the run must end on the game-over screen (never freeze)."""
    p = boot(make_page, base_url, gid)
    p.page.keyboard.press('Enter'); p.page.wait_for_function("()=>window.__game.G.state==='play'", timeout=10000)
    p.page.evaluate("()=>{ const g=window.__game.GAME; g.__u=g.update; g.update=()=>{ throw new Error('simulated bug'); }; }")
    p.page.wait_for_function("()=>window.__game.G.state==='over'", timeout=30000)
    ev = p.page.evaluate("()=>(window.dataLayer||[]).filter(a=>a&&a[1]==='exception').length")
    assert ev >= 1, 'the error was not reported to analytics'


@pytest.mark.parametrize('gid', LIVE_IDS)
def test_frozen_animation_frames_do_not_kill_buttons(make_page, base_url, gid):
    """iOS home-screen apps can stop delivering animation frames after resume; taps must still work."""
    p = boot(make_page, base_url, gid)
    p.page.evaluate("()=>{ window.requestAnimationFrame=()=>0; }"); p.page.wait_for_timeout(1200)
    btn = p.page.evaluate("()=>{ const b=UI.buttons.find(b=>b.id==='play'); return b?[b.x+b.w/2,b.y+b.h/2]:null; }")
    assert btn, 'PLAY button not registered'
    p.page.mouse.click(btn[0], btn[1]); p.page.wait_for_timeout(1500)
    assert p.page.evaluate("()=>window.__game.G.state") == 'play', 'PLAY did not respond with animation frames frozen'
