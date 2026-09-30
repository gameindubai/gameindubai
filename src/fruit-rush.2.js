
// ---------- fruit (and hazard) models: whole + two halves with the cut face showing ----------
const FS=1.3; // fruit size on screen
const FRUIT={
  mango:{r:0.7,pts:10,flesh:'#FFB22E',juice:['#FFB22E','#FFD23F','#F07A2A']},
  orange:{r:0.62,pts:10,flesh:'#FFA530',juice:['#FFA530','#FFD08A','#FF8C1A']},
  banana:{r:0.78,pts:10,flesh:'#FFF3C4',juice:['#FFF3C4','#F7D23E','#FFFFFF']},
  melon:{r:1.0,pts:15,flesh:'#F2444B',juice:['#F2444B','#FF7A80','#E9F7C9']},
  pine:{r:0.85,pts:20,hp:2,flesh:'#FFE45C',juice:['#FFE45C','#FFF4B0','#E8B32C']},
  coco:{r:0.72,hazard:'coco'}, syrup:{r:0.66,hazard:'syrup'}};
for(const k in FRUIT) FRUIT[k].r*=FS;
function fruitVox(type){
  let v, s;
  if(type==='mango'){ s=0.19; v=voxBlob(3,4,3,(x,y,z,cx,cy)=>cy>1.8?'#7FB23A':cy>0.3?(cx>1.2?'#F07A2A':'#E8B32C'):(cx>0.8?'#E0462E':'#F07A2A'),11); v.set(0,4,0,'#6B4A1E',0).set(1,4,0,'#4FA838').set(2,5,0,'#4FA838'); }
  else if(type==='orange'){ s=0.2; v=voxBlob(3,3,3,(x,y,z,cx,cy)=>cy>1.6?'#FFB347':'#FF9A1F',12,0.05); v.set(0,3,0,'#3E9A3A',0).set(1,3,0,'#4FA838'); }
  else if(type==='melon'){ s=0.24; v=voxBlob(4,4,4,(x,y,z,cx,cy,cz)=>(Math.floor((Math.atan2(cz,cx)+Math.PI)/(Math.PI*2)*10)%2)?'#2E8B3A':'#5BBE4B',13,0.04); }
  else if(type==='pine'){ s=0.2; v=voxBlob(3,4,3,(x,y,z)=>((x+y+z)%3===0)?'#7A5212':((x+y)&1)?'#D9A21E':'#B67A16',14,0.05);
    for(let y=4;y<9;y++){ const w=y<6?1:0; for(let x=-w;x<=w;x++) for(let z=-w;z<=w;z++) if(Math.abs(x)+Math.abs(z)<=w) v.set(x,y,z,y%2?'#2E7D32':'#3E9A3A',0.05); }
    v.set(1,6,0,'#3E9A3A').set(-1,6,0,'#3E9A3A').set(0,7,1,'#2E7D32').set(0,7,-1,'#2E7D32'); }
  else if(type==='banana'){ s=0.15; v=new Vox(15);
    for(let i=-6;i<6;i++){ const cy=Math.round(-(i+0.5)*(i+0.5)/9+2); const tip=i===-6||i===5; const col=tip?'#6B4A1E':(i===-5||i===4)?'#C9CF4A':'#F7D23E';
      for(let y=cy;y<cy+2;y++) for(let z=-1;z<1;z++) v.set(i,y,z,col,0.05); if(!tip) v.set(i,cy+2,-1,col,0.05); } }
  else if(type==='coco'){ s=0.22; v=voxBlob(3,3,3,()=>'#6B4226',16,0.18); v.set(-1,2,1,'#2A1A0E',0).set(1,2,1,'#2A1A0E',0).set(0,2,2,'#2A1A0E',0); }
  else if(type==='syrup'){ s=0.14; v=new Vox(17); v.box(-3,-4,-3,3,3,3,'#D98B1E',0.05); for(let y=-2;y<1;y++) for(let x=-3;x<3;x++) v.set(x,y,2,'#FFF6E0',0.02);
    v.set(-1,-1,2,'#E0457B',0).set(0,-1,2,'#E0457B',0).set(-2,-2,2,'#E0457B',0).set(1,-2,2,'#E0457B',0); v.box(-1,3,-1,1,5,1,'#E7B24A',0.04); v.box(-2,5,-2,2,7,2,'#E0383B',0.04);
    v.set(-3,1,-3,'#F7C46A').set(-3,0,-3,'#F7C46A'); }
  return {v,s};
}
function fleshColour(type,cy,cz,R){ const d=Math.hypot(cy,cz);
  if(type==='melon') return d>R-0.7?null:d>R-1.4?'#DFF5C0':(Math.random()<0.12?'#1B1B1B':'#F2444B');
  if(type==='orange') return d>R-0.7?null:d<0.8?'#FFE3B0':'#FFA530';
  if(type==='mango') return d>R-0.8?null:d<1?'#F5E6B8':'#FFB22E';
  if(type==='pine') return d>R-0.8?null:d<1?'#FFF4B0':'#FFE45C';
  return '#FFF3C4'; }
