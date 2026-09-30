/* ==========================================================================
   SAMAR'S GAME IN DUBAI — website script (needs kit/pixel.js)
   Logo word-art, a Minecraft-style map of Dubai built from real coordinates,
   decluttered location pins, card layout, and the About page art.
   ========================================================================== */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const PAGE=document.body.dataset.page, INK='#14181F';
const dprOf=()=>Math.min(window.devicePixelRatio||1,2);
const spriteURL=(n,p)=>renderSprite(n,p).toDataURL();
$$('img[data-spr]').forEach(im=>{ im.src=spriteURL(im.dataset.spr,+(im.dataset.px||4)); });

/* ---------------- skyline (logo strip, about page) ---------------- */
function skyline(width,seed){ // grid units; returns rects measured up from the base line
  const R=[], rng=mulberry32(seed), NAVY='#17416E', WIN='#2E6CA6', GOLD='#F4B731', GOLDD='#B87B12', WHITE='#E9F1F7';
  let x=0; const box=(bx,by,w,h,c)=>R.push({x:bx,y:by,w,h,c});
  const tower=(w,h)=>{ box(x,0,w,h,NAVY); for(let yy=2;yy<h-1;yy+=2) for(let xx=1;xx<w-1;xx+=2) if(rng()<0.5) box(x+xx,yy,1,1,WIN); x+=w+1; };
  const khalifa=()=>{ const c=x+4; box(c-3,0,7,6,NAVY); box(c-2,6,5,6,NAVY); box(c-1,12,3,6,NAVY); box(c,18,1,7,NAVY); for(let yy=1;yy<17;yy+=2) box(c,yy,1,1,WIN); x+=9; };
  const frame=()=>{ box(x,0,2,10,GOLD); box(x+6,0,2,10,GOLD); box(x,10,8,2,GOLD); box(x+1,0,1,10,GOLDD); box(x+7,0,1,10,GOLDD); x+=10; };
  const arab=()=>{ box(x,0,1,14,NAVY); const w=[4,5,5,5,5,4,4,4,3,3,2,2,1]; w.forEach((ww,i)=>box(x+1,i,ww,1,WHITE)); x+=8; };
  const motf=()=>{ box(x+1,0,7,1,NAVY); box(x+2,1,5,1,NAVY); box(x,2,2,4,NAVY); box(x+7,2,2,4,NAVY); box(x+1,6,2,1,NAVY); box(x+6,6,2,1,NAVY); box(x+2,7,5,1,NAVY); x+=11; };
  const palm=()=>{ box(x+1,0,1,5,'#8A6440'); box(x-1,5,5,1,'#3F9D47'); box(x,6,3,1,'#5BBF4F'); x+=5; };
  const plan=[()=>tower(3,8),()=>tower(4,12),arab,palm,()=>tower(3,9),frame,()=>tower(4,14),khalifa,()=>tower(3,11),motf,palm,()=>tower(4,10),()=>tower(3,13)];
  let i=0; while(x<width){ plan[i%plan.length](); i++; if(i>plan.length) plan.push(()=>tower(3+(rng()*2|0),6+(rng()*9|0))); }
  return R;
}
function drawSkyline(g,rects,ox,baseY,u){ for(const r of rects){ g.fillStyle=r.c; g.fillRect(ox+r.x*u,baseY-(r.y+r.h)*u,r.w*u,r.h*u); } }
function pixelCircle(g,cx,cy,rad,u,col){ g.fillStyle=col; for(let y=-rad;y<=rad;y+=u) for(let x=-rad;x<=rad;x+=u) if(x*x+y*y<=rad*rad) g.fillRect(Math.round(cx+x),Math.round(cy+y),u,u); }

