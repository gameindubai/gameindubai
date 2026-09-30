
/* ==========================================================================
   WORLD 3 — SHINE CREW @ BURJ KHALIFA (Downtown Dubai)
   800 m up the tallest tower on Earth. A crew of 36 spends 3–4 months
   cleaning all 24,348 windows; their machines park inside the building and
   travel out on custom tracks. You ride the gondola: drag it along the roof
   track, the lance sprays the nearest sand crust by itself, the wind swings
   you like a pendulum. Every dusty window you pass ends the run sparkling.
   ========================================================================== */
scene.fog=null;
Object.assign(TEXDEF,{
  burjglass:(g,r)=>{ noise16(g,r,'#86AFD3',0.025);
    for(let y=0;y<5;y++) for(let x=0;x<16;x++) pxl(g,x,y,y<2?'#A9CBE8':'#98BEDF');
    for(let i=0;i<12;i++){ pxl(g,2+i,13-i,'#D8ECF9'); if(i<10) pxl(g,3+i,13-i,'#C4E0F4'); }
    for(let i=0;i<5;i++) pxl(g,10+i,15-i,'#E6F4FC');
    for(let x=0;x<16;x++) pxl(g,x,15,'#6E97BD'); for(let y=0;y<16;y++) pxl(g,15,y,'#7AA2C6'); }});
Object.assign(SPR,{
  pane:{pal:{K:'#14181F',G:'#6FA9DA',W:'#FFFFFF',L:'#CDE7F7'},rows:["KKKKKKKKK","KGGGGGWGK","KGGGGWLGK","KGGGWLGGK","KGGWLGGGK","KGWLGGGGK","KWLGGGGGK","KGGGGGGGK","KKKKKKKKK"]},
  nozzle:{pal:{K:'#14181F',S:'#C9D2DB',R:'#E8483C',A:'#C4F6FC'},rows:["A.A.A.A.A",".A.A.A.A.","..AAAAA..","...KSK...","...KSK...","..KSSSK..","..KRRRK..","..KRRRK..","..KKKKK.."]},
  cloud:{pal:{W:'#FFFFFF',A:'#8FE3F2'},rows:["...WWW....",".WWWWWWW..","WWWWWWWWW.","WWWWWWWWWW",".WWWWWWWW.","..........",".A..A..A..","A..A..A...","..A..A..A."]},
  crew:{pal:{K:'#14181F',Y:'#F4B731',F:'#C98B5E',O:'#FF8A1F'},rows:["K........K",".K..YY..K.","..K.FF.K..","...KOOK...","KKKKOOKKKK","KYYYYYYYYK","KYYYYYYYYK","KKKKKKKKKK"]},
  hat:{pal:{K:'#14181F',Y:'#FFD23F',L:'#FFF1A8'},rows:["...KKKK...","..KYYYYK..",".KYYLYYYK.",".KYYLYYYK.","KKKKKKKKKK","KYYYYYYYYK","KKKKKKKKKK"]},
  sand:{pal:{S:'#D9A066',D:'#A8703A'},rows:["..SSSS...",".S....S..","S..SS..S.","S.S..D.S.","S.S.DD.S.","S..D...S.",".S....S..","..SSSSS.."]}});

const worldRoot=new THREE.Group(); scene.add(worldRoot);
const actorRoot=new THREE.Group(); scene.add(actorRoot);
const FX=new Particles(actorRoot,700);
const NC=6, CW=2.2, RH=2.0, FW=NC*CW, FH=FW/2;          // the facade: 6 window columns
const colX=c=>-FH+CW*(c+0.5);
const CZ=1.15;                                          // gondola plane (in front of the glass)
const World={half:12,halfW:9,dist:40,cy:5,escY:6.3,anchorY:15,spawnY:-14,vsScale:1,vs:1.3,scroll:0,t:0};