const FGEO={};
for(const type in FRUIT){ const fv=fruitVox(type), v=fv.v, s=fv.s*FS; FGEO[type]={whole:v.geometry(s)};
  if(!FRUIT[type].hazard){ const R=type==='melon'?4:3;
    const L=v.filter(x=>x<0), Rr=v.filter(x=>x>=0);
    for(const c of L.cells.values()) if(c[0]===-1&&c[1]<(type==='pine'?4:type==='mango'?4:9)){ const col=fleshColour(type,c[1]+0.5,c[2]+0.5,R); if(col) L.set(c[0],c[1],c[2],col,0.04); }
    for(const c of Rr.cells.values()) if(c[0]===0&&c[1]<(type==='pine'?4:type==='mango'?4:9)){ const col=fleshColour(type,c[1]+0.5,c[2]+0.5,R); if(col) Rr.set(c[0],c[1],c[2],col,0.04); }
    FGEO[type].L=L.geometry(s); FGEO[type].R=Rr.geometry(s);
    const ch=new Vox(21); ch.box(-1,-1,-1,1,1,1,FRUIT[type].flesh,0.08); ch.set(0,0,0,FRUIT[type].flesh); FGEO[type].chunk=ch.geometry(0.2); } }
const OUTLINE_RED=new THREE.MeshBasicMaterial({color:0xE0383B,side:THREE.BackSide});
function makeFruitMesh(type){ const m=new THREE.Mesh(FGEO[type].whole,VOXMAT); addOutline(m,FRUIT[type].hazard?1.22:1.13,FRUIT[type].hazard?OUTLINE_RED:OUTLINE_MAT); actorRoot.add(m); return m; }