/* ---------------- logo word-art ---------------- */
function drawLogo(canvas,maxCss,mode,pMax){
  const d=dprOf(), lines=mode==='line'?['GAME IN DUBAI']:['GAME','IN DUBAI'];
  const unit=Math.max(...lines.map(l=>measureText(l,1)));
  const pCss=Math.max(3,Math.min(pMax||99,mode==='line'?9:12,Math.floor(maxCss*0.94/(unit+6))));
  const p=Math.max(2,Math.round(pCss*d)), sp=Math.max(2,Math.round(p*0.46)), u=Math.max(2,Math.round(p*0.5));
  const texts=lines.map(l=>renderText(l,p,'title')), tw=Math.max(...texts.map(t=>t.width));
  const stick=renderText("SAMAR'S",sp,'hud'), stW=stick.width+sp*6, stH=stick.height+sp*3;
  const lineH=Math.round(p*9.4), W=tw+p*6, top=stH+sp*3;
  const H=top+lineH*lines.length+Math.round(p*3.2);
  canvas.width=W; canvas.height=H; canvas.style.width=Math.round(W/d)+'px'; canvas.style.height=Math.round(H/d)+'px';
  const g=canvas.getContext('2d'); g.imageSmoothingEnabled=false;
  // sun + skyline + sea behind the words
  pixelCircle(g,W-p*9,top+p*4,p*6.2,u,'#FFD23F'); pixelCircle(g,W-p*9,top+p*4,p*4.8,u,'#FFB23E');
  const base=H-u*3, sky=skyline(Math.ceil(W/u)+2,7); drawSkyline(g,sky,0,base,u);
  g.fillStyle='#39CCE3'; g.fillRect(0,base,W,u*3); g.fillStyle='#C4F6FC'; for(let x=0;x<W;x+=u*5) g.fillRect(x+((x/u)%3)*u,base+u,u*2,u);
  g.fillStyle=INK; g.fillRect(0,base,W,Math.max(1,Math.round(u/2)));
  texts.forEach((t,i)=>g.drawImage(t,Math.round((W-t.width)/2),top+i*lineH));
  // the "SAMAR'S" sticker
  g.save(); const sx=Math.round((W-tw)/2+p*0.5), sy=Math.round(sp*1.2); g.translate(sx+stW/2,sy+stH/2); g.rotate(-0.07);
  g.fillStyle=INK; g.fillRect(-stW/2-sp,-stH/2-sp,stW+sp*2,stH+sp*2+sp); g.fillStyle='#F0503C'; g.fillRect(-stW/2,-stH/2,stW,stH);
  g.fillStyle='#FF8A70'; g.fillRect(-stW/2,-stH/2,stW,sp); g.drawImage(stick,Math.round(-stick.width/2),Math.round(-stick.height/2)); g.restore();
  return {w:W/d,h:H/d};
}

/* =====================================================================
   THE MAP — geography in WGS84 (lat,lng); drawn as Minecraft map cells
   ===================================================================== */
const KX=Math.cos(25.15*Math.PI/180);
const CORE={w:55.11,e:55.465,s:24.975,n:25.30};
const COAST=[[24.40,54.40],[24.70,54.70],[24.86,54.90],[24.95,54.99],[25.00,55.04],[25.035,55.075],[25.06,55.105],[25.075,55.127],[25.090,55.1355],[25.097,55.146],
  [25.108,55.160],[25.122,55.173],[25.138,55.1885],[25.148,55.197],[25.160,55.207],[25.175,55.222],[25.190,55.236],[25.205,55.247],[25.220,55.257],[25.236,55.266],
  [25.250,55.274],[25.262,55.283],[25.270,55.292],[25.276,55.302],[25.284,55.311],[25.292,55.321],[25.298,55.336],[25.303,55.352],[25.312,55.368],[25.328,55.384],
  [25.348,55.400],[25.372,55.420],[25.40,55.445],[25.45,55.49],[25.55,55.57],[25.75,55.80],[25.95,56.10],[25.95,57.5],[24.0,57.5],[24.0,54.40]];
const CITY=[[24.96,55.02],[25.00,55.06],[25.04,55.09],[25.07,55.12],[25.09,55.14],[25.12,55.17],[25.15,55.20],[25.19,55.23],[25.23,55.26],[25.27,55.29],[25.30,55.33],
  [25.32,55.37],[25.36,55.41],[25.34,55.46],[25.27,55.47],[25.22,55.475],[25.17,55.46],[25.15,55.41],[25.13,55.35],[25.09,55.30],[25.06,55.27],[25.03,55.22],[24.99,55.16],[24.95,55.10]];
const DENSE=[[24.97,55.03],[25.02,55.08],[25.06,55.11],[25.09,55.14],[25.12,55.17],[25.15,55.20],[25.19,55.23],[25.23,55.26],[25.27,55.29],[25.30,55.33],[25.32,55.37],[25.30,55.40],[25.26,55.41],[25.235,55.38],[25.21,55.35],[25.185,55.32],[25.16,55.285],[25.12,55.245],[25.08,55.205],[25.04,55.165],[25.00,55.115],[24.96,55.07]];
const HIGHRISE=[[25.2,55.268,0.012],[25.186,55.275,0.008],[25.215,55.28,0.006],[25.08,55.14,0.009],[25.07,55.15,0.006],[25.26,55.30,0.008]];
const CREEK=[[25.2715,55.2935],[25.266,55.300],[25.258,55.307],[25.250,55.314],[25.243,55.321],[25.236,55.328],[25.228,55.333],[25.220,55.336],[25.212,55.338],[25.204,55.340]];
const CANAL=[[25.204,55.338],[25.195,55.315],[25.189,55.300],[25.185,55.285],[25.187,55.268],[25.193,55.255],[25.200,55.243]];
const CREEKPARK=[[25.243,55.3175],[25.228,55.3305]];
const ROADS=[
  [[24.95,55.02],[25.00,55.07],[25.05,55.12],[25.10,55.17],[25.13,55.20],[25.16,55.23],[25.19,55.259],[25.205,55.272],[25.225,55.287],[25.233,55.293]], // Sheikh Zayed Rd
  [[25.235,55.335],[25.19,55.30],[25.14,55.262],[25.08,55.222],[25.02,55.17],[24.97,55.12]],                                        // Al Khail Rd
  [[25.33,55.44],[25.25,55.41],[25.19,55.37],[25.14,55.33],[25.06,55.27],[24.98,55.19],[24.90,55.10]],                               // Mohammed bin Zayed Rd
  [[25.30,55.53],[25.22,55.49],[25.14,55.44],[25.05,55.37],[24.96,55.26],[24.88,55.15]]];                                           // Emirates Rd