// ---------- the view: sky, Dubai far below, drifting clouds ----------
const Backdrop=(function(){
  const c=document.createElement('canvas'); c.width=240; c.height=140; const g=c.getContext('2d'), r=mulberry32(21);
  for(let y=0;y<70;y++){ const k=y/70; g.fillStyle=rgbCss(lerp(0.36,0.76,k),lerp(0.68,0.89,k),lerp(0.9,0.96,k)); g.fillRect(0,y,240,1); }
  g.fillStyle='#DCEFF6'; g.fillRect(0,70,240,3);
  for(let y=73;y<140;y++){ const k=(y-73)/67, haze=1-k*0.75;
    for(let x=0;x<240;x+=2){ let col;
      const coast=78+Math.sin(y*0.09)*6-(y-73)*0.5;
      if(x<coast) col=[0.40,0.66,0.80]; else if(x<coast+3) col=[0.93,0.86,0.66];
      else if(x<170-(y-73)*0.3){ const b=r(); col=b<0.55?[0.80,0.80,0.78]:b<0.8?[0.70,0.75,0.80]:[0.92,0.88,0.80]; }
      else col=[0.90,0.78,0.55+0.04*Math.sin(x*0.3+y)];
      const f=[0.86,0.90,0.92]; g.fillStyle=rgbCss(lerp(col[0],f[0],haze*0.7),lerp(col[1],f[1],haze*0.7),lerp(col[2],f[2],haze*0.7)); g.fillRect(x,y,2,1); } }
  for(let i=0;i<26;i++){ const x=95+r()*70, h=2+r()*9; g.fillStyle=r()<0.5?'#B9C6D2':'#A7B6C4'; g.fillRect(x|0,(76-h+ r()*6)|0,2,h|0); }
  const t=new THREE.CanvasTexture(c); t.magFilter=t.minFilter=THREE.NearestFilter; t.generateMipmaps=false;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:t,depthWrite:false}));
  m.position.z=-130; worldRoot.add(m); return m; })();
const Clouds=[0,1,2,3,4,5].map(i=>{ const v=new Vox(300+i), w=10+(i%3)*4;
  for(let x=-w;x<w;x++) for(let y=-3;y<3;y++){ const e=(x*x)/(w*w)+(y*y)/9; if(e<1&&(e<0.7||Math.random()<0.6)) v.set(x,y,0,y>0?'#FFFFFF':'#E8F2F8',0.02); }
  const m=vmesh(v,1/4); m.position.set(0,0,-55-i*6); worldRoot.add(m); return {m,x:0,y:0,sp:0.18+0.05*i}; });
const Haze=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xD9924A,transparent:true,opacity:0,depthWrite:false}));
Haze.position.z=6; Haze.renderOrder=5; actorRoot.add(Haze);

// ---------- the facade (rebuilt on resize; scrolls to show the descent) ----------
// flat, unlit colours (this engine's worlds bake their shading; nothing here is lit)
const MAT_BAND=new THREE.MeshBasicMaterial({color:0xD5DDE5}), MAT_BANDSH=new THREE.MeshBasicMaterial({color:0x8FA2B5}), MAT_FIN=new THREE.MeshBasicMaterial({color:0xEDF1F5}),
  MAT_FINSH=new THREE.MeshBasicMaterial({color:0xB3C0CD}), MAT_EDGE=new THREE.MeshBasicMaterial({color:0xA8B4C1}), MAT_EDGESH=new THREE.MeshBasicMaterial({color:0x7D8A98});
let Facade=null;
function buildFacade(){
  if(Facade){ worldRoot.remove(Facade); Facade.traverse(o=>{ if(o.geometry&&o.geometry!==BOXGEO) o.geometry.dispose(); }); }
  let rows=Math.ceil(World.half*2/RH)+6; if(rows%2) rows++; const h=rows*RH, grp=new THREE.Group();
  grp.add(planeMesh(FW,h,'burjglass',NC,rows));
  const band=new THREE.BoxGeometry(FW+0.5,0.36,0.34), fin=new THREE.BoxGeometry(0.24,h,0.46), edge=new THREE.BoxGeometry(0.7,h,1.2);
  const bandSh=new THREE.BoxGeometry(FW+0.5,0.09,0.3), finSh=new THREE.BoxGeometry(0.07,h,0.4), edgeSh=new THREE.BoxGeometry(0.16,h,1.1);
  for(let r=0;r<=rows;r++){ const y=-h/2+r*RH, m=new THREE.Mesh(band,MAT_BAND); m.position.set(0,y,0.17); grp.add(m);
    const s=new THREE.Mesh(bandSh,MAT_BANDSH); s.position.set(0,y-0.2,0.15); grp.add(s); }
  for(let c=1;c<NC;c++){ const x=-FH+c*CW, m=new THREE.Mesh(fin,MAT_FIN); m.position.set(x,0,0.23); grp.add(m);
    const s=new THREE.Mesh(finSh,MAT_FINSH); s.position.set(x+0.14,0,0.2); grp.add(s); }
  for(const s of [-1,1]){ const m=new THREE.Mesh(edge,MAT_EDGE); m.position.set(s*(FH+0.35),0,0.2); grp.add(m);
    const e=new THREE.Mesh(edgeSh,MAT_EDGESH); e.position.set(s*(FH+0.72),0,0.2); grp.add(e); }
  worldRoot.add(grp); Facade=grp;
}
// window-pane centres line up with ((scroll + RH/2) mod RH)
function paneY(y){ const ph=World.scroll+RH/2; return ph+RH*Math.round((y-ph)/RH); }