// ---------- butterflies: 12 species seen in the garden + the giant Atlas moth ----------
const SPECIES=[
  {id:'monarch',name:'MONARCH',rar:0,base:'#F28C1B',edge:'#1B1B1B',dots:'#FFFFFF',veins:true},
  {id:'queen',name:'AFRICAN QUEEN',rar:0,base:'#D9822B',edge:'#3A2414',tip:'#1B1B1B',dots:'#FFFFFF'},
  {id:'eggfly',name:'GREAT EGGFLY',rar:0,base:'#1C1C2E',edge:'#1C1C2E',spots:'#F2F2FF',patch:'#6C5CE7'},
  {id:'kite',name:'PAPER KITE',rar:0,base:'#F4F4EE',edge:'#1A1A1A',spots:'#1A1A1A'},
  {id:'jay',name:'TAILED JAY',rar:1,base:'#1C2A1E',edge:'#1C2A1E',spots:'#9BE564'},
  {id:'doris',name:'DORIS',rar:1,base:'#1E1E1E',edge:'#1E1E1E',patch:'#E85A2A',band:'#6FA8FF'},
  {id:'redrim',name:'RED RIM',rar:1,base:'#1A1414',edge:'#C8102E'},
  {id:'sulphur',name:'YELLOW SULPHUR',rar:1,base:'#F7D21E',edge:'#E0A10E',patch:'#F28C1B'},
  {id:'morpho',name:'BLUE MORPHO',rar:2,base:'#2E7CF6',edge:'#0E1A33',glow:'#8FC4FF'},
  {id:'oakleaf',name:'ORANGE OAKLEAF',rar:2,base:'#233A8C',edge:'#141414',band:'#F28C1B'},
  {id:'birdwing',name:'GOLDEN BIRDWING',rar:2,base:'#141414',edge:'#141414',hind:'#F2C21B'},
  {id:'owl',name:'OWL BUTTERFLY',rar:3,base:'#8A7A6A',edge:'#4A3624',eye:true,glow:'#7F98C8'},
  {id:'atlas',name:'ATLAS MOTH',rar:3,base:'#A0522D',edge:'#5E2A12',band:'#F2E2C0',spots:'#FFFFFF',big:true}];
const WING_ROWS=[[1,3],[0,4],[0,5],[0,5],[0,5],[0,6],[0,6],[1,5]]; // y0..7 : x from..to
function wingCol(sp,x,y){
  const [a,b]=WING_ROWS[y]; if(x<a||x>b) return null; const border=x===b||y===7||y===0||(y===3&&x>=4);
  let c=border?sp.edge:sp.base; const fore=y>=4;
  if(sp.veins&&!border&&((x===3&&fore)||(y===5&&x>=2)||(x===2&&!fore))) c=sp.edge;
  if(sp.dots&&border&&(x+y)%2===0) c=sp.dots;
  if(sp.tip&&fore&&x>=4) c=(x+y)%3===0?sp.dots:sp.tip;
  if(sp.spots&&!border&&((fore&&(x===1||x===4)&&y!==4)||(!fore&&x===2&&y===2))) c=sp.spots;
  if(sp.patch&&!fore&&!border&&x>=1&&x<=3&&y>=1) c=sp.patch;
  if(sp.band&&!border&&(y===5||(fore&&x===3))) c=sp.band;
  if(sp.hind&&!fore&&!border) c=sp.hind;
  if(sp.glow&&!border&&x<=1) c=sp.glow;
  if(sp.eye&&!fore){ if(x===2&&y===2) c='#101010'; else if(Math.abs(x-2)+Math.abs(y-2)===1) c='#F2C94C'; }
  return c; }
const SPGEO={};
function speciesGeo(sp){ if(SPGEO[sp.id]) return SPGEO[sp.id];
  const wr=new Vox(hashStr(sp.id)), wl=new Vox(hashStr(sp.id)+1);
  for(let y=0;y<8;y++) for(let x=0;x<7;x++){ const c=wingCol(sp,x,y); if(c){ wr.set(x+1,y-4,0,c,0.05); wl.set(-x-2,y-4,0,c,0.05); } }
  const b=new Vox(3); b.box(-1,-5,-1,1,3,1,'#2A2220',0.05); b.set(-1,3,0,'#2A2220').set(0,3,0,'#2A2220'); b.set(-2,4,0,'#2A2220').set(1,4,0,'#2A2220');
  return SPGEO[sp.id]={r:wr.geometry(1/10),l:wl.geometry(1/10),b:b.geometry(1/10)}; }
const Flutter=[];
function makeButterfly(sp,x,y,z){
  const g=speciesGeo(sp), grp=new THREE.Group(); grp.add(new THREE.Mesh(g.b,VOXMAT));
  const wR=new THREE.Group(); wR.add(new THREE.Mesh(g.r,VOXMAT)); grp.add(wR); const wL=new THREE.Group(); wL.add(new THREE.Mesh(g.l,VOXMAT)); grp.add(wL);
  const sc=sp.big?1.9:1; grp.scale.setScalar(sc); grp.position.set(x,y,z); actorRoot.add(grp);
  const b={sp,grp,wR,wL,x,y,z,vx:0,vy:0,vz:0,tx:x,ty:y,tz:z,mode:'wander',t:Math.random()*10,flap:rand(14,20),tray:null,slot:null,life:0};
  Flutter.push(b); return b; }