const PARKS=[{c:[25.232,55.300],r:0.0048},{c:[25.186,55.246],r:0.004},{c:[25.215,55.455],r:0.009},{c:[25.1747,55.4407],r:0.0068,savanna:1},
  {c:[25.076,55.165],r:0.007},{c:[25.019,55.204],r:0.008},{c:[25.060,55.2445],r:0.0036,flowers:1}];
const P0=(lat,lng)=>[lng*KX,lat];
const toXY=a=>a.map(p=>P0(p[0],p[1]));
const G={coast:toXY(COAST),city:toXY(CITY),dense:toXY(DENSE),creek:toXY(CREEK),canal:toXY(CANAL),park:toXY(CREEKPARK),roads:ROADS.map(toXY)};
function pip(poly,X,Y){ let ins=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
  if(((yi>Y)!==(yj>Y))&&(X<(xj-xi)*(Y-yi)/(yj-yi)+xi)) ins=!ins; } return ins; }
function lineDist(line,X,Y){ let m=1e9; for(let i=1;i<line.length;i++){ const [ax,ay]=line[i-1],[bx,by]=line[i], dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t=l2?((X-ax)*dx+(Y-ay)*dy)/l2:0; t=t<0?0:t>1?1:t; const ex=ax+dx*t-X, ey=ay+dy*t-Y, d=ex*ex+ey*ey; if(d<m) m=d; } return Math.sqrt(m); }
const PALM_C=P0(25.1124,55.1390), PALM_B=P0(25.099,55.150);
const PA=(()=>{ const dx=PALM_C[0]-PALM_B[0], dy=PALM_C[1]-PALM_B[1], l=Math.hypot(dx,dy); return [dx/l,dy/l]; })(), PN=[PA[1],-PA[0]];
function palm(X,Y,deg){ const dx=X-PALM_C[0], dy=Y-PALM_C[1], u=dx*PA[0]+dy*PA[1], v=dx*PN[0]+dy*PN[1], av=Math.abs(v), fw=Math.max(0.00075,deg*0.38), tw=Math.max(0.0014,deg*0.55);
  if(u>-0.0168&&u<0.007&&av<tw) return 1;
  const nf=Math.max(4,Math.min(8,Math.floor(0.0154/(deg*1.9)))), du=0.0154/(nf-1);
  for(let i=0;i<nf;i++){ const u0=-0.0115+i*du; if(av>0.0012&&av<0.0138){ const along=(av-0.0012)/0.0126, fu=u0+along*0.0034; if(Math.abs(u-fu)<fw) return 1; } }
  const r=Math.hypot(u-0.0012,v); if(r>0.0200&&r<0.0200+Math.max(0.0024,deg*0.9)&&u>-0.0075) return 2; return 0; }
const WORLD_C=P0(25.226,55.170);
function worldIsl(X,Y){ const dx=(X-WORLD_C[0])/0.029, dy=(Y-WORLD_C[1])/0.024, e=dx*dx+dy*dy; if(e>1.08) return 0; if(e>0.96) return 2;
  const gx=Math.round((X-WORLD_C[0])/0.0034), gy=Math.round((Y-WORLD_C[1])/0.0034), h=hashStr(gx+','+gy)%100; if(h<28) return 0;
  const cx=WORLD_C[0]+gx*0.0034+((h%7)-3)*0.0002, cy=WORLD_C[1]+gy*0.0034; return Math.hypot(X-cx,Y-cy)<0.00125+(h%5)*0.0001?1:0; }
const DXB=P0(25.2528,55.3644), DXB_A=[Math.cos(-0.52),Math.sin(-0.52)];
function airport(X,Y){ const dx=X-DXB[0], dy=Y-DXB[1], u=dx*DXB_A[0]+dy*DXB_A[1], v=-dx*DXB_A[1]+dy*DXB_A[0];
  if(Math.abs(u)>0.024||Math.abs(v)>0.0085) return 0; if(Math.abs(u)<0.019&&(Math.abs(v-0.0033)<0.0007||Math.abs(v+0.0033)<0.0007)) return 2; return 1; }
function nearC(X,Y,lat,lng,r){ const c=P0(lat,lng); return Math.hypot(X-c[0],Y-c[1])<r; }

