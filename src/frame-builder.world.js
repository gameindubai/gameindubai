
/* ==========================================================================
   WORLD 4 — FRAME BUILDER @ DUBAI FRAME (Zabeel Park)
   150 m tall, 93 m wide, golden-ratio proportions, clad in gold-toned steel
   (a nod to Dubai's old name, the City of Gold). A 93 m glass-floored bridge
   joins the two towers at the top. From up there: old Dubai and the Creek to
   the north, the Burj Khalifa and Business Bay to the south.
   You drag the crane hook; a gold block drops on a steady beat onto the
   shorter tower. Keep both towers level, then lower the sky bridge.
   ========================================================================== */
scene.fog=null;
Object.assign(TEXDEF,{
  framegold:(g,r)=>{ noise16(g,r,'#E8AE34',0.06);
    for(let i=0;i<16;i++){ pxl(g,i,7,'#B9801C'); pxl(g,i,8,'#FFD76A'); pxl(g,7,i,'#B9801C'); pxl(g,8,i,'#FFD76A'); }
    for(let i=2;i<14;i++){ if(i!==7&&i!==8){ pxl(g,i,i,'#C98C22'); pxl(g,15-i,i,'#C98C22'); } }
    bevel(g,'#FFE08A','#9C6A12'); },
  fbgrass:(g,r)=>{ noise16(g,r,'#5DB74A',0.08); for(let i=0;i<24;i++) pxl(g,r()*16|0,r()*16|0,r()<0.5?'#7FD35F':'#4A9C3B'); },
  concrete:(g,r)=>{ noise16(g,r,'#B8B4AA',0.05); bevel(g,'#D2CEC4','#8F8B82'); for(let i=0;i<6;i++) pxl(g,1+(r()*14|0),1+(r()*14|0),'#A19D94'); },
  lattice:(g,r)=>{ noise16(g,r,'#F4B731',0.03); for(let i=0;i<16;i++){ pxl(g,i,i,'#1B2A3A'); pxl(g,15-i,i,'#1B2A3A'); pxl(g,0,i,'#1B2A3A'); pxl(g,15,i,'#1B2A3A'); pxl(g,i,0,'#1B2A3A'); pxl(g,i,15,'#1B2A3A'); } },
  glassfloor:(g,r)=>{ noise16(g,r,'#8FD3F0',0.02); for(let i=0;i<16;i++){ pxl(g,i,0,'#FFFFFF'); pxl(g,0,i,'#FFFFFF'); pxl(g,i,15,'#5FA6C8'); pxl(g,15,i,'#5FA6C8'); } for(let i=3;i<9;i++) pxl(g,i,12-i,'#E6F7FF'); }});
Object.assign(SPR,{
  fblock:{pal:{K:'#14181F',Y:'#F4B731',L:'#FFE08A',D:'#B9801C'},rows:["KKKKKKKKK","KLLLLLLYK","KLYYDYYDK","KLYDYDYDK","KLDDDDDDK","KLYDYDYDK","KLYYDYYDK","KYDDDDDDK","KKKKKKKKK"]},
  laser:{pal:{K:'#14181F',R:'#FF3B3B',P:'#FFB0B0',S:'#C9D2DB'},rows:["..KKKKK..","..KSSSK..","..KKRKK..","....R....","....P....","....R....","....P....","...RRR...","..R.R.R.."]},
  slowc:{pal:{K:'#14181F',W:'#FFFFFF',B:'#2E7CF6'},rows:["..KKKKK..",".KWWWWWK.","KWWWBWWWK","KWWWBWWWK","KWWWBBBWK","KWWWWWWWK","KWWWWWWWK",".KWWWWWK.","..KKKKK.."]},
  goldb:{pal:{K:'#14181F',Y:'#FFD23F',L:'#FFF1A8',D:'#C2661A'},rows:["....L....","...LYL...","KKKKYKKKK","KLLYYYLLK","KLYYYYYDK","KLYYYYYDK","KLYYYYYDK","KYDDDDDDK","KKKKKKKKK"]},
  net:{pal:{K:'#14181F',W:'#FFFFFF',G:'#7ED957'},rows:["K.......K","KWKWKWKWK","K.W.W.W.K","KWKWKWKWK","K.W.W.W.K","KWKWKWKWK",".KW.W.WK.","..KKKKK..","...GGG..."]},
  bridge:{pal:{K:'#14181F',Y:'#F4B731',A:'#8FD3F0'},rows:["KKKKKKKKKKK","KYYYYYYYYYK","KAAAAAAAAAK","KKKKKKKKKKK","KYK.....KYK","KYK.....KYK","KYK.....KYK"]}});

const worldRoot=new THREE.Group(); scene.add(worldRoot);
const actorRoot=new THREE.Group(); scene.add(actorRoot);
const FX=new Particles(actorRoot,600);
const TX=4.2, TW=3.0, BH=1.0, TD=2.4;          // tower centres ±TX, full width, block height, depth
const LEVELS=6, TOPLEVEL=24;                     // levels per wave; 24 levels = 150 m
const M_PER=150/TOPLEVEL;
const World={half:12,halfW:9,dist:40,camY:10,hookY:6,jibY:14,L:7,hudUnits:5,t:0};