function removeButterfly(b){ actorRoot.remove(b.grp); b.dead=true; if(b.slot) b.slot.b=null; }
function wanderTarget(b){ const hw=World.halfW; b.tx=rand(-hw-6,hw+6); b.ty=rand(2.5,World.apexMax+1.5); b.tz=rand(-12,-5); }
for(let i=0;i<10;i++){ const sp=SPECIES[i%8]; const b=makeButterfly(sp,rand(-12,12),rand(3,12),rand(-12,-5)); wanderTarget(b); }
function updateButterflies(dt){
  for(const b of Flutter){ if(b.dead) continue; b.t+=dt;
    if(b.mode==='perch'){ const tp=b.tray.grp.position, o=b.slot; b.x=tp.x+o.x; b.y=tp.y+0.45; b.z=tp.z+o.z;
      const f=0.35+Math.sin(b.t*2.2)*0.35; b.wR.rotation.y=-f; b.wL.rotation.y=f; b.grp.position.set(b.x,b.y,b.z); b.grp.rotation.set(-0.5,0,0); b.life+=dt; continue; }
    if(b.mode==='toTray'){ const tp=b.tray.grp.position; b.tx=tp.x+b.slot.x; b.ty=tp.y+0.45; b.tz=tp.z+b.slot.z; }
    if(b.mode==='escort'){ if(G.swarm<=0){ b.mode='leave'; b.tx=b.x+sgn(b.x||1)*14; b.ty=b.y+6; b.tz=-6; }
      else { b.ft=(b.ft||0)-dt; if(b.ft<=0||!b.fruit||b.fruit.dead){ b.ft=0.6; const c=G.fruits.filter(f=>!f.dead&&!f.hazard); b.fruit=c.length?pick(c):null; }
        if(b.fruit){ b.tx=b.fruit.x+Math.sin(b.t*3)*0.5; b.ty=b.fruit.y+b.fruit.r+0.5; b.tz=0.7; } else { b.tx=Math.sin(b.t)*3; b.ty=7; b.tz=0.7; } } }
    const k=b.mode==='wander'?1.6:b.mode==='escort'?7:4.5, dx=b.tx-b.x, dy=b.ty-b.y, dz2=b.tz-b.z, d=Math.hypot(dx,dy,dz2);
    b.vx+=(dx/Math.max(d,0.01))*k*dt*6; b.vy+=(dy/Math.max(d,0.01))*k*dt*6+Math.sin(b.t*5)*dt*3; b.vz+=(dz2/Math.max(d,0.01))*k*dt*6;
    const sp=Math.hypot(b.vx,b.vy,b.vz), mx=b.mode==='wander'?2.4:(b.mode==='leave'?7:b.mode==='escort'?9:6); if(sp>mx){ b.vx*=mx/sp; b.vy*=mx/sp; b.vz*=mx/sp; }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
    if(b.mode==='wander'&&d<1) wanderTarget(b);
    if(b.mode==='toTray'&&d<0.25){ b.mode='perch'; b.vx=b.vy=b.vz=0; b.life=0; }
    if(b.mode==='leave'&&d<1.5) removeButterfly(b);
    const f=Math.sin(b.t*b.flap)*1.1; b.wR.rotation.y=-Math.abs(f); b.wL.rotation.y=Math.abs(f);
    b.grp.position.set(b.x,b.y,b.z); b.grp.rotation.set(-0.35,0,clamp(-b.vx*0.12,-0.5,0.5)); }
  for(let i=Flutter.length-1;i>=0;i--) if(Flutter[i].dead) Flutter.splice(i,1);
}
function speciesById(id){ return SPECIES.find(s=>s.id===id); }
function rollSpecies(boost=0){
  const c=G.combo+boost, w=[1,c>=5?0.45:0.14,c>=12?0.22:0.03,c>=25?0.08:0]; let tot=w[0]+w[1]+w[2]+w[3], r=Math.random()*tot, tier=0;
  for(let i=0;i<4;i++){ r-=w[i]; if(r<=0){tier=i;break;} } return pick(SPECIES.filter(s=>s.rar===tier)); }
