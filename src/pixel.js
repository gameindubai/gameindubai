/* ==========================================================================
   SAMAR'S GAME IN DUBAI — PIXEL KIT
   Shared by the website AND every game: utils, palette, the 5x7 block font,
   pixel icons and the WORLDS registry (one source of truth for the home map).
   ========================================================================== */
'use strict';
// ---------- utils ----------
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
const sgn=v=>v<0?-1:1;
const easeOutBack=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
function rgbCss(r,g,b){return 'rgb('+Math.round(clamp(r,0,1)*255)+','+Math.round(clamp(g,0,1)*255)+','+Math.round(clamp(b,0,1)*255)+')';}
function shadeHex(hex,amt){const c=hexToRgb(hex);const f=v=>amt>=0?v+(1-v)*amt:v*(1+amt);return rgbCss(f(c[0]),f(c[1]),f(c[2]));}
const fmt=n=>Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
const PARAMS=new URLSearchParams(location.search);
const DEBUG=PARAMS.has('debug'), BOT=PARAMS.has('bot');
const REDUCED=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------- palette (UI tokens shared by all worlds) ----------
const PAL={ink:'#14181F',night:'#0D2340',navy:'#17416E',teal:'#1FA3A8',aqua:'#39CCE3',foam:'#E4FAFD',
  quartz:'#E9EDEF',gold:'#F4B731',goldDeep:'#B87B12',goldLight:'#FFE28A',coral:'#F0503C',red:'#E0383B',lime:'#7ED957',white:'#FFFFFF'};