// ---------- sky + Old Dubai (north, left) + New Dubai (south, right) ----------
const Backdrop=(function(){
  const c=document.createElement('canvas'); c.width=256; c.height=176; const g=c.getContext('2d'), r=mulberry32(44);
  for(let y=0;y<112;y++){ const k=y/112; g.fillStyle=rgbCss(lerp(0.38,0.93,k),lerp(0.66,0.86,k),lerp(0.92,0.8,k)); g.fillRect(0,y,256,1); }
  g.fillStyle='#EFD9AE'; g.fillRect(0,112,256,64);
  // north: the Creek, low sand-coloured buildings, wind towers, dhows
  g.fillStyle='#4E9CC4'; g.fillRect(0,118,120,5);
  for(let i=0;i<6;i++){ const x=8+i*19; g.fillStyle='#8A5A36'; g.fillRect(x,116,9,2); g.fillStyle='#F3EAD6'; g.fillRect(x+3,110,1,6); g.fillRect(x+4,111,3,4); }
  for(let x=0;x<124;x+=4){ const h=4+(r()*7|0); g.fillStyle=r()<0.5?'#E2C99A':'#D6B98A'; g.fillRect(x,112-h,4,h);
    if(r()<0.22){ g.fillStyle='#C9A870'; g.fillRect(x+1,112-h-3,2,3); g.fillStyle='#8C6A3E'; g.fillRect(x+1,112-h-3,2,1); } }
  // south: Business Bay glass, Emirates-style towers, the Burj Khalifa needle
  for(let x=136;x<256;x+=5){ const h=10+(r()*26|0); g.fillStyle=r()<0.5?'#8FB3CC':'#A7C3D6'; g.fillRect(x,112-h,4,h); g.fillStyle='#D9E8F2'; for(let y=112-h+2;y<112;y+=4) g.fillRect(x+1,y,2,1); }
  const bx=196; g.fillStyle='#C9D6E0'; [[0,70,9],[1,66,7],[2,60,5],[3,52,3],[4,40,2],[4,30,1]].forEach(([d,h,w])=>g.fillRect(bx-(w>>1)+d*0,112-h,w,h));
  g.fillStyle='#B5C4D0'; g.fillRect(bx,112-78,1,10);
  g.fillStyle='rgba(255,236,200,0.35)'; g.fillRect(0,100,256,12);
  const t=new THREE.CanvasTexture(c); t.magFilter=t.minFilter=THREE.NearestFilter; t.generateMipmaps=false;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:t,depthWrite:false})); m.position.z=-140; worldRoot.add(m); return m; })();

// ---------- Zabeel Park + the frame's foundations ----------
const Ground=new THREE.Group(); worldRoot.add(Ground);
(function(){
  const grass=new THREE.Mesh(BOXGEO,blockMat('fbgrass')); grass.scale.set(140,60,40); grass.position.set(0,-30,-8); Ground.add(grass);
  for(const s of [-1,1]){ const f=new THREE.Mesh(BOXGEO,blockMat('concrete')); f.scale.set(TW+1.2,0.5,TD+1.2); f.position.set(s*TX,0.05,0); Ground.add(f); }
  const palm=(seed)=>{ const v=new Vox(seed); v.box(-1,0,-1,1,26,1,'#8A5A36'); for(let a=0;a<6;a++){ const dx=Math.round(Math.cos(a)*1), dz=Math.round(Math.sin(a)*1);
      for(let k=1;k<9;k++) v.set(dx*k,26-Math.floor(k*k/10),dz*k,k<6?'#3F9D47':'#2E7D36'); } v.box(-1,24,-1,1,27,1,'#2E7D36'); return vmesh(v,1/5); };
  [[-13,-3],[-16,-6],[-10,-7],[13,-3],[16,-6],[11,-8],[-20,-4],[20,-4]].forEach(([x,z],i)=>{ const p=palm(60+i); p.position.set(x,0,z); Ground.add(p); });
})();

// ---------- the tower crane: mast, jib, counter-jib, cab, trolley, hook ----------
const LATGEO=(function(){ const v=new Vox(9); for(let y=0;y<8;y++){ for(const [x,z] of [[0,0],[7,0],[0,7],[7,7]]) v.set(x,y,z,'#F4B731',0.03);
    const d=(y*7/7)|0; v.set(d,y,0,'#E0A21E',0.03).set(7-d,y,7,'#E0A21E',0.03); } return v.geometry(1/8,4,0,4); })();
const Crane={mast:new THREE.Group(),jib:new THREE.Group(),segs:[]};
worldRoot.add(Crane.mast); worldRoot.add(Crane.jib);
const Cab=(function(){ const v=new Vox(12); v.box(-8,0,-6,8,12,6,'#F4B731'); v.box(-7,3,5,7,10,6,'#8FD3F0',0.02); v.box(-8,12,-6,8,13,6,'#C98C22');
  v.box(-2,3,1,2,8,4,'#FF8A1F'); v.box(-2,8,1,2,11,4,'#C58E62',0.04); v.box(-3,11,0,3,12,5,'#FFFFFF'); return vmesh(v); })();