function arriveButterfly(tray,sp){
  let slot=tray.slots.find(s=>!s.b);
  if(!slot){ slot=tray.slots.reduce((a,s)=>(a.b.life>s.b.life?a:s)); const old=slot.b; old.mode='leave'; old.slot=null; slot.b=null;
    old.tx=old.x+sgn(old.x||1)*14; old.ty=old.y+8; old.tz=-8; }
  const side=sgn(tray.grp.position.x||1), b=makeButterfly(sp,tray.grp.position.x+side*rand(6,10),tray.grp.position.y+rand(3,7),rand(-6,-2));
  b.mode='toTray'; b.tray=tray; b.slot=slot; slot.b=b; return b; }

// ---------- koi (Dome 2 pond) ----------
function buildKoi(kind,seed){
  const v=new Vox(seed), base=kind===2?'#F2B632':'#F4F1EA', patch=kind===1?'#1B1B1B':'#E8501E';
  v.box(-6,-1,-2,6,2,2,base,0.05); v.box(6,-1,-1,8,1,1,base,0.05); v.box(-9,-1,-1,-6,1,1,base,0.05);
  const rng=mulberry32(seed); for(let i=0;i<9;i++){ const x=-5+(rng()*10|0); v.set(x,1,-1,patch).set(x,1,0,patch); if(rng()<0.5) v.set(x+1,1,0,patch); }
  if(kind===1) for(let i=0;i<4;i++) v.set(-4+i*3,1,-2+(i%2)*3,'#E8501E');
  v.box(-13,-2,-1,-9,2,0,kind===2?'#E8A21E':'#F7F2EA',0.05); v.set(7,1,-2,'#101418',0).set(7,1,1,'#101418',0);
  v.box(2,-1,2,4,0,4,base).box(2,-1,-4,4,0,-2,base);
  const m=vmesh(v,1/10); m.position.y=-0.35; actorRoot.add(m); return m; }
const Koi=[0,1,2,0,1].map((k,i)=>({mesh:buildKoi(k,101+i),x:rand(-5,5),z:rand(1,7),a:rand(0,6.28),sp:1.2,tx:0,tz:3,rushT:0,t:rand(0,9)}));
function koiRush(x){ Koi.slice().sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)).slice(0,2).forEach(k=>{ k.tx=x+rand(-0.4,0.4); k.tz=rand(0.6,1.6); k.rushT=1.6; }); }
function updateKoi(dt){ const hw=World.halfW+3;
  for(const k of Koi){ k.t+=dt; k.rushT=Math.max(0,k.rushT-dt); const sp=k.rushT>0?4.2:1.1;
    if(k.rushT<=0&&Math.hypot(k.tx-k.x,k.tz-k.z)<0.8){ k.tx=rand(-hw,hw); k.tz=rand(0.8,8); }
    const want=Math.atan2(k.tz-k.z,k.tx-k.x); let da=want-k.a; while(da>Math.PI) da-=Math.PI*2; while(da<-Math.PI) da+=Math.PI*2;
    k.a+=clamp(da,-2.4*dt,2.4*dt); k.x+=Math.cos(k.a)*sp*dt; k.z+=Math.sin(k.a)*sp*dt;
    k.mesh.position.set(k.x,-0.38+Math.sin(k.t*2)*0.03,k.z); k.mesh.rotation.set(0,-k.a+Math.sin(k.t*(k.rushT>0?14:6))*0.18,0); } }