// colours (3 Minecraft-map shades each)
const C={sea:['#2475BA','#2A86C8','#3196D2'],shallow:['#3FA7DB','#46B1E0','#52BBE6'],wave:'#9CDDF3',creek:['#2E98CE','#35A2D6','#3DABDC'],
  beach:['#EFD9A3','#F3DEAA','#F6E4B6'],sand:['#E2C184','#E8C98A','#EDD197'],dune:['#D6AE6C','#DDB676','#E3BE80'],red:['#D99A5C','#DFA366','#E4AD70'],
  ground:['#CFC7BA','#D6CFC2','#DCD6CA'],street:['#ABA396','#B0A89B','#B5AD9F'],bldg:['#EFEAE1','#C9D9E8','#F3E4C2','#DCD4C8','#BCC6D1','#E6C9A0'],lane:['#C9BFAD','#CEC4B2','#D2C9B8'],lot:['#E3D2A8','#E7D7AF','#EADCB6'],glass:['#7FA7C9','#8FB3D6','#6F95BD','#A9C6E0'],
  park:['#58B24A','#5FB94E','#68C257'],tree:'#3C8A3A',savanna:['#B9C467','#C3CC72','#A9B85C'],flower:['#F25C9A','#FFD23F','#FF8A3D','#E8483C','#9B59D0','#FFFFFF'],
  isle:['#EAD39B','#F0DCA0','#F4E3B0'],villa:['#F2EFE9','#E9D9B8','#D98E5E','#CFE3F2'],apron:['#C4BDAF','#C9C2B4','#CEC8BB'],runway:'#4A4E55',road:['#8E9297','#93979C','#989CA1'],roadDash:'#E9ECEF',shrub:'#8FA657'};
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const CH={}; for(const k in C) CH[k]=Array.isArray(C[k])?C[k].map(hex):hex(C[k]);

let proj=null;
function makeProj(R){ const cw=(CORE.e-CORE.w)*KX, chh=CORE.n-CORE.s, s=Math.min(R.w/cw,R.h/chh);
  return {s,ox:R.x+(R.w-cw*s)/2,oy:R.y+(R.h-chh*s)/2}; }
const toScreenLL=(lat,lng)=>({x:proj.ox+(lng-CORE.w)*KX*proj.s,y:proj.oy+(CORE.n-lat)*proj.s});

