"""Home page. The core promise to players: every playable game card shows its PLAY COUNT and
TOP SCORE (or BE THE FIRST!), fully visible, at every screen size, in Chrome and Safari's engine.
(Regression guard: a desktop layout change once hid the play count and nothing caught it.)"""
import pytest
from conftest import LIVE, SOON, MOCK_STATS, fmt

VIEWPORTS = [('phone', 390, 844), ('tablet', 820, 1180), ('tablet-landscape', 1024, 768), ('laptop-short', 1366, 650),
             ('laptop', 1280, 700), ('desktop', 1440, 860), ('big-desktop', 1920, 1080)]

VISIBLE_JS = """(sel)=>{ const out={};
  for(const card of document.querySelectorAll('.card.live')){
    const id=card.dataset.id, c=card.getBoundingClientRect(), res={};
    for(const k of ['top','plays','first']){ const el=card.querySelector('.stats .'+k);
      if(!el){ res[k]='missing'; continue; }
      const cs=getComputedStyle(el); let hidden=el.hidden||cs.display==='none'||cs.visibility==='hidden';
      for(let p=el.parentElement;p&&p!==card;p=p.parentElement){ const ps=getComputedStyle(p); if(p.hidden||ps.display==='none'||ps.visibility==='hidden') hidden=true; }
      if(hidden){ res[k]='hidden'; continue; }
      const r=el.getBoundingClientRect();
      res[k]=(r.width<2||r.height<2)?'zero-size':(r.left<c.left-1||r.right>c.right+1||r.top<c.top-1||r.bottom>c.bottom+1)?'overflows-card':'ok';
      res[k+'_text']=el.innerText.replace(/\\s+/g,' ').trim(); }
    out[id]=res; }
  return out; }"""


def open_home(make_page, engine, w, h, base_url):
    p = make_page(engine, w, h, dsf=2 if w < 500 else 1)
    p.page.goto(base_url + '/')
    p.page.wait_for_function("()=>[...document.querySelectorAll('.card.live .stats')].every(s=>!s.hidden)", timeout=15000)
    p.page.wait_for_timeout(400)   # let the post-stats relayout settle
    return p


@pytest.mark.parametrize('engine', ['chromium', 'webkit'])
@pytest.mark.parametrize('name,w,h', VIEWPORTS)
def test_every_card_shows_plays_and_top_score(make_page, base_url, engine, name, w, h):
    p = open_home(make_page, engine, w, h, base_url)
    got = p.page.evaluate(VISIBLE_JS)
    assert set(got) == {g['id'] for g in LIVE}, f'live cards on page {sorted(got)} != WORLDS live {[g["id"] for g in LIVE]}'
    for g in LIVE:
        r, s = got[g['id']], MOCK_STATS.get(g['id'])
        if s and s['plays'] > 0:
            assert r['plays'] == 'ok', f"[{engine} {name}] {g['id']}: play count is {r['plays']}"
            assert r['plays_text'] == f"{fmt(s['plays'])} PLAYS", f"[{engine} {name}] {g['id']}: plays text {r.get('plays_text')!r}"
            assert r['top'] == 'ok', f"[{engine} {name}] {g['id']}: top score is {r['top']}"
            assert fmt(s['best']) in r['top_text'], f"[{engine} {name}] {g['id']}: top score text {r.get('top_text')!r}"
        else:
            assert r['first'] == 'ok', f"[{engine} {name}] {g['id']}: BE THE FIRST! is {r['first']}"
    assert not p.errors, p.errors


@pytest.mark.parametrize('engine', ['chromium', 'webkit'])
@pytest.mark.parametrize('name,w,h', VIEWPORTS)
def test_layout_rules(make_page, base_url, engine, name, w, h):
    p = open_home(make_page, engine, w, h, base_url)
    r = p.page.evaluate("""()=>{
      const cards=[...document.querySelectorAll('.card.live, .soon-row')], bad=[];
      for(const card of cards){ const c=card.getBoundingClientRect();
        for(const el of card.querySelectorAll('*')){ const cs=getComputedStyle(el); if(cs.display==='none'||el.closest('[hidden]')) continue;
          const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
          if(r.left<c.left-1||r.right>c.right+1||r.bottom>c.bottom+1) bad.push((card.dataset.id||'?')+' > '+el.className+' '+el.tagName); } }
      const wide=document.body.classList.contains('wide'), cols=[...document.querySelectorAll('.live-sec,.soon-sec')].map(e=>e.getBoundingClientRect());
      return {bad, wide, colOverflow: wide ? cols.some(c=>c.bottom>innerHeight+1||c.top<0) : false,
        sideScroll: document.documentElement.scrollWidth>innerWidth+1,
        headingButtons:[...document.querySelectorAll('.sec')].filter(h=>h.closest('.btn')||h.classList.contains('btn')).length,
        pins:document.querySelectorAll('.pin').length, livePins:document.querySelectorAll('.pin.live').length,
        soonRows:document.querySelectorAll('.soon-row').length,
        hrefs:[...document.querySelectorAll('.card.live')].map(a=>a.getAttribute('href'))}; }""")
    assert not r['bad'], f'[{engine} {name}] content spills out of cards: {r["bad"][:5]}'
    play = p.page.evaluate("""()=>[...document.querySelectorAll('.card.live')].map(c=>{ const vis=el=>{ if(!el) return false; const cs=getComputedStyle(el), r=el.getBoundingClientRect();
        return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>=20&&r.height>=20; }; return [c.dataset.id, vis(c.querySelector('.play'))||vis(c.querySelector('.thumb .go'))]; })""")
    assert all(ok for _, ok in play), f'[{engine} {name}] a card has no visible PLAY button or ▶ badge: {play}'
    assert not r['colOverflow'], f'[{engine} {name}] desktop columns run off the screen'
    assert not r['sideScroll'], f'[{engine} {name}] page scrolls sideways'
    assert r['headingButtons'] == 0, 'section labels must not look like buttons'
    assert r['pins'] == len(LIVE) + len(SOON) and r['livePins'] == len(LIVE)
    assert r['soonRows'] == len(SOON)
    assert r['hrefs'] == [f"games/{g['id']}/" for g in LIVE]
    if w >= 1280 and h >= 650:
        assert r['wide'], f'[{engine} {name}] desktop should use the map layout, fell back to stacked'
    assert not p.errors, p.errors


def test_stats_hidden_when_api_down(make_page, base_url):
    """If /api/stats fails, cards must still work (no stats row, no errors)."""
    p = make_page('chromium', 1440, 860)
    p.ctx.unroute('**/api/stats'); p.ctx.route('**/api/stats', lambda r: r.fulfill(status=503, body='{}'))
    p.page.goto(base_url + '/'); p.page.wait_for_timeout(1500)
    assert p.page.evaluate("()=>[...document.querySelectorAll('.card.live .stats')].every(s=>s.hidden)")
    assert p.page.evaluate("()=>document.querySelectorAll('.card.live .btn').length") == len(LIVE)
    assert not p.errors, p.errors