// ---------- block font (5x7) ----------
const FONT={
A:[".###.","#...#","#...#","#####","#...#","#...#","#...#"],B:["####.","#...#","#...#","####.","#...#","#...#","####."],
C:[".###.","#...#","#....","#....","#....","#...#",".###."],D:["####.","#...#","#...#","#...#","#...#","#...#","####."],
E:["#####","#....","#....","####.","#....","#....","#####"],F:["#####","#....","#....","####.","#....","#....","#...."],
G:[".###.","#...#","#....","#.###","#...#","#...#",".####"],H:["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
I:["###",".#.",".#.",".#.",".#.",".#.","###"],J:["..###","...#.","...#.","...#.","#..#.","#..#.",".##.."],
K:["#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"],L:["#....","#....","#....","#....","#....","#....","#####"],
M:["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"],N:["#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"],
O:[".###.","#...#","#...#","#...#","#...#","#...#",".###."],P:["####.","#...#","#...#","####.","#....","#....","#...."],
Q:[".###.","#...#","#...#","#...#","#.#.#","#..#.",".##.#"],R:["####.","#...#","#...#","####.","#.#..","#..#.","#...#"],
S:[".####","#....","#....",".###.","....#","....#","####."],T:["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
U:["#...#","#...#","#...#","#...#","#...#","#...#",".###."],V:["#...#","#...#","#...#","#...#","#...#",".#.#.","..#.."],
W:["#...#","#...#","#...#","#.#.#","#.#.#","#.#.#",".#.#."],X:["#...#","#...#",".#.#.","..#..",".#.#.","#...#","#...#"],
Y:["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],Z:["#####","....#","...#.","..#..",".#...","#....","#####"],
'0':[".###.","#...#","#...#","#...#","#...#","#...#",".###."],'1':[".#.","##.",".#.",".#.",".#.",".#.","###"],
'2':[".###.","#...#","....#","...#.","..#..",".#...","#####"],'3':["####.","....#","....#",".###.","....#","....#","####."],
'4':["...#.","..##.",".#.#.","#..#.","#####","...#.","...#."],'5':["#####","#....","####.","....#","....#","#...#",".###."],
'6':[".###.","#....","#....","####.","#...#","#...#",".###."],'7':["#####","....#","...#.","..#..","..#..","..#..","..#.."],
'8':[".###.","#...#","#...#",".###.","#...#","#...#",".###."],'9':[".###.","#...#","#...#",".####","....#","....#",".###."],
'!':["#","#","#","#","#",".","#"],'?':[".###.","#...#","....#","...#.","..#..",".....","..#.."],
'.':[".",".",".",".",".",".","#"],',':["..","..","..","..","..",".#","#."],':':[".","#",".",".",".","#","."],
"'":["#","#",".",".",".",".","."],'-':["...","...","...","###","...","...","..."],
'+':[".....","..#..","..#..","#####","..#..","..#..","....."],'x':[".....",".....","#...#",".#.#.","..#..",".#.#.","#...#"],
'/':["....#","....#","...#.","..#..",".#...","#....","#...."],'&':[".##..","#..#.","#.#..",".#...","#.#.#","#..#.",".##.#"]};
const glyphFor=ch=>FONT[ch]||FONT[ch.toUpperCase()]||null;
const STYLES={
  hud:{fill:'#FFFFFF',fill2:'#DCEFF6',outline:PAL.ink}, gold:{fill:PAL.goldLight,fill2:PAL.gold,outline:PAL.ink},
  title:{fill:'#FFE69A',fill2:PAL.gold,outline:PAL.ink,ex:PAL.goldDeep}, aqua:{fill:'#C4F6FC',fill2:PAL.aqua,outline:PAL.ink},
  lime:{fill:'#DBFFC2',fill2:PAL.lime,outline:PAL.ink}, red:{fill:'#FFC2B8',fill2:PAL.coral,outline:PAL.ink},
  ink:{fill:PAL.ink,fill2:PAL.ink,outline:null}, white:{fill:'#FFFFFF',fill2:'#E8F4F8',outline:null}};
function measureText(str,px){ let w=0,n=0; for(const ch of str){ if(ch===' '){w+=3*px;continue;} const gl=glyphFor(ch); if(!gl) continue; w+=(gl[0].length+1)*px; n++; } return Math.max(0,w-(n?px:0)); }
const TextCache=new Map();
function renderText(str,px,style){
  const key=style+'|'+px+'|'+str; let c=TextCache.get(key); if(c) return c; if(TextCache.size>800) TextCache.clear();
  const st=STYLES[style]||STYLES.hud, o=st.outline?Math.max(1,Math.round(px*0.5)):0, sh=st.outline?Math.max(1,Math.round(px*0.6)):0;
  const ex=st.ex?Math.max(2,Math.round(px*1.1)):0, tw=measureText(str,px), pad=o+1;
  c=document.createElement('canvas'); c.width=Math.max(1,tw+pad*2+ex); c.height=7*px+pad*2+sh+ex; const g=c.getContext('2d'); const pts=[]; let x=pad;
  for(const ch of str){ if(ch===' '){x+=3*px;continue;} const gl=glyphFor(ch); if(!gl) continue;
    for(let r=0;r<7;r++){ const row=gl[r]; for(let q=0;q<row.length;q++) if(row[q]==='#') pts.push(x+q*px,pad+r*px,r); } x+=(gl[0].length+1)*px; }
  if(st.outline){ g.fillStyle=st.outline; for(let i=0;i<pts.length;i+=3) g.fillRect(pts[i]-o,pts[i+1]-o,px+o*2+Math.round(ex*0.5),px+o*2+sh+ex); }
  if(ex){ g.fillStyle=st.ex; for(let k=ex;k>=1;k--) for(let i=0;i<pts.length;i+=3) g.fillRect(pts[i]+Math.round(k*0.5),pts[i+1]+k,px,px); }
  for(let i=0;i<pts.length;i+=3){ g.fillStyle=pts[i+2]>=4?st.fill2:st.fill; g.fillRect(pts[i],pts[i+1],px,px); }
  c.tw=tw; c.pad=pad; TextCache.set(key,c); return c;
}
function drawText(ctx,str,x,y,px,style='hud',align='center',alpha=1,scale=1){
  px=Math.max(1,Math.round(px)); const c=renderText(String(str),px,style);
  const left=align==='center'?x-c.tw*scale/2:align==='right'?x-c.tw*scale:x, top=y-3.5*px*scale;
  if(alpha<1) ctx.globalAlpha=Math.max(0,alpha);
  ctx.drawImage(c,Math.round(left-c.pad*scale),Math.round(top-c.pad*scale),Math.round(c.width*scale),Math.round(c.height*scale));
  if(alpha<1) ctx.globalAlpha=1; return c.tw*scale;
}

// ---------- pixel icons (shared set; worlds may add their own to SPR) ----------
const SPR={
  pause:{pal:{'#':'#fff'},rows:["##...##","##...##","##...##","##...##","##...##","##...##","##...##"]},
  soundOn:{pal:{'#':'#fff'},rows:["...#.....","..##..#..","####.#.#.","####.#.#.","####.#.#.","..##..#..","...#....."]},
  soundOff:{pal:{'#':'#fff'},rows:["...#.....","..##.....","####.#.#.","####..#..","####.#.#.","..##.....","...#....."]},
  map:{pal:{'#':'#fff'},rows:["#..##..#.","##.##.##.","#.#..#.#.","#.#..#.#.","#.#..#.#.","##.##.##.",".#..#..#."]},
  star:{pal:{O:'#7A4306',Y:'#FFD23F',L:'#FFF1A8'},rows:["....O....","...OYO...","...OYO...","OOOOYOOOO","OLYYYYYYO",".OYYYYYO.","..OYYYO..",".OYYOYYO.",".OOO.OOO."]},
  hand:{pal:{K:'#14181F',W:'#FFFFFF'},rows:["..KK.....",".KWWK....",".KWWK....",".KWWKKKK.",".KWWWWWWK","KKWWWWWWK","KWKWWWWWK","KWWWWWWWK",".KWWWWWK.","..KWWWWK.","..KKKKKK."]}};
const SprCache=new Map();
function renderSprite(name,px,tint){
  const key=name+'|'+px+'|'+(tint||''); let c=SprCache.get(key); if(c) return c;
  const s=SPR[name], w=s.rows[0].length, h=s.rows.length; c=document.createElement('canvas'); c.width=w*px; c.height=h*px; const g=c.getContext('2d');
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const ch=s.rows[y][x]; if(ch==='.') continue; g.fillStyle=tint||s.pal[ch]||'#fff'; g.fillRect(x*px,y*px,px,px); }
  SprCache.set(key,c); return c;
}
function drawSprite(ctx,name,cx,cy,px,o={}){
  const c=renderSprite(name,Math.max(1,Math.round(px)),o.tint||null); if(o.alpha!=null&&o.alpha<1) ctx.globalAlpha=Math.max(0,o.alpha);
  ctx.drawImage(c,Math.round(cx-c.width/2),Math.round(cy-c.height/2)); ctx.globalAlpha=1; return c;
}
Object.assign(FONT,{'(':[".#","#.","#.","#.","#.","#.",".#"],')':["#.",".#",".#",".#",".#",".#","#."],'"':["#.#","#.#","...","...","...","...","..."],'=':["...","...","###","...","###","...","..."]});

// ---------- landmark icons & site sprites ----------
Object.assign(SPR,{
  ico_dolphin:{pal:{D:'#14304F',G:'#7C93A5',L:'#DCE6EC',K:'#0B0F14'},rows:["......DD......",".....DGGD.....","D...DGGGGDDD..","DDDDGGGGGGGKDD",".DGGGGGLLLLLLD","DDDDLLLLLLDDD.","D...DDDDDD...."]},
  ico_bfly:{pal:{K:'#14181F',B:'#2E7CF6',L:'#9CCBFF'},rows:["KK.......KK","KBK.....KBK","KBBK.K.KBBK","KBLBKKKBLBK",".KBBBKBBBK.","..KBBKBBK..",".KBBBKBBBK.",".KBLK.KLBK.","..KK...KK.."]},
  ico_burj:{pal:{K:'#14181F',S:'#AFC3D8',L:'#EEF4FA'},rows:["....K....","....K....","...KSK...","...KLK...","...KSK...","..KSLSK..","..KLSLK..","..KSLSK..",".KSLSLSK.",".KLSLSLK.",".KSLSLSK.",".KLSLSLK.","KSLSLSLSK","KLSLSLSLK","KSLSLSLSK","KKKKKKKKK"]},
  ico_frame:{pal:{K:'#14181F',G:'#F4B731',D:'#B87B12'},rows:["KKKKKKKKKKK","KGGGGGGGGGK","KGDDDDDDDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KGDK...KDGK","KKKK...KKKK"]},
  ico_fountain:{pal:{K:'#14181F',B:'#39CCE3',L:'#C4F6FC',W:'#FFFFFF'},rows:[".....W.....","..L..L..L..","..W..L..W..","..L.LBL.L..",".LB.LBL.BL.",".LB.LBL.BL.",".BLLBLBLLB.","KBBBBBBBBBK","KLLLLLLLLLK",".KKKKKKKKK."]},
  ico_motf:{pal:{K:'#14181F',S:'#C0C8D2',L:'#EEF2F6',D:'#7A8494'},rows:["...KKKKKKK...","..KSLSLSLSK..",".KSLKKKKKLSK.","KSLK.....KLSK","KLSK.....KSLK","KSLK.....KLSK",".KSLKKKKKLSK.","..KSLSLSLSK..","...KKKKKKK...","....KDDDK...."]},
  ico_chute:{pal:{K:'#14181F',R:'#F0503C',Y:'#FFD23F',S:'#E0B08A',B:'#2E7CF6'},rows:["...KKKKK...",".KKRRYRRKK.","KRRYYRYYRRK","KYRRYRYRRYK","KKKKKKKKKKK",".K.K...K.K.","..K.K.K.K..","...K.K.K...","....KKK....","....KSK....","...KBBBK...","....KBK....","...KK.KK..."]},
  ico_penguin:{pal:{K:'#14181F',W:'#FFFFFF',O:'#F4A23A',Y:'#F4B731'},rows:["...KKK...","..KKKKK..","..KWKWK..","..KKOKK..",".KYWWWYK.",".KWWWWWK.","KKWWWWWKK","KKWWWWWKK",".KWWWWWK.","..KWWWK..",".OO...OO."]},
  ico_falcon:{pal:{K:'#14181F',B:'#7A5230',L:'#C9A27A',Y:'#F2C94C'},rows:["KK.........KK","KBK.......KBK","KBBK..K..KBBK",".KBBKKBKKBBK.","..KBBLLLBBK..","...KBLYLBK...","....KLLLK....","....KBKBK....",".....K.K....."]},
  ico_cheetah:{pal:{K:'#14181F',Y:'#F2B632',L:'#FFE7A8',S:'#5A3A1E'},rows:[".KK.....KK.","KYYK...KYYK","KYYYKKKYYYK","KYSYYYYYSYK","KYYKYYYKYYK","KYYYLLLYYYK",".KYSLKLSYK.","..KYLLLYK..","...KKKKK..."]},
  samar:{pal:{K:'#14181F',H:'#2B1D16',h:'#4A3428',S:'#C98B5E',s:'#A8704A',E:'#FFFFFF',P:'#1E140E',M:'#8E4E3A',Y:'#F4C21B'},rows:[".KKKKKKKKKK.","KHHHHhHHHHHK","KHHhHHHHhHHK","KHHHHHHHHHHK","KHSSHHSSSHHK","KSSSSSSSSSSK","KSEPSSSSEPSK","KSSSSSSSSSSK","KsSSSSSSSSsK","KSSSMMMMSSSK","KKSSSSSSSSKK",".KYYYYYYYYK."]},
  lock:{pal:{K:'#14181F',G:'#F4B731',D:'#B87B12'},rows:["..KKK..",".K...K.",".K...K.","KKKKKKK","KGGGGGK","KGGKGGK","KGGKGGK","KGGGGGK","KKKKKKK"]},
  sail:{pal:{K:'#14181F',W:'#FFFFFF',B:'#9CCBFF'},rows:["..K...","..KW..","..KWW.","..KWWW","..KWBW","..KWW.",".KKWK.",".KWWK.","KKKKKK"]},
  plane:{pal:{K:'#14181F',W:'#FFFFFF'},rows:["....K....","...KWK...","...KWK...","KKKKWKKKK","KWWWWWWWK","KKKKWKKKK","...KWK...","..KKWKK..","..KKKKK.."]},
  wheel:{pal:{K:'#14181F',W:'#FFFFFF'},rows:["..KWWWK..",".W..W..W.","K...W...K","W.WWWWW.W","K...W...K",".W..W..W.","..KWWWK..","...K.K...","..K...K.."]},
  palm:{pal:{G:'#3F9D47',L:'#5BBF4F',B:'#8A6440'},rows:[".G..L..G.","GLG.L.GLG","..GLLLG..",".GL.B.LG.","G...B...G","....B....","....B....","....B....","...BBB..."]},
  dhow:{pal:{K:'#14181F',W:'#F4EEDD',B:'#8A5A33'},rows:["....K.....","....KW....","....KWW...","....KWWW..","KKKKKKKKKK",".KBBBBBBK.","..KKKKKK.."]},
  camel:{pal:{K:'#14181F',B:'#C08A4E'},rows:["......KK..",".....KBBK.","..KK.KBK..",".KBBKBBK..","KBBBBBBK..","KBBBBBBK..",".K.K.K.K..",".K.K.K.K.."]}});

Object.assign(SPR,{
  cake:{pal:{Y:'#FFD23F',R:'#F0503C',K:'#14181F',P:'#FF8FB5',W:'#FFFFFF',B:'#8A5A33'},rows:["..Y.Y.Y..","..R.R.R..",".KKKKKKK.","KPPPPPPPK","KPWPPWPPK","KBBBBBBBK","KBBBBBBBK","KBBBBBBBK","KKKKKKKKK"]},
  book:{pal:{K:'#14181F',B:'#2E7CF6',W:'#FFFFFF',L:'#9CCBFF'},rows:["KKKK...KKKK","KWWWKKKWWWK","KWLLWKWLLWK","KWWWWKWWWWK","KWLLWKWLLWK","KWWWWKWWWWK","KBBBBKBBBBK","KKKKKKKKKKK"]},
  pad:{pal:{K:'#14181F',G:'#8E9AAF',D:'#5A6475',R:'#F0503C',Y:'#FFD23F'},rows:[".KKKKKKKKK.","KGGGGGGGGGK","KGDGGGGGRGK","KDDDGGGYGRK","KGDGGGGGYGK","KGGKKKKKGGK",".KK.....KK."]}});

Object.assign(SPR,{
  trophy:{pal:{K:'#14181F',Y:'#F4B731',L:'#FFE28A',D:'#B87B12'},rows:["KKKKKKKKKKK","KYLLYYYYDDK","KKYLYYYYDKK",".KYLYYYYDK.","..KYYYYDK..","...KYYDK...","....KDK....","...KKDKK...","..KYYYYDK..","..KKKKKKK.."]},
  dl:{pal:{K:'#14181F',W:'#FFFFFF'},rows:["...KKK...","...KWK...","...KWK...","KKKKWKKKK",".KWWWWWK.","..KWWWK..","...KWK...","K...K...K","KKKKKKKKK"]},
  share:{pal:{K:'#14181F',B:'#2E7CF6'},rows:["....K....","...KBK...","..KBBBK..","....B....","KKK.B.KKK","K...B...K","K.......K","K.......K","KKKKKKKKK"]}});

// ---------- analytics + play counter (both fail silently: offline, blocked, or local) ----------
const Track={
  ev(name,params){ try{ if(typeof window.gtag==='function') window.gtag('event',name,params||{}); }catch(e){} },
  post(path,obj){ try{ if(!/^https?:/.test(location.protocol)) return; const body=JSON.stringify(obj);
    if(navigator.sendBeacon&&navigator.sendBeacon(path,new Blob([body],{type:'application/json'}))) return;
    fetch(path,{method:'POST',body,keepalive:true,headers:{'content-type':'application/json'}}).catch(()=>{}); }catch(e){} },
  play(id){ Track.post('/api/plays',{id}); },
  score(id,score,dur){ if(score>0) Track.post('/api/score',{id,score:Math.floor(score),dur:Math.round(dur)}); }};

// ---------- the 10 worlds (real locations, WGS84) ----------
const WORLDS=[
  {id:'juggle-show',n:1,live:true,name:'JUGGLE SHOW',place:'Dubai Dolphinarium',area:'Creek Park',lat:25.2365,lng:55.3240,color:'#39CCE3',icon:'ico_dolphin',tag:'Keep the balls up with the seal!'},
  {id:'fruit-rush',n:2,live:true,name:'FRUIT RUSH',place:'Dubai Butterfly Garden',area:'Al Barsha South',lat:25.0600,lng:55.2445,color:'#7ED957',icon:'ico_bfly',tag:'Slice fruit, feed the butterflies!'},
  {id:'shine-crew',n:3,name:'SHINE CREW',place:'Burj Khalifa',area:'Downtown',lat:25.1972,lng:55.2744,color:'#6C8EBF',icon:'ico_burj',tag:'Make the tallest tower sparkle'},
  {id:'frame-builder',n:4,name:'FRAME BUILDER',place:'Dubai Frame',area:'Zabeel Park',lat:25.2355,lng:55.3004,color:'#F4B731',icon:'ico_frame',tag:'Stack the golden frame'},
  {id:'fountain-conductor',n:5,name:'FOUNTAIN CONDUCTOR',place:'Dubai Fountain',area:'Downtown',lat:25.1950,lng:55.2765,color:'#2E7CF6',icon:'ico_fountain',tag:'Make the fountain dance'},
  {id:'oss-hope',n:6,name:'OSS HOPE',place:'Museum of the Future',area:'Sheikh Zayed Road',lat:25.2192,lng:55.2820,color:'#8E9AAF',icon:'ico_motf',tag:'Fix the space station'},
  {id:'camera-flyer',n:7,name:'CAMERA FLYER',place:'Skydive Dubai',area:'Palm Drop Zone',lat:25.0904,lng:55.1386,color:'#F0503C',icon:'ico_chute',tag:'Film the skydivers'},
  {id:'penguin-march',n:8,name:'PENGUIN MARCH',place:'Ski Dubai',area:'Mall of the Emirates',lat:25.1181,lng:55.2006,color:'#7FC8EE',icon:'ico_penguin',tag:'Lead the penguin parade'},
  {id:'falcon-strike',n:9,name:'FALCON STRIKE',place:'Dubai Desert',area:'Desert safari',lat:24.9950,lng:55.4000,color:'#D9A066',icon:'ico_falcon',tag:'Catch the lure, little falcon'},
  {id:'cheetah-run',n:10,name:'CHEETAH RUN',place:'Dubai Safari Park',area:'Al Warqa',lat:25.1747,lng:55.4407,color:'#E39A2E',icon:'ico_cheetah',tag:'Race across the savanna'}];