function renderMap(canvas,Wc,Hc,cellCss){
  const d=dprOf(), cell=Math.max(2,Math.round(cellCss*d)), cols=Math.ceil(Wc*d/cell), rows=Math.ceil(Hc*d/cell);
  canvas.width=Math.round(Wc*d); canvas.height=Math.round(Hc*d);
  const off=document.createElement('canvas'); off.width=cols; off.height=rows; const og=off.getContext('2d'), img=og.createImageData(cols,rows), D=img.data;
  const deg=cell/d/proj.s, kind=new Uint8Array(cols*rows); // 1=water
  const X0=CORE.w*KX+(0-proj.ox)/proj.s, Y0=CORE.n+proj.oy/proj.s, step=cell/d/proj.s;
  const roadW=Math.max(0.0009,deg*0.55), creekW=Math.max(0.0017,deg*0.7), canalW=Math.max(0.0008,deg*0.5);
  const put=(i,rgb)=>{ D[i*4]=rgb[0]; D[i*4+1]=rgb[1]; D[i*4+2]=rgb[2]; D[i*4+3]=255; };
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){
    const X=X0+(q+0.5)*step, Y=Y0-(r+0.5)*step, i=r*cols+q, h=hashStr(q+':'+r), sh=h%3; let col;
    let land=pip(G.coast,X,Y), isle=0;
    if(!land){ isle=palm(X,Y,deg)||worldIsl(X,Y)||(nearC(X,Y,25.1412,55.1853,0.0013)?1:0)||(nearC(X,Y,25.0795,55.1215,0.0034)?1:0)||
      (Math.abs(Y-25.302)<0.006&&Math.abs(X/KX-55.300)<0.009?1:0); }
    if(land){
      const lat=Y, lng=X/KX;
      if(lineDist(G.creek,X,Y)<creekW||((X-P0(25.195,55.342)[0])**2/0.0095**2+(Y-25.195)**2/0.0075**2<1&&(h%5!==0))||lineDist(G.canal,X,Y)<canalW){ kind[i]=1; col=CH.creek[sh]; }
      else{
        const inCity=pip(G.city,X,Y), ap=airport(X,Y);
        let park=null; for(const p of PARKS){ if(nearC(X,Y,p.c[0],p.c[1],p.r)){ park=p; break; } }
        if(!park&&lineDist(G.park,X,Y)<0.0021&&lineDist(G.creek,X,Y)>creekW) park={};
        let road=false; for(const rd of G.roads){ if(lineDist(rd,X,Y)<roadW){ road=true; break; } }
        if(ap){ col=ap===2?(h%4===0?[255,255,255]:hex(C.runway)):CH.apron[sh]; }
        else if(road){ col=(h%6===0)?CH.roadDash:CH.road[sh]; }
        else if(park){ col=park.flowers?(h%3===0?CH.flower[h%6]:CH.park[sh]):park.savanna?CH.savanna[sh]:(h%9===0?CH.tree:CH.park[sh]); }
        else if(inCity){ const dense=pip(G.dense,X,Y), hr=dense&&HIGHRISE.some(z=>Math.hypot(X-z[1]*KX,Y-z[0])<z[2]);
          const bx=Math.floor(q/22), by=Math.floor(r/22), hd=hashStr('d'+bx+','+by), sx=5+(hd%3), sy=4+((hd>>3)%3), ox=hd%7, oy=(hd>>5)%7;
          const st=(((q+ox)%sx===0)&&hashStr('s'+Math.floor((r+oy)/sy)+','+Math.floor((q+ox)/sx))%4!==0)||(((r+oy)%sy===0)&&hashStr('t'+Math.floor((q+ox)/sx)+','+Math.floor((r+oy)/sy))%4!==0);
          const hb=hashStr('b'+(q>>1)+','+(r>>1));
          if(st) col=dense?CH.street[sh]:CH.lane[sh];
          else if(h%53===0) col=CH.park[sh];
          else if(dense) col=hb%100<(hr?74:56)?(hr?CH.glass[hb%4]:CH.bldg[hb%6]):CH.ground[sh];
          else col=hb%100<32?CH.villa[hb%4]:(h%17===0?CH.tree:CH.lot[sh]); }
        else { const red=clamp((X/KX-55.36)/0.12+(25.06-Y)/0.1,0,1), wv=Math.sin(X*900+Y*520+Math.sin(Y*300)*2);
          const pal=red>0.55?CH.red:(wv>0.55?CH.dune:CH.sand); col=(h%61===0)?CH.shrub:pal[sh]; }
      }
    } else if(isle){ kind[i]=3; col=isle===2?CH.beach[sh]:(h%5===0?CH.villa[h%3]:CH.isle[sh]); }
    else { kind[i]=2; col=CH.sea[sh]; }
    put(i,col);
  }
  // beaches and shallow water (Minecraft-map shading by "depth")
  const isSea=i=>kind[i]===2;
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const i=r*cols+q;
    if(kind[i]===0||kind[i]===3){ if((q>0&&isSea(i-1))||(q<cols-1&&isSea(i+1))||(r>0&&isSea(i-cols))||(r<rows-1&&isSea(i+cols))) put(i,CH.beach[hashStr(i+'b')%3]); }
    else if(kind[i]===2){ let near=false; const ml=j=>kind[j]===0||kind[j]===1; for(let k=1;k<=3&&!near;k++){ if((q-k>=0&&ml(i-k))||(q+k<cols&&ml(i+k))||(r-k>=0&&ml(i-k*cols))||(r+k<rows&&ml(i+k*cols))) near=true; }
      if(near) put(i,CH.shallow[hashStr(i+'s')%3]); else if(hashStr(i+'w')%47===0){ put(i,CH.wave); if(q+1<cols&&kind[i+1]===2) put(i+1,CH.wave); } } }
  og.putImageData(img,0,0);
  const g=canvas.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(off,0,0,cols*cell,rows*cell);
  // landmarks that are not games (pure scenery)
  const deco=(name,lat,lng,scale=1)=>{ const s=toScreenLL(lat,lng), c=renderSprite(name,Math.max(1,Math.round(cell*0.55*scale))); g.drawImage(c,Math.round(s.x*d-c.width/2),Math.round(s.y*d-c.height)); };
  deco('sail',25.1412,55.1853); deco('wheel',25.0795,55.1215); deco('plane',25.2528,55.3644,1.2); deco('dhow',25.262,55.304,0.8); deco('dhow',25.245,55.318,0.8);
  deco('camel',24.99,55.33); deco('camel',25.01,55.47,0.9); deco('palm',25.235,55.296); deco('palm',25.19,55.25,0.9);
  const lab=(t,lat,lng,style,px)=>{ const s=toScreenLL(lat,lng), c=renderText(t,Math.max(2,Math.round(px*d)),style); g.globalAlpha=0.9; g.drawImage(c,Math.round(s.x*d-c.width/2),Math.round(s.y*d-c.height/2)); g.globalAlpha=1; };
  lab('ARABIAN GULF',25.262,55.155,'aqua',2); lab('DESERT',24.985,55.25,'gold',2);
}

