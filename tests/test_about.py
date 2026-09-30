"""About page: Samar's card, stats grid, and his games (with play counts)."""
import pytest
from conftest import LIVE, MOCK_STATS, fmt
from test_home import VISIBLE_JS


@pytest.mark.parametrize('engine', ['chromium', 'webkit'])
@pytest.mark.parametrize('name,w,h', [('phone', 390, 844), ('desktop', 1440, 900)])
def test_about_page(make_page, base_url, engine, name, w, h):
    p = make_page(engine, w, h)
    p.page.goto(base_url + '/about/')
    p.page.wait_for_function("()=>[...document.querySelectorAll('.card.live .stats')].every(s=>!s.hidden)", timeout=15000)
    r = p.page.evaluate("""()=>({cards:document.querySelectorAll('.mine .card.live').length,
      statItems:document.querySelectorAll('.about-stats li').length,
      gamesMade:[...document.querySelectorAll('.about-stats li')].map(l=>l.innerText.replace(/\\s+/g,' ')).find(t=>t.includes('GAMES MADE')),
      sticker:!!document.querySelector('.scene .kick')&&document.querySelector('.scene .kick').naturalWidth>0,
      sideScroll:document.documentElement.scrollWidth>innerWidth+1})""")
    assert r['cards'] == len(LIVE)
    assert r['statItems'] == 5
    assert r['gamesMade'].strip().endswith(str(len(LIVE)))
    assert r['sticker'], "Samar's photo did not load"
    assert not r['sideScroll']
    got = p.page.evaluate(VISIBLE_JS)
    for g in LIVE:
        s = MOCK_STATS.get(g['id'])
        if s:
            assert got[g['id']]['plays'] == 'ok' and got[g['id']]['plays_text'] == f"{fmt(s['plays'])} PLAYS", f"[{engine} {name}] {g['id']}: {got[g['id']]}"
    assert not p.errors, p.errors