// ---------- the gondola (building-maintenance cradle) ----------
function buildCradle(seed,vest,hatA,hatB){
  const grp=new THREE.Group(), v=new Vox(seed), Y='#F4B731', D='#B87B12', FL='#8E9AAF';
  v.box(-14,0,-5,14,2,5,FL); v.box(-14,2,-5,14,3,5,D);
  for(const x of [-14,13]) for(const z of [-5,4]) v.box(x,3,z,x+1,12,z+1,Y);
  v.box(-14,11,-5,14,12,-4,Y); v.box(-14,11,4,14,12,5,Y); v.box(-14,11,-5,-13,12,5,Y); v.box(13,11,-5,14,12,5,Y);
  v.box(-14,6,4,14,7,5,Y); for(let x=-14;x<14;x+=4){ v.box(x,2,4,x+2,4,5,'#14181F',0); v.box(x+2,2,4,x+4,4,5,'#FFD23F',0); }
  v.box(2,2,-4,7,8,-1,'#2E7CF6'); v.box(3,8,-3,6,9,-2,'#9CCBFF');                        // water tank
  const worker=(x0,hat,skin)=>{ v.box(x0-3,3,-2,x0+3,13,2,'#3D4B5C'); v.box(x0-3,13,-2,x0+3,21,2,vest); v.box(x0-3,16,1,x0+3,17,2,'#E8EEF2',0);
    v.box(x0-3,21,-3,x0+3,27,3,skin,0.04); v.set(x0-2,24,2,'#1B2A3A',0).set(x0+1,24,2,'#1B2A3A',0).set(x0-1,22,2,'#8E4E3A',0).set(x0,22,2,'#8E4E3A',0);
    v.box(x0-4,27,-4,x0+4,29,4,hat); v.box(x0-3,29,-3,x0+3,31,3,hat); v.box(x0-4,27,3,x0+4,28,6,hat); };
  worker(-6,hatA,'#C58E62'); worker(7,hatB,'#8A5A3C');
  grp.add(vmesh(v));
  const av=new Vox(seed+5); av.box(-1,-9,-1,1,0,1,'#C58E62',0.04); av.box(-1,-3,-1,1,0,1,vest); const ag=av.geometry(1/8);
  const wave=new THREE.Group(); wave.position.set(1.25,2.5,0); wave.add(new THREE.Mesh(ag,VOXMAT)); grp.add(wave);
  const lv=new Vox(seed+9); lv.box(-1,-22,-1,1,0,1,'#C9D2DB',0.02); lv.box(-2,-24,-2,2,-22,2,'#14181F',0); lv.box(-1,-4,-1,1,0,1,'#E8483C',0);
  const lance=new THREE.Group(); lance.position.set(-0.75,2.3,0.55); lance.rotation.x=-0.55; lance.add(vmesh(lv)); grp.add(lance);
  const cableGeo=new THREE.BoxGeometry(0.07,1,0.07), cmat=new THREE.MeshBasicMaterial({color:0x2B3440});
  const cables=[-1,1].map(()=>{ const m=new THREE.Mesh(cableGeo,cmat); actorRoot.add(m); return m; });
  const jetMat=new THREE.MeshBasicMaterial({color:0x8FE3F2,transparent:true,opacity:0.8,depthWrite:false});
  const jet=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.09,1,6,1,true),jetMat); jet.visible=false; actorRoot.add(jet);
  const core=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.03,1,5,1,true),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.9,depthWrite:false}));
  core.visible=false; actorRoot.add(core);
  actorRoot.add(grp); grp.scale.setScalar(0.92);
  return {grp,wave,lance,cables,jet,core,talk:0};
}
const CradMesh=buildCradle(41,'#FF8A1F','#FFD23F','#FFFFFF');
const CrewMesh=buildCradle(57,'#7ED957','#FFFFFF','#FFD23F'); CrewMesh.grp.visible=false;