/* ---------------- home layout ---------------- */
function homePage(){
  const stage=$('#stage'), mapC=$('#map'), logoC=$('#logo'), pinsL=$('#pins'), svg=$('#leaders'), body=document.body;
  const liveSec=$('.live-sec'), soonSec=$('.soon-sec'), liveCards=$$('.card.live');
  const items=new Map($$('[data-n]').map(el=>[+el.dataset.n,el]));   // live cards + coming-soon rows
  let wide=false, hoverLine=()=>{};
  // pins + true-location dots (live: big, bouncing, "PLAY"; coming soon: small, dim, locked)
  const pins=WORLDS.map(w=>{ const el=document.createElement(w.live?'a':'button'); el.className='pin '+(w.live?'live':'soon'); el.style.setProperty('--c',w.color);
    if(w.live){ el.href='games/'+w.id+'/'; el.setAttribute('aria-label','Play '+w.name+' at '+w.place); } else { el.type='button'; el.setAttribute('aria-label',w.name+' at '+w.place+', coming soon'); }
    el.innerHTML='<span class="face"><img alt="" src="'+spriteURL(w.icon,4)+'"></span>'+(w.live?'<span class="flag">PLAY</span>':'<img class="lk" alt="" src="'+spriteURL('lock',2)+'">');
    const dot=document.createElement('span'); dot.className='dot'+(w.live?' live':''); pinsL.append(dot,el);
    const item=items.get(w.n), P={w,el,dot,item,x:0,y:0,ax:0,ay:0,s:40};
    const hot=on=>{ el.classList.toggle('hot',on); if(item) item.classList.toggle('hot',on); hoverLine(P,on); };
    el.addEventListener('mouseenter',()=>hot(true)); el.addEventListener('mouseleave',()=>hot(false));
    el.addEventListener('click',()=>Track.ev('select_content',{content_type:w.live?'game':'coming_soon',content_id:w.id,source:'pin'}));
    if(item){ item.addEventListener('mouseenter',()=>hot(true)); item.addEventListener('mouseleave',()=>hot(false)); item.addEventListener('focus',()=>hot(true)); item.addEventListener('blur',()=>hot(false));
      item.addEventListener('click',()=>{ Track.ev('select_content',{content_type:w.live?'game':'coming_soon',content_id:w.id,source:'card'}); if(!w.live) wiggle(item); }); }
    if(!w.live) el.addEventListener('click',()=>{ if(!item) return; if(!wide) item.scrollIntoView({behavior:'smooth',block:'center'}); wiggle(item); item.classList.add('hot'); setTimeout(()=>item.classList.remove('hot'),1400); });
    return P; });
  function wiggle(el){ el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
  // drifting pixel clouds
  const cl=document.createElement('canvas'); cl.width=24; cl.height=9; const cg=cl.getContext('2d'); cg.fillStyle='#fff';
  ["......XXXX..............","....XXXXXXXX....XXX.....","..XXXXXXXXXXXXXXXXXXX...",".XXXXXXXXXXXXXXXXXXXXXX.","XXXXXXXXXXXXXXXXXXXXXXXX","XXXXXXXXXXXXXXXXXXXXXXXX",".XXXXXXXXXXXXXXXXXXXXXX."]
    .forEach((row,y)=>[...row].forEach((ch,x)=>{ if(ch==='X') cg.fillRect(x,y+1,1,1); })); cg.fillStyle='#DDEBF1'; cg.fillRect(1,7,22,1);
  $$('.clouds i').forEach((c,i)=>{ c.style.backgroundImage='url('+cl.toDataURL()+')'; c.style.animationDuration=(70+i*23)+'s'; c.style.animationDelay=(-i*27)+'s'; c.style.width=(84+i*22)+'px'; c.style.height=((84+i*22)*9/24)+'px'; });

  // desktop columns: fit both columns to the screen height (bigger thumbnails when there is room)
  function fitColumns(H){
    body.classList.remove('tight','mini'); liveCards.forEach(c=>c.classList.remove('row'));
    const colTop=parseFloat(getComputedStyle(body).getPropertyValue('--colTop'))||76, avail=H-colTop-14;
    body.style.setProperty('--th','150px'); let lh=liveSec.offsetHeight;
    if(lh>avail){ const th=Math.floor(150-(lh-avail)/liveCards.length);
      if(th>=84){ body.style.setProperty('--th',th+'px'); } else { liveCards.forEach(c=>c.classList.add('row')); } lh=liveSec.offsetHeight; }
    if(lh>avail||soonSec.offsetHeight>avail) body.classList.add('tight');
    if(liveSec.offsetHeight>avail) body.classList.add('mini');          // many games: denser rows (small picture, name + stats), every stat still shown
    return liveSec.offsetHeight<=avail&&soonSec.offsetHeight<=avail;
  }
  let lastKey='', noWide='';
  function layout(){
    const W=innerWidth, H=innerHeight, colW=Math.round(clamp(W*0.23,280,340)), colTop=76;
    wide=W>=1024&&H>=520&&(W-2*(colW+40))>=400&&noWide!==W+'x'+H;
    body.classList.toggle('wide',wide); if(!wide){ body.classList.remove('tight','mini'); liveCards.forEach(c=>c.classList.remove('row')); }
    body.style.setProperty('--colW',colW+'px'); body.style.setProperty('--colTop',colTop+'px');
    if(wide&&!fitColumns(H)){ noWide=W+'x'+H; return layout(); }        // window too short for columns: stacked layout
    const heroH=wide?H:Math.round(Math.min(clamp(W*1.5,520,760),Math.max(520,H-40))); stage.style.height=wide?'':heroH+'px';
    const key=W+'x'+H+':'+dprOf()+':'+wide; if(key===lastKey) return; lastKey=key;
    const lg=drawLogo(logoC,wide?Math.min(620,W-2*(colW+56)):Math.min(W-70,400),wide?'line':'stack',wide?Math.floor(H*0.16/18.5):0);
    const logoTop=wide?12:(W<520?64:20); $('.logo').style.top=logoTop+'px';
    const top=logoTop+lg.h+(wide?6:0), side=wide?colW+16+28:12;
    const R={x:side,y:top,w:W-2*side,h:(wide?H:heroH)-top-(wide?40:16)};
    proj=makeProj(R); renderMap(mapC,W,wide?H:heroH,wide?5:(W<500?4:5));
    // pins: start just above the true spot, push apart so none overlap, keep a stem to the dot
    const big=wide?50:(W<420?40:44), small=wide?32:(W<420?26:30), gap=6;
    for(const p of pins){ p.s=p.w.live?big:small; const s=toScreenLL(p.w.lat,p.w.lng); p.ax=s.x; p.ay=s.y; p.x=s.x; p.y=s.y-p.s*0.95; p.el.style.setProperty('--ps',p.s+'px'); }
    const lb={x0:(W-lg.w)/2-8,x1:(W+lg.w)/2+8,y1:top}, pc=toScreenLL(25.1135,55.1375), pr=0.024*proj.s, minX=wide?side:6, maxX=wide?W-side:W-6;
    for(let it=0;it<160;it++){
      for(let i=0;i<pins.length;i++) for(let j=i+1;j<pins.length;j++){ const a=pins[i], b=pins[j], need=(a.s+b.s)/2+gap, dx=b.x-a.x, dy=b.y-a.y, ox=need-Math.abs(dx), oy=need-Math.abs(dy);
        if(ox>0&&oy>0){ const wa=a.w.live?0.3:0.7, wb=1-wa; if(ox<oy){ const m=ox*sgn(dx||1); a.x-=m*wa; b.x+=m*wb; } else { const m=oy*sgn(dy||1); a.y-=m*wa; b.y+=m*wb; } } }
      for(const p of pins){ p.x+=(p.ax-p.x)*0.02; p.y+=(p.ay-p.s*0.95-p.y)*0.02;
        if(p.y-p.s/2-16<lb.y1&&p.x+p.s/2>lb.x0&&p.x-p.s/2<lb.x1) p.y=lb.y1+p.s/2+16;
        { const dx=p.x-pc.x, dy=p.y-pc.y, dd=Math.hypot(dx,dy)||1, need=pr+p.s*0.6; if(dd<need){ p.x=pc.x+dx/dd*need; p.y=pc.y+dy/dd*need; } }
        p.x=clamp(p.x,minX+p.s/2,maxX-p.s/2); p.y=clamp(p.y,p.s/2+18,(wide?H:heroH)-p.s/2-8); } }
    for(const p of pins){ p.el.style.left=p.x+'px'; p.el.style.top=p.y+'px'; p.dot.style.left=p.ax+'px'; p.dot.style.top=p.ay+'px'; }
    const seg=(x1,y1,x2,y2,dash,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+INK+'" stroke-width="6" stroke-linecap="square"/>'+
      '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'#fff')+'" stroke-width="2.5" '+(dash?'stroke-dasharray="6 5"':'')+' stroke-linecap="square"/>';
    svg.innerHTML=pins.map(p=>seg(p.x,p.y+p.s/2,p.ax,p.ay,false)).join('');
    hoverLine=(p,on)=>{ const old=svg.querySelector('.hl'); if(old) old.remove(); if(!on||!wide||!p.item) return;
      const r=p.item.getBoundingClientRect(), left=r.left+r.width/2<W/2, ax=left?r.right:r.left, ay=r.top+r.height/2;
      const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.setAttribute('class','hl'); g.innerHTML=seg(ax,ay,p.x+(left?-p.s/2:p.s/2),p.y,true,'#FFD23F'); svg.appendChild(g); };
  }
  let t=0; addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(layout,120); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ lastKey=''; noWide=''; layout(); });
  layout();
  fillStats(()=>{ if(wide&&!fitColumns(innerHeight)){ noWide=innerWidth+'x'+innerHeight; lastKey=''; layout(); } });
  // soft sand texture behind the stacked layout
  const sd=document.createElement('canvas'); sd.width=sd.height=16; const sg=sd.getContext('2d'), rr=mulberry32(3);
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const k=0.94+rr()*0.1; sg.fillStyle=rgbCss(0.91*k,0.79*k,0.54*k); sg.fillRect(x,y,1,1); }
  body.style.backgroundImage='url('+sd.toDataURL()+')'; body.style.backgroundSize='48px 48px';
}