Crane.jib.add(Cab);
const Trolley=vmesh(new Vox(13).box(-6,0,-5,6,4,5,'#3D4B5C').box(-5,-1,-4,5,0,4,'#1B2A3A')); actorRoot.add(Trolley);
const CableGeo=new THREE.BoxGeometry(0.06,1,0.06), CableMat=new THREE.MeshBasicMaterial({color:0x2B3440});
const Cables=[-1,1].map(()=>{ const m=new THREE.Mesh(CableGeo,CableMat); actorRoot.add(m); return m; });
const HookMesh=vmesh(new Vox(14).box(-3,0,-2,3,3,2,'#E8483C').box(-1,-3,-1,1,0,1,'#1B2A3A')); actorRoot.add(HookMesh);
function buildCrane(){
  for(const s of Crane.segs) Crane.mast.remove(s); Crane.segs.length=0;
  Crane.jib.children.filter(c=>c!==Cab).forEach(c=>Crane.jib.remove(c));
  const mx=-(TX+TW/2+1.6), reach=World.halfW+4;
  Crane.mastX=mx;
  for(let x=mx-4;x<reach;x+=1){ const s=new THREE.Mesh(LATGEO,VOXMAT); s.rotation.z=Math.PI/2; s.position.set(x+1,0.5,0); Crane.jib.add(s); }
  const cw=new THREE.Mesh(BOXGEO,blockMat('concrete')); cw.scale.set(2.2,1.6,1.6); cw.position.set(mx-3.4,-0.6,0); Crane.jib.add(cw);
  Cab.position.set(mx,-1.8,0.9);
}
function growMast(top){ const need=Math.ceil(top)+1; while(Crane.segs.length<need){ const s=new THREE.Mesh(LATGEO,VOXMAT); s.position.set(Crane.mastX,Crane.segs.length,-0.5); Crane.mast.add(s); Crane.segs.push(s); }
  Crane.segs.forEach((s,i)=>s.visible=i<need); }

// ---------- carried objects ----------
function goldBlockMesh(w){ const m=new THREE.Mesh(BOXGEO,blockMat('framegold')); m.scale.set(w,BH,TD); return m; }
function bridgeMesh(w){ const g=new THREE.Group(); const beam=new THREE.Mesh(BOXGEO,blockMat('framegold')); beam.scale.set(w,1.2,TD); g.add(beam);
  const floor=new THREE.Mesh(BOXGEO,blockMat('glassfloor')); floor.scale.set(w-1.2,0.25,TD-0.5); floor.position.set(0,-0.62,0); g.add(floor); g.userData.floor=floor; return g; }
const Arrow=vmesh(new Vox(21).box(-1,2,-1,1,8,1,'#F4B731').box(-3,0,-1,3,2,1,'#F4B731').box(-2,-1,-1,2,0,1,'#F4B731').box(-1,-2,-1,1,-1,1,'#F4B731'),1/4); actorRoot.add(addOutline(Arrow,1.15));
const BeatBar=new THREE.Mesh(new THREE.BoxGeometry(1,0.24,0.12),new THREE.MeshBasicMaterial({color:0x7ED957})); actorRoot.add(BeatBar);
const Laser=new THREE.Mesh(new THREE.BoxGeometry(0.08,1,0.08),new THREE.MeshBasicMaterial({color:0xFF3B3B,transparent:true,opacity:0.8,depthWrite:false})); Laser.visible=false; actorRoot.add(Laser);

// ---------- power-ups (carried by the hook as a special block) ----------
const POW={laser:{icon:'laser',bg:'#1B2A3A',label:'LASER GUIDE',say:'LASER ON!'},
  slow:{icon:'slowc',bg:'#2E7CF6',label:'SLOW CRANE',say:'NICE AND EASY!'},
  gold:{icon:'goldb',bg:'#C2661A',label:'AUTO LEVEL',say:'GOLDEN BLOCK!'},
  star:{icon:'star',bg:'#7ED957',label:'DOUBLE POINTS',say:'SHINY POINTS!'},
  net:{icon:'net',bg:'#3FA34D',label:'SAFETY NET',say:'SAFETY FIRST!'}};

// ---------- fit the camera to the screen ----------
function layout(){
  const aspect=W/H, t=Math.tan(20*Math.PI/180), fit=TX+TW/2+2.0, dist=Math.max(fit/(t*aspect),11/t), half=dist*t;
  World.dist=dist; World.half=half; World.halfW=half*aspect; World.hudUnits=(SAFE.t+122*S)/H*half*2;
  camera.aspect=aspect; camera.position.set(0,World.camY,dist); camera.lookAt(0,World.camY,0); camera.updateProjectionMatrix(); CamBase.copy(camera.position);
  const bh=(dist+140)*t*2.4, bw=bh*aspect*1.15; Backdrop.scale.set(bw,bh,1);
  buildCrane();
}