// ---------- boss fruit (giant) + weak point marker ----------
const BOSSDEF={melon:{name:'GIANT WATERMELON',icon:'melon',R:2.1},pine:{name:'GIANT PINEAPPLE',icon:'pine',R:1.9},mango:{name:'GIANT MANGO',icon:'mango',R:1.8}};
const BOSSGEO={};
function bossGeo(type){ if(BOSSGEO[type]) return BOSSGEO[type]; let v;
  if(type==='melon') v=voxBlob(7,7,7,(x,y,z,cx,cy,cz)=>(Math.floor((Math.atan2(cz,cx)+Math.PI)/(Math.PI*2)*14)%2)?'#2E8B3A':'#5BBE4B',31,0.05);
  else if(type==='pine'){ v=voxBlob(6,8,6,(x,y,z)=>((x+y+z)%3===0)?'#7A5212':((x+y)&1)?'#D9A21E':'#B67A16',32,0.05);
    for(let y=8;y<15;y++){ const w=y<11?2:1; for(let x=-w;x<=w;x++) for(let z=-w;z<=w;z++) if(Math.abs(x)+Math.abs(z)<=w&&(y<13||(x===0&&z===0))) v.set(x,y,z,y%2?'#2E7D32':'#3E9A3A',0.05); } }
  else { v=voxBlob(6,7,6,(x,y,z,cx,cy)=>cy>3.5?'#7FB23A':cy>0.5?(cx>2.5?'#F07A2A':'#E8B32C'):(cx>1.5?'#E0462E':'#F07A2A'),33,0.05); v.set(0,7,0,'#6B4A1E').set(0,8,0,'#6B4A1E').set(1,8,0,'#4FA838').set(2,8,0,'#4FA838').set(3,9,0,'#4FA838'); }
  return BOSSGEO[type]=v.geometry(BOSSDEF[type].R/(type==='pine'?6:type==='mango'?6:7)); }
// build every butterfly and boss shape at load (pre-warmed by the engine) instead of on first appearance
SPECIES.forEach(speciesGeo); Object.keys(BOSSDEF).forEach(bossGeo);
const WeakMark=(function(){ const v=new Vox(41); for(let x=-2;x<=2;x++){ v.set(x,0,0,'#FFE28A',0); v.set(0,x,0,'#FFE28A',0); } v.set(0,0,0,'#FFFFFF',0);
  v.set(-2,-2,0,'#F4B731',0).set(2,2,0,'#F4B731',0).set(-2,2,0,'#F4B731',0).set(2,-2,0,'#F4B731',0);
  const m=addOutline(vmesh(v,0.21),1.2); m.visible=false; m.renderOrder=4; actorRoot.add(m); return m; })();

// ---------- 2D butterfly art for the discovery card (same pattern as the 3D wings) ----------
const SpArt={};
function speciesArt(sp,px){ const key=sp.id+'|'+px; if(SpArt[key]) return SpArt[key];
  const c=document.createElement('canvas'); c.width=18*px; c.height=10*px; const g=c.getContext('2d');
  for(let pass=0;pass<2;pass++) for(let y=0;y<8;y++) for(let x=0;x<7;x++){ const col=wingCol(sp,x,y); if(!col) continue; const sy=(8-y)*px;
    if(pass===0){ g.fillStyle=PAL.ink; g.fillRect((10+x)*px-1,sy-1,px+2,px+2); g.fillRect((7-x)*px-1,sy-1,px+2,px+2); }
    else { g.fillStyle=col; g.fillRect((10+x)*px,sy,px,px); g.fillRect((7-x)*px,sy,px,px); } }
  g.fillStyle='#2A2220'; g.fillRect(8*px,2*px,2*px,7*px); g.fillRect(7*px,px,px,px); g.fillRect(10*px,px,px,px);
  return SpArt[key]=c; }