/* ---------------- top score + plays on the playable cards (Cloudflare D1 via /api/stats) ---------------- */
function fillStats(after){
  const cs=$$('.card.live[data-id]'); if(!cs.length||!/^https?:/.test(location.protocol)) return;
  fetch('/api/stats',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null).then(d=>{ if(!d) return;
    cs.forEach(c=>{ const s=d[c.dataset.id]||{plays:0,best:0}, st=c.querySelector('.stats'); if(!st) return;
      const top=st.querySelector('.top'), pl=st.querySelector('.plays'), first=st.querySelector('.first');
      if(s.best>0){ top.querySelector('b').textContent=fmt(s.best); top.hidden=false; }
      if(s.plays>0){ pl.textContent=fmt(s.plays)+(s.plays===1?' PLAY':' PLAYS'); pl.hidden=false; } else first.hidden=false;
      st.hidden=false; });
    if(after) after(); }).catch(()=>{});
}

/* ---------------- install as an app (PWA) ---------------- */
function pwa(){
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
  { addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(r=>r.update()).catch(()=>{}));
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{}); }); }
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true, btn=$('#install'), tip=$('#iosTip');
  if(standalone){ Track.ev('app_open'); return; } if(!btn) return;
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1); let deferred=null;
  addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; btn.hidden=false; });
  addEventListener('appinstalled',()=>{ btn.hidden=true; if(tip) tip.hidden=true; Track.ev('app_installed'); });
  if(ios) btn.hidden=false;
  btn.addEventListener('click',async()=>{ Track.ev('app_install_click',{platform:ios?'ios':'other'});
    if(deferred){ deferred.prompt(); const r=await deferred.userChoice; Track.ev('app_install_choice',{outcome:r.outcome}); deferred=null; if(r.outcome==='accepted') btn.hidden=true; }
    else if(tip) tip.hidden=!tip.hidden; });
  if(tip) tip.addEventListener('click',()=>{ tip.hidden=true; });
}

