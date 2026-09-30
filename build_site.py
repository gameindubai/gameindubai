"""Build Samar's Game in Dubai (gameindubai.com) into ./site from ./src.
Static site for Cloudflare Pages (drag-and-drop friendly) + one _worker.js for the play counter."""
import json, os, shutil, subprocess, html, hashlib
from PIL import Image

S = 'site'
ORIGIN = 'https://gameindubai.com'
GA_ID = 'G-1BHJTF5SVL'
BRAND = "Samar's Game in Dubai"
E = html.escape

def w(path, text, mode='w'):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, mode) as f: f.write(text)
def h8(path): return hashlib.md5(open(os.path.join(S, path), 'rb').read()).hexdigest()[:8]
def v(path): return f'{path}?v={h8(path)}'          # versioned URL (relative to site root)

# ---------- clean + static files ----------
shutil.rmtree(S, ignore_errors=True)
shutil.copytree('src/static', S)

# ---------- icons (pixel Burj + sun) ----------
def icon32():
    N = 32; im = Image.new('RGB', (N, N), '#0D2340'); px = im.load()
    def rect(x0, y0, x1, y1, c):
        for y in range(max(0, y0), min(N, y1)):
            for x in range(max(0, x0), min(N, x1)): px[x, y] = tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
    for y in range(20): rect(0, y, N, y+1, ['#17416E', '#1B4B7C', '#205889', '#276596', '#2E72A3'][min(4, y//4)])
    for y in range(-7, 8):
        for x in range(-7, 8):
            d = x*x + y*y
            if d <= 49: rect(22+x, 9+y, 23+x, 10+y, '#FFD23F' if d > 25 else '#FFB23E')
    for x0, ww, hh in [(1, 3, 9), (5, 3, 12), (19, 3, 10), (23, 4, 14), (28, 3, 8)]: rect(x0, 26-hh, x0+ww, 26, '#0F2D52')
    for (x0, x1, y0) in [(10, 19, 20), (11, 18, 15), (12, 17, 10), (13, 16, 6), (14, 15, 2)]: rect(x0, y0, x1, 26, '#F4B731')
    for (x0, x1, y0) in [(10, 11, 20), (11, 12, 15), (12, 13, 10), (13, 14, 6)]: rect(x0, y0, x1, 26, '#FFE28A')
    for (x0, x1, y0) in [(18, 19, 20), (17, 18, 15), (16, 17, 10), (15, 16, 6)]: rect(x0, y0, x1, 26, '#B87B12')
    rect(0, 26, N, N, '#39CCE3'); rect(0, 26, N, 27, '#14181F')
    for x in range(1, N, 5): rect(x, 28, x+2, 29, '#C4F6FC')
    for x in range(3, N, 5): rect(x, 30, x+2, 31, '#C4F6FC')
    return im
ic = icon32(); os.makedirs(f'{S}/assets', exist_ok=True)
ic.save(f'{S}/assets/icon-32.png')
for s in (180, 192, 512): ic.resize((s, s), Image.NEAREST).save(f'{S}/assets/icon-{s}.png', optimize=True)
mk = Image.new('RGB', (512, 512), '#0D2340'); mk.paste(ic.resize((384, 384), Image.NEAREST), (64, 64)); mk.save(f'{S}/assets/icon-maskable-512.png', optimize=True)

# ---------- kit (shared engine) ----------
pixel = open('src/pixel.js').read(); blk = open('src/blockkit.js').read()
LOCAL = '''const Store={
  async get(k){ try{ return window.localStorage.getItem(k); }catch(e){ return null; } },
  async set(k,v){ try{ window.localStorage.setItem(k,String(v)); }catch(e){} }};'''
s0 = blk.index('const Store={'); s1 = blk.index('}};', s0) + 3
w(f'{S}/kit/pixel.js', pixel); w(f'{S}/kit/blockkit.js', blk[:s0] + LOCAL + blk[s1:])
shutil.copy('src/vendor/three.min.js', f'{S}/kit/three.min.js')

# ---------- css / js (font URL gets versioned inside the CSS) ----------
css = open('src/site/site.css').read().replace("url('samar-blocks.woff2')", f"url('samar-blocks.woff2?v={h8('assets/samar-blocks.woff2')}')")
w(f'{S}/assets/site.css', css); shutil.copy('src/site/site.js', f'{S}/assets/site.js')

# ---------- worlds ----------
WORLDS = json.loads(subprocess.check_output(['node', '-e', """
global.window={}; global.location={search:'',protocol:'file:'}; global.matchMedia=()=>({matches:false}); global.navigator={}; global.document={createElement:()=>({getContext:()=>({})})};
eval(require('fs').readFileSync('src/pixel.js','utf8')+';console.log(JSON.stringify(WORLDS))');"""]))
LIVE = [x for x in WORLDS if x.get('live')]; SOON = [x for x in WORLDS if not x.get('live')]
ENGINE_LIVE = [x for x in LIVE if x.get('engine') != 'standalone']   # games built on blockkit (world.js); others ship their own engine

# ---------- games ----------
GAMES = {'juggle-show': ['juggle-show.world.js', 'juggle-show.rules.js'],
         'fruit-rush': ['fruit-rush.1.js', 'fruit-rush.2.js', 'fruit-rush.3.js'],
         'shine-crew': ['shine-crew.world.js', 'shine-crew.rules.js']}
GAME_BG = {'juggle-show': '#0D2340', 'fruit-rush': '#9FDDEB', 'shine-crew': '#9ED3F0', 'pew-pew-space': '#05060D'}
for gid, parts in GAMES.items():
    w(f'{S}/games/{gid}/world.js', "'use strict';\n" + '\n'.join(open('src/' + p).read() for p in parts) + os.environ.get('BUILD_MARK',''))

# ---------- loading-screen microcopy (Samar, Dubai, the game) ----------
SHARED_LINES = ["Samar is warming up his flying kick…", "Counting Burj Khalifa's floors… 1, 2, 3…", "Asking a camel to move off the road…",
  "Turning the AC up. It's Dubai, after all!", "Samar says: homework first. Then games!", "Stacking blocks higher than the Burj…",
  "Putting on sunscreen… SPF 50!", "Samar is 8. This game is even younger!", "Dusting the desert sand off the pixels…",
  "Waving at the metro as it zooms by…", "Checking if it's still summer… yes.", "Samar made this. Please be nice to it!"]
GAME_LINES = {'juggle-show': ["Teaching the seal to count to three…", "Pumping up the beach balls…", "The dolphins are practising their splash…",
                              "The parrot is rehearsing his lines…", "Handing out fish snacks to the stars…"],
              'fruit-rush': ["Washing the mangoes…", "Waking up the butterflies (gently!)…", "Stacking the watermelons…",
                             "Counting butterflies… 1, 2… oops, it flew away!", "The budgie is practising his jokes…"],
              'shine-crew': ["Buckling the safety harness… click!", "Filling the water tank… glug glug…", "Checking the wind way up high… breezy!",
                             "Counting 24,348 windows… this might take a while!", "Parking the cleaning machine on the roof…"],
              'pew-pew-space': ["Fuelling the rocket… glug glug…", "Samar is putting on his space helmet…", "Checking the OSS Hope station… all good!",
                                "Counting the stars… 1, 2, 3… lots!", "Sweeping space junk into a big pile…"]}
def lines_for(gid):
    g, s, out = GAME_LINES[gid], SHARED_LINES, []
    for i in range(max(len(g), len(s))):
        if i < len(g): out.append(g[i])
        if i < len(s): out.append(s[i])
    return out

# ---------- shared <head> ----------
def ga_tag():
    return f'''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{GA_ID}', {{ allow_google_signals: false, allow_ad_personalization_signals: false }});
</script>'''
def meta_common(title, desc, r, path, color='#0D2340'):
    return f'''<meta name="theme-color" content="{color}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Game in Dubai">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{ORIGIN}{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{E(BRAND)}">
<meta property="og:url" content="{ORIGIN}{path}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{ORIGIN}/{v('assets/og.png')}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="{r}{v('assets/icon-32.png')}">
<link rel="apple-touch-icon" href="{r}{v('assets/icon-180.png')}">
<link rel="manifest" href="{r}manifest.webmanifest">
<link rel="preload" href="{r}{v('assets/samar-blocks.woff2')}" as="font" type="font/woff2" crossorigin>'''
def head(title, desc, r, path):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{ga_tag()}
{meta_common(title, desc, r, path)}
<link rel="stylesheet" href="{r}{v('assets/site.css')}">
</head>'''
def card(x, r):   # playable game card (also used on the About page)
    return f'''<a class="card panel live" data-n="{x["n"]}" data-id="{x["id"]}" href="{r}games/{x["id"]}/" style="--c:{x["color"]}">
  <span class="thumb"><img src="{r}{v('assets/cards/'+x['id']+'.webp')}" alt="" width="480" height="360" loading="lazy"><span class="go" aria-hidden="true"></span></span>
  <span class="body"><span class="name">{E(x["name"])}</span><span class="place">{E(x["place"])}</span><span class="tagline">{E(x["tag"])}</span>
  <span class="stats" hidden><span class="top" hidden><img data-spr="trophy" data-px="2" alt="">TOP SCORE <b></b></span><span class="plays" hidden></span><span class="first" hidden>BE THE FIRST!</span></span>
  <span class="btn gold play"><span>PLAY</span></span></span>
</a>'''
def soon_row(x):
    return f'''<li class="soon-row" data-n="{x["n"]}" data-id="{x["id"]}" tabindex="0" style="--c:{x["color"]}" aria-label="{E(x["name"])} at {E(x["place"])}, coming soon">
  <span class="ic"><img data-spr="{x["icon"]}" data-px="3" alt=""></span><span class="tx"><span class="nm">{E(x["name"])}</span><span class="pl">{E(x["place"])}</span></span><img class="lk" data-spr="lock" data-px="2" alt="locked"></li>'''
def foot(r):
    link = f'<a href="{r}about/">Meet Samar</a>' if r == '' else f'<a href="{r}">Back to the map</a>'
    return f'''<footer class="foot"><span class="px"><img data-spr="samar" data-px="3" alt="">MADE BY SAMAR IN DUBAI</span>
Free block games for kids. No ads, no sign-up, just play.<span class="fl"> {link}</span></footer>'''
def scripts(r): return f'<script src="{r}{v("kit/pixel.js")}"></script>\n<script src="{r}{v("assets/site.js")}"></script>'

# ---------- home ----------
home = head(f"{BRAND} | Free block games made by an 8-year-old",
            "Pick a place on the block map of Dubai and play! Free, kid-friendly games made by Samar, age 8. No ads, no sign-up.", '', '/') + f'''
<body class="home" data-page="home">
<div class="stage" id="stage">
  <canvas id="map" aria-hidden="true"></canvas>
  <div class="clouds" aria-hidden="true"><i style="top:34%"></i><i style="top:58%"></i><i style="top:80%"></i></div>
  <svg id="leaders" aria-hidden="true"></svg>
  <div id="pins"></div>
  <h1 class="logo"><canvas id="logo" role="img" aria-label="{E(BRAND)}"></canvas><span class="sr">{E(BRAND)}</span></h1>
  <button class="install btn gold" id="install" type="button" hidden><span><img data-spr="dl" data-px="3" alt=""><b>INSTALL</b></span></button>
  <div class="ios-tip panel" id="iosTip" role="dialog" aria-label="How to install" hidden><span class="px">GET THE APP</span>
    Tap <img data-spr="share" data-px="2" alt="Share"> <b>Share</b>, then <b>Add to Home Screen</b>.<small>Inside WhatsApp or Instagram? Open this page in Safari first. Tap to close.</small></div>
  <a class="meet btn navy" href="about/"><span><img data-spr="samar" data-px="3" alt="">MEET SAMAR</span></a>
</div>
<main>
  <section class="live-sec" aria-labelledby="h-live">
    <h2 class="sec" id="h-live"><img data-spr="star" data-px="3" alt="">PLAY NOW</h2>
    <div class="grid live">
{chr(10).join(card(x, '') for x in LIVE)}
    </div>
  </section>
  <section class="soon-sec" aria-labelledby="h-soon">
    <h2 class="sec" id="h-soon"><img data-spr="lock" data-px="3" alt="">COMING SOON</h2>
    <div class="panel soon-box"><ul class="soon-list">
{chr(10).join(soon_row(x) for x in SOON)}
    </ul></div>
  </section>
</main>
{foot('')}
{scripts('')}
</body>
</html>
'''
w(f'{S}/index.html', home)

# ---------- about ----------
about = head(f"Meet Samar | {BRAND}", "Hi! I'm Samar. I'm 8 years old, I live in Dubai, and I make fun block games for kids.", '../', '/about/') + f'''
<body class="about" data-page="about">
<header class="bar"><a class="btn navy" href="../"><span><img data-spr="map" data-px="3" alt="">MAP</span></a><div class="logo-sm"><canvas id="logo" role="img" aria-label="{E(BRAND)}"></canvas></div></header>
<main>
  <section class="player panel" aria-labelledby="who">
    <h2 class="ribbon">MEET THE GAME MAKER</h2>
    <div class="scene"><canvas id="scene" aria-hidden="true"></canvas><img class="kick" src="../{v('assets/samar-sticker.webp')}" alt="Samar doing a flying kick" width="645" height="470"></div>
    <div class="hello">
      <div class="who"><img data-spr="samar" data-px="8" alt="Samar's block avatar"><span class="px" id="who">SAMAR</span></div>
      <div class="bubble"><p class="hi px">HI! I'M SAMAR!</p><p>I'm <b>8 years old</b> and I live in <b>Dubai</b>. I'm in <b>3rd grade</b>, and I make fun games for kids like you!</p></div>
    </div>
    <ul class="about-stats">
      <li><img data-spr="cake" data-px="4" alt=""><span><span class="k px">AGE</span><span class="v px">8</span></span></li>
      <li><img data-spr="book" data-px="3" alt=""><span><span class="k px">GRADE</span><span class="v px">3RD</span></span></li>
      <li><img data-spr="ico_burj" data-px="2" alt=""><span><span class="k px">HOME</span><span class="v px">DUBAI</span></span></li>
      <li><img data-spr="pad" data-px="3" alt=""><span><span class="k px">GAMES MADE</span><span class="v px">{len(LIVE)}</span></span></li>
      <li class="wide"><img data-spr="star" data-px="3" alt=""><span><span class="k px">SPECIAL MOVE</span><span class="v px">FLYING KICK!</span></span></li>
    </ul>
    <div class="cta"><a class="btn gold big" href="../"><span>PLAY MY GAMES</span></a></div>
  </section>
  <section class="mine panel">
    <h2 class="ribbon">SAMAR'S GAMES</h2>
    <div class="grid live">
{chr(10).join(card(x, '../') for x in LIVE)}
    </div>
    <p class="more">{len(SOON)} more places around Dubai are coming soon!</p>
  </section>
</main>
<canvas id="skyline" aria-hidden="true"></canvas>
{foot('../')}
{scripts('../')}
</body>
</html>
'''
w(f'{S}/about/index.html', about)

# ---------- 404 (absolute paths: served from any URL) ----------
lost = head(f"Oops! | {BRAND}", "This block is empty. Head back to the map!", '/', '/') + f'''
<body class="lost" data-page="lost">
<div class="panel">
  <canvas id="logo" role="img" aria-label="{E(BRAND)}" style="margin:0 auto 6px"></canvas>
  <img data-spr="camel" data-px="10" alt="A lost block camel">
  <h1 class="px">OOPS! THIS BLOCK IS EMPTY</h1>
  <p>Even the camel can't find this page. Let's go back to the map!</p>
  <a class="btn gold big" href="/"><span>BACK TO MAP</span></a>
</div>
{scripts('/')}
</body>
</html>
'''
w(f'{S}/404.html', lost)

# ---------- game pages: instant splash while the engine loads ----------
def splash_head(x, r, bg):   # analytics + meta + font + loading-splash styles (shared by engine and standalone games)
    gid = x['id']
    return f'''{ga_tag()}
{meta_common(f"{x['name'].title()} at {x['place']} | {BRAND}", f"{x['tag']} A free block game by Samar, set at {x['place']}.", r, f'/games/{gid}/', bg)}
<style>
@font-face{{font-family:'Samar Blocks';src:url('{r}{v('assets/samar-blocks.woff2')}') format('woff2');font-display:swap}}
html,body{{margin:0;height:100%;overflow:hidden;background:{bg};overscroll-behavior:none}}
body{{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}}
#stage{{position:fixed;inset:0}}
#stage canvas{{position:absolute;inset:0;width:100%;height:100%;display:block}}
#ui{{pointer-events:none}}
#boot{{position:fixed;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:#0D2340;color:#F4B731;font:700 16px/1.4 ui-rounded,system-ui,sans-serif}}
#boot .bx{{max-width:330px}}
#boot .bt{{font:30px/1.1 'Samar Blocks',monospace;color:#F4B731;text-shadow:3px 0 #14181F,-3px 0 #14181F,0 3px #14181F,0 -3px #14181F,3px 3px #14181F,-3px -3px #14181F,3px -3px #14181F,-3px 3px #14181F,0 6px #14181F}}
#boot .bp{{margin-top:12px;font:10px/1 'Samar Blocks',monospace;color:#A8F1FB}}
#boot .bl{{display:flex;gap:8px;justify-content:center;margin:28px 0 22px}}
#boot .bl i{{width:14px;height:14px;background:{x['color']};border:3px solid #14181F;animation:hop .9s ease-in-out infinite}}
#boot .bl i:nth-child(2){{animation-delay:.12s;background:#F4B731}}#boot .bl i:nth-child(3){{animation-delay:.24s}}#boot .bl i:nth-child(4){{animation-delay:.36s;background:#F4B731}}#boot .bl i:nth-child(5){{animation-delay:.48s}}
@keyframes hop{{0%,60%,100%{{transform:translateY(0)}}30%{{transform:translateY(-12px)}}}}
#boot p{{margin:0;min-height:2.9em;color:#fff;text-shadow:0 2px 0 #14181F}}
#boot .bs{{margin-top:20px;font:10px/1 'Samar Blocks',monospace;color:rgba(255,255,255,.7)}}
@media (prefers-reduced-motion:reduce){{#boot .bl i{{animation:none}}}}
</style>
'''


def splash_body(x, r):          # loading splash with rotating one-liners + service worker (removed by the game once it's ready)
    gid = x['id']
    return f'''<div id="boot" role="status" aria-live="polite"><div class="bx"><div class="bt">{E(x['name'])}</div><div class="bp">{E(x['place'].upper())}</div>
<div class="bl" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p id="bm"></p><div class="bs">SAMAR'S GAME IN DUBAI</div></div></div>
<script>
window.GID_HOME='{r}';
(function(){{var L={json.dumps(lines_for(gid), ensure_ascii=False)},o=document.getElementById('bm'),i=(Math.random()*L.length)|0,t;
function n(){{if(!document.getElementById('boot'))return clearInterval(t);o.textContent=L[i++%L.length];}}n();t=setInterval(n,1700);}})();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){{addEventListener('load',function(){{navigator.serviceWorker.register('/sw.js').then(function(r){{r.update()}}).catch(function(){{}})}});
document.addEventListener('visibilitychange',function(){{if(!document.hidden)navigator.serviceWorker.getRegistration().then(function(r){{if(r)r.update()}}).catch(function(){{}})}});}}
</script>
'''


def game_page(x):
    gid, bg = x['id'], GAME_BG[x['id']]; r = '../../'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
{splash_head(x, r, bg)}</head>
<body>
<div id="stage"><canvas id="gl"></canvas><canvas id="ui"></canvas></div>
{splash_body(x, r)}<script defer src="{r}{v('kit/three.min.js')}"></script>
<script defer src="{r}{v('kit/pixel.js')}"></script>
<script defer src="{r}{v('kit/blockkit.js')}"></script>
<script defer src="{v(f'games/{gid}/world.js').split('/')[-1]}"></script>
</body>
</html>
'''


def standalone_page(x):
    """A game with its own engine (src/<id>/game.html). It keeps its code; the build injects the site shell
    at three placeholders: <!--GID:HEAD--> (analytics, meta, font, splash styles), <!--GID:THREE--> (shared three.js +
    pixel.js for Track), <!--GID:BOOT--> (loading splash + service worker). The game must remove #boot once running
    and call Track.play / Track.score (see docs/GAME_ENGINE.md, 'Standalone games')."""
    gid, r = x['id'], '../../'
    src = open(f'src/{gid}/game.html', encoding='utf-8').read()
    for tag in ('<!--GID:HEAD-->', '<!--GID:THREE-->', '<!--GID:BOOT-->'):
        assert src.count(tag) == 1, f'{gid}: placeholder {tag} must appear exactly once'
    src = src.replace('<!--GID:HEAD-->', splash_head(x, r, GAME_BG[gid]))
    src = src.replace('<!--GID:THREE-->', f'<script src="{r}{v("kit/three.min.js")}"></script>\n<script src="{r}{v("kit/pixel.js")}"></script>')
    return src.replace('<!--GID:BOOT-->', splash_body(x, r))
for x in LIVE: w(f'{S}/games/{x["id"]}/index.html', standalone_page(x) if x.get('engine') == 'standalone' else game_page(x))

# ---------- single-file previews of engine games (for quick testing in chat) ----------
os.makedirs('previews', exist_ok=True)
for x in ENGINE_LIVE:
    page = open(f'{S}/games/{x["id"]}/index.html').read()
    inl = lambda p: '<script>\n' + open(f'{S}/{p}').read().replace('</script', '<\\/script') + '\n</script>'
    for p in ['kit/three.min.js', 'kit/pixel.js', 'kit/blockkit.js']:
        page = page.replace(f'<script defer src="../../{v(p)}"></script>', inl(p))
    page = page.replace(f'<script defer src="{v("games/"+x["id"]+"/world.js").split("/")[-1]}"></script>', inl(f'games/{x["id"]}/world.js'))
    w(f'previews/{x["id"]}.html', page)

# ---------- PWA manifest ----------
man = {"id": "/", "name": BRAND, "short_name": "Game in Dubai",
       "description": "Free block games at real places in Dubai, made by Samar (8).",
       "start_url": "/?source=app", "scope": "/", "display": "standalone", "orientation": "any",
       "background_color": "#0D2340", "theme_color": "#0D2340", "categories": ["games", "kids", "entertainment"],
       "icons": [{"src": "/" + v('assets/icon-192.png'), "sizes": "192x192", "type": "image/png"},
                 {"src": "/" + v('assets/icon-512.png'), "sizes": "512x512", "type": "image/png", "purpose": "any"},
                 {"src": "/" + v('assets/icon-maskable-512.png'), "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
       "shortcuts": [{"name": x['name'].title(), "short_name": x['name'].title(), "url": f"/games/{x['id']}/"} for x in LIVE]}
shots = []
for f, ff in [('assets/shot-phone.webp', 'narrow'), ('assets/shot-wide.webp', 'wide')]:
    if os.path.exists(f'{S}/{f}'):
        wd, ht = Image.open(f'{S}/{f}').size
        shots.append({"src": "/" + v(f), "sizes": f"{wd}x{ht}", "type": "image/webp", "form_factor": ff, "label": BRAND})
if shots: man["screenshots"] = shots
w(f'{S}/manifest.webmanifest', json.dumps(man, indent=1))

# ---------- service worker: instant repeat visits + offline play ----------
CORE = ['/', '/about/'] + [f'/games/{x["id"]}/' for x in LIVE] + ['/' + v(p) for p in
        ['assets/site.css', 'assets/site.js', 'assets/samar-blocks.woff2', 'assets/samar-sticker.webp', 'assets/icon-32.png', 'assets/icon-180.png',
         'assets/icon-192.png', 'kit/three.min.js', 'kit/pixel.js', 'kit/blockkit.js'] +
        [f'assets/cards/{x["id"]}.webp' for x in LIVE] + [f'games/{x["id"]}/world.js' for x in ENGINE_LIVE]]
SWV = hashlib.md5((''.join(CORE) + home + about + ''.join(open(f'{S}/games/{x["id"]}/index.html').read() for x in LIVE)).encode()).hexdigest()[:10]
w(f'{S}/sw.js', f'''/* Samar's Game in Dubai — service worker. Pages: network first (a reload always gets the latest fixes), saved copy when offline/slow.
   Versioned files (?v=): cache first. The app also checks for a new sw.js on every load and on return to the foreground. /api + other sites: untouched. */
const V='gid-{SWV}', CORE={json.dumps(CORE)};
self.addEventListener('install',e=>{{ e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); }});
self.addEventListener('activate',e=>{{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); }});
self.addEventListener('fetch',e=>{{
  const r=e.request; if(r.method!=='GET') return; const u=new URL(r.url); if(u.origin!==location.origin||u.pathname.startsWith('/api/')) return;
  if(r.mode==='navigate'){{   // fresh page from the network (so fixes land on the next reload); saved copy if offline or very slow
    const net=fetch(r).then(res=>{{ if(res.ok&&!res.redirected){{ const cp=res.clone(); caches.open(V).then(c=>c.put(u.pathname,cp)); }} return res; }});
    e.respondWith((async()=>{{
      if(self.navigator&&self.navigator.onLine===false){{ const c=await caches.match(u.pathname,{{ignoreSearch:true}}); if(c) return c; }}
      const quick=await Promise.race([net.catch(()=>null),new Promise(ok=>setTimeout(()=>ok(null),1800))]);
      if(quick) return quick;
      return (await caches.match(u.pathname,{{ignoreSearch:true}}))||net.catch(()=>caches.match('/')); }})());
    return;
  }}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{{ if(res.ok&&u.search.includes('v=')){{ const cp=res.clone(); caches.open(V).then(c=>c.put(r,cp)); }} return res; }})));
}});
''')

# ---------- global stats: _worker.js (+ _routes.json so it only runs for /api/*) ----------
w(f'{S}/_worker.js', f'''// Samar's Game in Dubai — global play counts + all-time best scores, stored in D1 (bound as "DB").
// Only /api/* reaches this worker (see _routes.json); every other file is served straight from Pages.
//   POST /api/plays {{id}}              +1 play
//   POST /api/score {{id,score,dur}}    keeps the highest score per game (writes only on a new record)
//   GET  /api/plays                   {{id: plays}}                       (cached 60s at the edge)
//   GET  /api/stats                   {{id: {{plays,best,best_at}}}}         (cached 60s, cleared on a new record)
const GAMES=new Set({json.dumps([x['id'] for x in LIVE])});
const MAX_SCORE=50000000, PTS_PER_SEC=3000, PTS_SLACK=20000, MAX_DUR=4*3600;   // basic sanity limits, far above real play
const SCHEMA='CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, plays INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0, best_at INTEGER)';
const json=(d,s=200,h={{}})=>new Response(JSON.stringify(d),{{status:s,headers:Object.assign({{'content-type':'application/json'}},h)}});
async function q(db,fn){{ try{{ return await fn(); }}catch(e){{ if(!/no such table/i.test(String(e&&e.message))) throw e; await db.prepare(SCHEMA).run(); return await fn(); }} }}
async function readBody(req){{ try{{ const t=await req.text(); return t.length<400?JSON.parse(t):{{}}; }}catch(e){{ return {{}}; }} }}
export default {{
  async fetch(req,env,ctx){{
    const url=new URL(req.url), path=url.pathname;
    if(!path.startsWith('/api/')) return env.ASSETS.fetch(req);
    if(!env.DB) return json({{error:'database not connected'}},503);
    const cache=caches.default, keyOf=p=>new Request(url.origin+p);
    if(req.method==='POST'){{
      const origin=req.headers.get('origin'); if(origin){{ try{{ if(new URL(origin).host!==url.host) return json({{ok:false}},403); }}catch(e){{ return json({{ok:false}},403); }} }}
      const b=await readBody(req), id=String(b.id||''); if(!GAMES.has(id)) return json({{ok:false}},400);
      if(path==='/api/plays'){{
        await q(env.DB,()=>env.DB.prepare('INSERT INTO games (id,plays) VALUES (?1,1) ON CONFLICT(id) DO UPDATE SET plays=plays+1').bind(id).run());
        return json({{ok:true}});
      }}
      if(path==='/api/score'){{
        const s=Math.floor(Number(b.score)), dur=Math.min(MAX_DUR,Math.max(0,Number(b.dur)||0));
        if(!Number.isFinite(s)||s<1||s>MAX_SCORE||s>PTS_SLACK+dur*PTS_PER_SEC) return json({{ok:false,error:'score rejected'}},422);
        const r=await q(env.DB,()=>env.DB.prepare('INSERT INTO games (id,best,best_at) VALUES (?1,?2,?3) ON CONFLICT(id) DO UPDATE SET best=excluded.best, best_at=excluded.best_at WHERE excluded.best>games.best').bind(id,s,Date.now()).run());
        const record=!!(r&&r.meta&&r.meta.changes>0); if(record) ctx.waitUntil(cache.delete(keyOf('/api/stats')));
        return json({{ok:true,record}});
      }}
      return json({{error:'not found'}},404);
    }}
    if(req.method==='GET'&&(path==='/api/plays'||path==='/api/stats')){{
      const key=keyOf(path), hit=await cache.match(key); if(hit) return hit;
      const rows=await q(env.DB,async()=>(await env.DB.prepare('SELECT id,plays,best,best_at FROM games').all()).results||[]);
      const out={{}}; for(const r of rows) out[r.id]=path==='/api/plays'?r.plays:{{plays:r.plays,best:r.best,best_at:r.best_at}};
      const res=json(out,200,{{'cache-control':'public, max-age=60'}}); ctx.waitUntil(cache.put(key,res.clone())); return res;
    }}
    return json({{error:'not found'}},404);
  }}
}};
''')
w(f'{S}/_routes.json', json.dumps({"version": 1, "include": ["/api/*"], "exclude": []}))

# ---------- caching + SEO ----------
w(f'{S}/_headers', '''/kit/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: public, max-age=3600
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
''')
w(f'{S}/robots.txt', f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n')
urls = ['/', '/about/'] + [f'/games/{x["id"]}/' for x in LIVE]
w(f'{S}/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ''.join(f'  <url><loc>{ORIGIN}{u}</loc></url>\n' for u in urls) + '</urlset>\n')
print('built', S, '| live:', len(LIVE), 'soon:', len(SOON), '| sw', SWV)