// ---------- sand crusts (shared geometries, many meshes) ----------
const CRUST={dust:['#E2C184','#D9B070','#EDD197','#CFA566'],packed:['#C28E4E','#B07A3E','#D19E5E','#9C6A34'],
  mud:['#8E6A48','#7A5A3C','#A07A56','#6B4A2E'],armor:['#7A5A3C','#6B4A2E','#8C6A4A','#5A4030'],storm:['#E3A96A','#D99A5C','#E8B478','#C98A4E']};
const CrustGeo={};
for(const k in CRUST){ CrustGeo[k]=[0,1,2].map(i=>{ const pal=CRUST[k], r=mulberry32(90+i*7+k.length);
  const v=voxBlob(k==='armor'?8:8,k==='armor'?6:6,2,(x,y)=>{ const q=r(); return q<0.08?pal[3]:pal[(q*3)|0]; },500+i*13+k.length*3,0.05);
  if(k==='armor') for(let i2=0;i2<10;i2++) v.set(((r()*14)|0)-7,((r()*10)|0)-5,2,'#4A3424',0.02);
  return v.geometry(1/8); }); }
CrustGeo.core=[0,1,2].map(i=>{ const r=mulberry32(700+i);
  const v=voxBlob(7,6,3,(x,y,z,cx,cy)=>{ const d=Math.hypot(cx,cy*1.2); return d<2.2?'#FFE08A':d<3.6?(r()<0.5?'#FFB23E':'#FF8A1F'):(r()<0.6?'#F0503C':'#D9402A'); },800+i,0.04);
  return v.geometry(1/8); });

// ---------- sparkle glints on freshly cleaned glass ----------
const GlintMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0,depthWrite:false});
const Glints=Array.from({length:14},()=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(0.22,2.3,0.02),GlintMat.clone()); m.rotation.z=-0.75; m.visible=false; actorRoot.add(m); return {m,t:1,x:0,y:0}; });
let glintNext=0;
function glint(x,y){ const g=Glints[glintNext]; glintNext=(glintNext+1)%Glints.length; g.t=0; g.x=x; g.y=y; g.m.visible=true; }

// ---------- power-ups ----------
const POW={wide:{icon:'nozzle',bg:'#2E7CF6',label:'WIDE NOZZLE',say:'BIG SPRAY!'},
  rain:{icon:'cloud',bg:'#4F79B8',label:'RAIN SHOWER',say:'FREE RINSE!'},
  crew:{icon:'crew',bg:'#E39A2E',label:'CREW CRADLE',say:'BACKUP CREW!'},
  star:{icon:'star',bg:'#7ED957',label:'DOUBLE POINTS',say:'SHINY POINTS!'},
  hat:{icon:'hat',bg:'#F0503C',label:'EXTRA LIFE',say:'SAFETY FIRST!'}};

// ---------- fit the camera to the screen ----------
function layout(){
  const aspect=W/H, t=Math.tan(20*Math.PI/180), dist=Math.max((FH+2.0)/(t*aspect),11.5/t), half=dist*t;
  World.dist=dist; World.half=half; World.halfW=half*aspect; World.vsScale=half/12;
  camera.aspect=aspect; camera.position.set(0,0,dist); camera.lookAt(0,0,0); camera.updateProjectionMatrix(); CamBase.copy(camera.position);
  const hudUnits=(SAFE.t+122*S)/H*half*2;
  World.cy=Math.min(half*0.36,half-hudUnits-3.8);   // gondola (incl. the crew's heads) sits just under the HUD World.escY=World.cy+1.3; World.anchorY=half+3.5; World.spawnY=-half-2.2;
  const bd=dist+130, bh=bd*t*2.3, bw=bh*aspect*1.1; Backdrop.scale.set(bw,bh,1); Backdrop.position.set(0,-bh*0.02,-130);
  Haze.scale.set((dist-6)*t*aspect*2.4,(dist-6)*t*2.4,1);
  Clouds.forEach((c,i)=>{ c.x=(i%2?1:-1)*(FH+4+((i*7)%9)); c.y=-half+((i*11)%24); });
  buildFacade();
}