/* ---------------- about page ---------------- */
function aboutPage(){
  const lc=$('#logo'); if(lc) drawLogo(lc,Math.min(innerWidth-150,300),'stack');
  const sc=$('#scene'); if(sc){ const d=dprOf(), r=sc.getBoundingClientRect(), W=Math.round(r.width*d), H=Math.round(r.height*d), g=sc.getContext('2d');
    sc.width=W; sc.height=H; g.imageSmoothingEnabled=false; const u=Math.max(3,Math.round(W/150));
    const bands=['#5FC3EE','#6DCAF0','#7ED2F2','#94DAF4','#AAE2F6']; bands.forEach((c,i)=>{ g.fillStyle=c; g.fillRect(0,Math.round(H*i/bands.length*0.8),W,H); });
    pixelCircle(g,W*0.84,H*0.2,u*9,u,'#FFD23F'); pixelCircle(g,W*0.84,H*0.2,u*7,u,'#FFB23E');
    g.fillStyle='rgba(255,255,255,0.75)'; for(let i=0;i<14;i++){ const y=Math.round(H*(0.12+i*0.05)), x=Math.round((i*37)%80)*u; g.fillRect(x,y,u*(8+(i%4)*4),u); }
    const base=H-u*4; drawSkyline(g,skyline(Math.ceil(W/u)+2,11),0,base,u); g.fillStyle='#39CCE3'; g.fillRect(0,base,W,u*4); g.fillStyle=INK; g.fillRect(0,base,W,Math.max(2,u/2)); }
  const sk=$('#skyline'); if(sk){ const d=dprOf(), W=Math.round(innerWidth*d), H=Math.round(120*d), u=Math.max(3,Math.round(5*d)), g=sk.getContext('2d');
    sk.width=W; sk.height=H; const base=H-u*5; drawSkyline(g,skyline(Math.ceil(W/u)+2,23),0,base,u); g.fillStyle='#39CCE3'; g.fillRect(0,base,W,u*5);
    g.fillStyle='#C4F6FC'; for(let x=0;x<W;x+=u*6) g.fillRect(x,base+u*2,u*3,u); g.fillStyle=INK; g.fillRect(0,base,W,Math.max(2,u/2)); }
}
function lostPage(){ const lc=$('#logo'); if(lc) drawLogo(lc,Math.min(innerWidth-60,320),'stack'); }

pwa();
if(PAGE==='home') homePage(); else if(PAGE==='about'){ aboutPage(); fillStats(); let t=0; addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(aboutPage,150); }); } else if(PAGE==='lost') lostPage();
window.GID={drawLogo,renderSprite};
})();
