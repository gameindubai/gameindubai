
/* ==========================================================================
   WORLD 1 — JUGGLE SHOW @ DUBAI DOLPHINARIUM (Creek Park)
   Indoor 180° amphitheatre around a saltwater pool, dolphin & seal show,
   exotic bird show (painting cockatoo, basketball macaw, talking African grey).
   ========================================================================== */
scene.fog=new THREE.Fog(0x0D2340,50,125);
function seatTex(g,r,base){noise16(g,r,base,0.07);for(let y=0;y<5;y++)for(let x=0;x<16;x++)pxl(g,x,y,shadeHex(base,0.2));
  for(let x=0;x<16;x++){pxl(g,x,5,shadeHex(base,-0.35));pxl(g,x,15,shadeHex(base,-0.3));}for(const x of[0,15])for(let y=0;y<16;y++)pxl(g,x,y,shadeHex(base,-0.25));}
Object.assign(TEXDEF,{
  tile:(g,r)=>{noise16(g,r,'#8FD8E8',0.04);for(let i=0;i<16;i++){pxl(g,i,7,'#63BDD2');pxl(g,7,i,'#63BDD2');pxl(g,i,15,'#63BDD2');pxl(g,15,i,'#63BDD2');}},
  deep:(g,r)=>{noise16(g,r,'#2C8FB6',0.05);for(let i=0;i<16;i++){pxl(g,i,15,'#237BA0');pxl(g,15,i,'#237BA0');pxl(g,i,7,'#2884AA');pxl(g,7,i,'#2884AA');}},
  seatT:(g,r)=>seatTex(g,r,'#1C9AA0'), seatN:(g,r)=>seatTex(g,r,'#1E4F82'), seatR:(g,r)=>seatTex(g,r,'#C4343A'),
  concrete:(g,r)=>{noise16(g,r,'#56636F',0.06);for(let i=0;i<16;i++){pxl(g,i,0,'#9AA6B0');pxl(g,i,1,'#7C8893');}},
  wall:(g,r)=>{noise16(g,r,'#13304F',0.08);bevel(g,'#1B3C61','#0D2442');}});
Object.assign(SPR,{
  fish:{pal:{'#':'#14304F',W:'#9ED6EA',L:'#E6F8FD',K:'#0B0F14',T:'#5DB3D1'},rows:["##....####..","#T#.##WWWW#.",".#T#WWWWWWW#","..##WWWWWKW#",".#T#LLLLLLL#","#T#.##LLLL#.","##....####.."]},
  whistle:{pal:{D:'#14181F',L:'#FFE08A',Y:'#F4B731'},rows:["......DDDD.","DDDDDDLLLLD","DLLLLLYYDYD","DYYYYYYYDYD","DDDDDDYYYYD","......DDDD."]},
  dolphin:{pal:{D:'#14304F',G:'#7C93A5',L:'#DCE6EC',K:'#0B0F14'},rows:["......DD......",".....DGGD.....","D...DGGGGDDD..","DDDDGGGGGGGKDD",".DGGGGGLLLLLLD","DDDDLLLLLLDDD.","D...DDDDDD...."]},
  hoop:{pal:{R:'#E8561F',W:'#F4F4F4',D:'#14181F'},rows:["DDDDDDDDD","DRRRRRRRD",".DW.W.WD.",".DW.W.WD.","..DW.WD..","..DWWWD..","...DDD..."]},
  macaw:{pal:{R:'#D8262C',W:'#F4EDE4',K:'#14181F',B:'#E9E2D0',G:'#2FA84F',U:'#2455C8'},rows:["..KKKK..",".KRRRRK.","KRWWRRRK","KRWKRRRK","KRWWBBRK",".KRBBKK.",".KGGUK..","KGUUK..."]}});
const worldRoot=new THREE.Group(); scene.add(worldRoot);
const actorRoot=new THREE.Group(); scene.add(actorRoot);
const FX=new Particles(actorRoot);
const World={halfW:6,lookY:6.2,dist:30,pitch:0.2,cheerT:0,t:0};
const cv=x=>{const a=Math.abs(x)-16;return a>0?Math.min(12,Math.round(a*a/10)):0;}; // amphitheatre curve

// ---------- arena ----------
(function buildArena(){
  const B=new Batch();
  for(let x=-17;x<=17;x++){ B.add('quartz',x,0,-6); B.add('quartz',x,0,15); }
  for(let z=-5;z<=14;z++){ B.add('quartz',-17,0,z); B.add('quartz',17,0,z); }
  for(let x=-40;x<=40;x++){
    const c=cv(x), aisle=Math.abs(x)%9===4;
    for(let r=0;r<12;r++){ const mat=aisle?'concrete':(r<2?'seatR':(Math.floor((x+40)/9)%2?'seatT':'seatN')); B.add(mat,x,1+r,-9-r+c); }
    for(let y=13;y<=28;y++) B.add(y===13?'gold':'wall',x,y,-21+c);
    if(x%4===0) B.add('lamp',x,26,-20+c);
  }
  for(let x=-7;x<=7;x++){ B.add('gold',x,16.5,-20); B.add('gold',x,22.5,-20); }
  for(let y=17.5;y<=21.5;y++){ B.add('gold',-7,y,-20); B.add('gold',7,y,-20); }
  B.build(worldRoot);
  const water=planeMesh(33,20,'water',33,20,1,{transparent:true,opacity:0.8,depthWrite:false});
  water.rotation.x=-Math.PI/2; water.position.set(0,0,4.5); water.renderOrder=1; worldRoot.add(water); World.water=water;
  const floor=planeMesh(33,20,'deep',33,20,0.9); floor.rotation.x=-Math.PI/2; floor.position.set(0,-3,4.5); worldRoot.add(floor);
  const backW=planeMesh(33,3,'tile',33,3,0.92); backW.position.set(0,-1.5,-5.5); worldRoot.add(backW);
  for(const s of[-1,1]){ const sw=planeMesh(20,3,'tile',20,3,0.74); sw.rotation.y=s*Math.PI/2*-1; sw.position.set(s*16.5,-1.5,4.5); worldRoot.add(sw); }
  const deckB=planeMesh(35,2,'quartz',35,2,1); deckB.rotation.x=-Math.PI/2; deckB.position.set(0,0.5,-7.5); worldRoot.add(deckB);
  for(const s of[-1,1]){ const d=planeMesh(30,45,'quartz',30,45,1); d.rotation.x=-Math.PI/2; d.position.set(s*32.5,0.5,1.5); worldRoot.add(d); }
  const front=planeMesh(96,16,'quartz',96,16,1); front.rotation.x=-Math.PI/2; front.position.set(0,0.5,23.5); worldRoot.add(front);
})();

// ---------- crowd (instanced, jumps when it cheers) ----------
const Crowd=(function(){
  const rng=mulberry32(99), seats=[];
  const shirts=['#F4F4F4','#F4F4F4','#F4F4F4','#1B1B1F','#1B1B1F','#D9534A','#3B7DD8','#E8C040','#44A866','#E07AB0','#8A63D2','#F08A3C'];
  const skins=['#F1C9A5','#D9A47C','#B07A52','#8A5A3C','#5E3B26'];
  for(let x=-40;x<=40;x++){ if(Math.abs(x)%9===4) continue; const c=cv(x);
    for(let r=0;r<12;r++){ if(rng()<0.36) continue; const shirt=shirts[(rng()*shirts.length)|0];
      let hat=null; if(shirt==='#F4F4F4'&&rng()<0.6) hat='#FAFAFA'; else if(shirt==='#1B1B1F'&&rng()<0.75) hat='#1B1B1F'; else if(rng()<0.45) hat=pick(['#2A1B12','#3A2A1E','#111111']);
      seats.push({x:x+(rng()-0.5)*0.12,y:1.5+r,z:-9-r+c,ph:rng()*6.28,amp:0.6+rng()*0.7,shirt,skin:skins[(rng()*skins.length)|0],hat}); } }
  const mat=tintable(new THREE.MeshBasicMaterial({vertexColors:true}),0.72);
  const hats=seats.filter(s=>s.hat);
  const body=new THREE.InstancedMesh(BOXGEO,mat,seats.length), head=new THREE.InstancedMesh(BOXGEO,mat,seats.length), hatM=new THREE.InstancedMesh(BOXGEO,mat,Math.max(1,hats.length));
  [body,head,hatM].forEach(m=>{m.frustumCulled=false;worldRoot.add(m);});
  const col=new THREE.Color(), M=new THREE.Matrix4();
  seats.forEach((s,i)=>{ body.setColorAt(i,col.set(s.shirt)); head.setColorAt(i,col.set(s.skin)); });
  hats.forEach((s,i)=>hatM.setColorAt(i,col.set(s.hat)));
  function place(t,cheer){
    let hi=0;
    for(let i=0;i<seats.length;i++){ const s=seats[i];
      const j=cheer>0?Math.max(0,Math.sin(t*11+s.ph))*0.42*s.amp*cheer:Math.max(0,Math.sin(t*1.3+s.ph))*0.03;
      M.makeScale(0.72,0.8,0.5); M.setPosition(s.x,s.y+0.4+j,s.z); body.setMatrixAt(i,M);
      M.makeScale(0.56,0.56,0.56); M.setPosition(s.x,s.y+1.08+j,s.z); head.setMatrixAt(i,M);
      if(s.hat){ M.makeScale(0.64,0.2,0.64); M.setPosition(s.x,s.y+1.38+j,s.z); hatM.setMatrixAt(hi++,M); } }
    body.instanceMatrix.needsUpdate=head.instanceMatrix.needsUpdate=hatM.instanceMatrix.needsUpdate=true;
  }
  place(0,0);
  return {place};
})();

// ---------- big screen ----------
const Screen=(function(){
  const c=document.createElement('canvas'); c.width=150; c.height=60;
  const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter; t.generateMipmaps=false;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(13,5.2),tintable(new THREE.MeshBasicMaterial({map:t}),0.78)); m.position.set(0,19.5,-19.45); worldRoot.add(m);
  function set(l1,l2){ const g=c.getContext('2d'); g.fillStyle='#061428'; g.fillRect(0,0,150,60);
    g.fillStyle='#0B2442'; for(let y=1;y<60;y+=3) for(let x=1;x<150;x+=3) g.fillRect(x,y,2,2);
    const p1=measureText(l1,3)<=138?3:2, a=renderText(l1,p1,'gold'); g.drawImage(a,Math.round(75-a.width/2),l2?5:Math.round(30-a.height/2));
    if(l2){ const p2=measureText(l2,2)<=140?2:1, b=renderText(l2,p2,'aqua'); g.drawImage(b,Math.round(75-b.width/2),38); }
    t.needsUpdate=true; }
  function art(kind){ const g=c.getContext('2d'); g.fillStyle='#061428'; g.fillRect(0,0,150,60);
    g.fillStyle='#0B2442'; for(let y=1;y<60;y+=3) for(let x=1;x<150;x+=3) g.fillRect(x,y,2,2);
    const d=renderSprite(kind||'dolphin',kind==='macaw'?5:3), s=renderSprite(kind==='macaw'?'hoop':'star',2);
    g.drawImage(d,Math.round(75-d.width/2),Math.round(30-d.height/2)); g.drawImage(s,18,10); g.drawImage(s,112,32); t.needsUpdate=true; }
  return {set,art};
})();

// ---------- spotlights ----------
const Cones=[-9,0,9].map((x,i)=>{ const m=new THREE.Mesh(new THREE.ConeGeometry(3.4,28,12,1,true),
  new THREE.MeshBasicMaterial({color:i===1?0xFFE3A0:0xBDEBFF,transparent:true,opacity:0.055,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  m.position.set(x,14,-2.5); m.renderOrder=3; worldRoot.add(m); return m; });

// ---------- seal (the player) ----------
const Seal=(function(){
  const grp=new THREE.Group(); actorRoot.add(grp);
  const b=new Vox(11); b.box(-6,-6,-5,6,16,5,'#5B4A42',0.07);
  for(let y=-6;y<16;y++){ b.del(-6,y,-5).del(5,y,-5).del(-6,y,4).del(5,y,4); }
  for(let x=-6;x<6;x++){ b.del(x,15,-5).del(x,15,4); } for(let z=-5;z<5;z++){ b.del(-6,15,z).del(5,15,z); }
  for(let x=-4;x<4;x++) for(let y=-4;y<13;y++) b.set(x,y,4,'#A38D7A',0.05);
  grp.add(vmesh(b));
  const head=new THREE.Group(); head.position.set(0,2.0,-0.45); head.rotation.x=-0.55; grp.add(head);
  const h=new Vox(12); h.box(-5,0,-4,5,8,5,'#5F4E45',0.07);
  for(let y=0;y<8;y++){ h.del(-5,y,-4).del(4,y,-4).del(-5,y,4).del(4,y,4); } for(let x=-5;x<5;x++){ h.del(x,7,-4).del(x,7,4); }
  for(let z=-4;z<5;z++){ h.del(-5,7,z).del(4,7,z); }
  h.box(-3,1,5,3,5,9,'#77655C',0.06); h.box(-3,1,8,3,2,9,'#4A3B33',0.03); h.box(-2,3,9,2,5,10,'#15100E',0.02);
  h.set(-4,5,4,'#0E0B0A',0).set(-3,5,4,'#0E0B0A',0).set(-4,6,4,'#0E0B0A',0).set(-3,6,4,'#F4F4F4',0);
  h.set(2,5,4,'#0E0B0A',0).set(3,5,4,'#0E0B0A',0).set(3,6,4,'#0E0B0A',0).set(2,6,4,'#F4F4F4',0);
  for(const z of[6,7]){ h.set(-3,3,z,'#E2D8CA',0).set(2,3,z,'#E2D8CA',0); }
  h.set(-5,8,0,'#4A3B33').set(4,8,0,'#4A3B33');
  head.add(vmesh(h));
  const fr=new THREE.Group(); fr.position.set(0.72,1.3,0.1); grp.add(fr);
  const fv=new Vox(13); fv.box(0,-9,-2,3,0,3,'#46382F',0.07); fv.del(2,-9,-2).del(2,-9,2); fr.add(vmesh(fv));
  const fl=new THREE.Group(); fl.position.set(-0.72,1.3,0.1); grp.add(fl);
  const fv2=new Vox(14); fv2.box(-3,-9,-2,0,0,3,'#46382F',0.07); fv2.del(-3,-9,-2).del(-3,-9,2); fl.add(vmesh(fv2));
  grp.scale.setScalar(1.25);
  return {grp,head,fr,fl,x:0,tx:0,vx:0,bob:0,kick:0,clap:0,t:0,
    noseY(){return 4.0+this.bob;}};
})();

// ---------- podiums & trainers (wetsuits, whistles) ----------
function buildPodium(){ const g=new THREE.Group(); for(let y=-3;y<=1;y++){ const m=new THREE.Mesh(BOXGEO,blockMat('quartz')); m.position.y=y; g.add(m); }
  const top=new THREE.Mesh(BOXGEO,blockMat('gold')); top.position.y=2; g.add(top); g.position.z=-1.4; worldRoot.add(g); return g; }
const Podiums=[buildPodium(),buildPodium()];
function buildTrainer(skin,hair,female,seed){
  const grp=new THREE.Group(), suit='#1C2F4F', teal='#1FA3A8', v=new Vox(seed);
  v.box(-4,0,-2,0,12,2,suit); v.box(0,0,-2,4,12,2,suit); v.box(-4,0,-2,4,2,2,'#0E151E');
  v.box(-4,12,-2,4,24,2,suit); for(let x=-4;x<4;x++){ v.set(x,21,1,teal).set(x,20,1,teal); }
  v.set(-1,16,1,'#F4B731',0).set(0,16,1,'#F4B731',0); for(let y=17;y<20;y++){ v.set(-2,y,1,'#E8E8E8',0); v.set(1,y,1,'#E8E8E8',0); }
  v.box(-4,24,-4,4,32,4,skin,0.04); v.box(-4,30,-4,4,32,4,hair); v.box(-4,25,-4,4,30,-3,hair);
  if(female){ v.box(-4,25,-4,-3,30,3,hair); v.box(3,25,-4,4,30,3,hair); v.box(-2,26,-7,2,30,-4,hair); }
  v.set(-3,27,3,'#FFFFFF',0).set(-2,27,3,'#1B2A3A',0).set(1,27,3,'#1B2A3A',0).set(2,27,3,'#FFFFFF',0).set(-1,25,3,'#8E4E3A',0).set(0,25,3,'#8E4E3A',0);
  grp.add(vmesh(v));
  const av=new Vox(seed+5); av.box(-2,-12,-2,2,0,2,suit); av.box(-2,-12,-2,2,-9,2,skin,0.04); av.box(-2,-5,-2,2,-4,2,teal);
  const ag=av.geometry(1/8);
  const armR=new THREE.Group(); armR.position.set(0.75,3.0,0); armR.add(new THREE.Mesh(ag,VOXMAT)); grp.add(armR);
  const armL=new THREE.Group(); armL.position.set(-0.75,3.0,0); armL.add(new THREE.Mesh(ag,VOXMAT)); grp.add(armL);
  actorRoot.add(grp); return {grp,armR,armL,toss:0,clap:0};
}
const Trainers=[buildTrainer('#B07A52','#1B1410',true,31),buildTrainer('#E6B894','#3A2616',false,37)];
Trainers[0].side=-1; Trainers[1].side=1;

// ---------- the talkative African grey (commentator) ----------
const Parrot=(function(){
  const grp=new THREE.Group(); actorRoot.add(grp);
  const v=new Vox(41), g1='#8C9196', g2='#6E7378';
  v.box(-2,0,-2,2,6,2,g1); for(let y=1;y<6;y++) for(let z=-2;z<2;z++){ v.set(-2,y,z,g2); v.set(1,y,z,g2); }
  v.box(-2,6,-2,2,10,3,'#B3B8BD'); for(let x=-2;x<2;x++) for(let y=7;y<9;y++) v.set(x,y,2,'#E3E6E8',0.03);
  v.set(-2,8,2,'#101418',0).set(1,8,2,'#101418',0); v.box(-1,6,3,1,9,4,'#1C1C1C',0.02); v.set(-1,6,4,'#1C1C1C',0).set(0,6,4,'#1C1C1C',0);
  v.box(-1,-3,-2,1,0,0,'#D12B2B',0.05); v.box(-2,-1,0,-1,0,1,'#3A3A3A'); v.box(0,-1,0,1,0,1,'#3A3A3A');
  const body=vmesh(v,1/5.2); body.position.y=0.2; grp.add(body);
  const bar=new THREE.Mesh(BOXGEO,blockMat('gold')); bar.scale.set(2.0,0.16,0.16); grp.add(bar);
  const ropeMat=new THREE.MeshBasicMaterial({color:0x2B3542});
  const ropes=[-0.9,0.9].map(x=>{const r=new THREE.Mesh(BOXGEO,ropeMat);r.scale.set(0.08,16,0.08);r.position.set(x,8,0);grp.add(r);return r;});
  const post=new THREE.Mesh(BOXGEO,blockMat('quartz')); post.scale.set(0.3,9,0.3); post.position.y=-4.5; grp.add(post);
  return {grp,body,ropes,post,base:new THREE.Vector3(3,15,-3),mode:'swing',talk:0};
})();

// ---------- dolphins (bottlenose) ----------
function buildDolphin(seed){
  const v=new Vox(seed), G1='#7C93A5', BL='#DCE6EC', DK='#647C8F';
  v.box(-10,-3,-3,10,4,4,G1,0.06);
  for(let x=-9;x<10;x++) for(let z=-2;z<3;z++) v.set(x,-3,z,BL,0.04);
  for(let x=-6;x<9;x++) for(let z=-2;z<3;z++) v.set(x,-2,z,BL,0.04);
  for(let x=-10;x<10;x++){ v.del(x,3,-3).del(x,3,3).del(x,-3,-3).del(x,-3,3); }
  v.box(10,-2,-3,15,4,4,G1,0.06); v.del(14,3,-3).del(14,3,3);
  v.box(15,-2,-2,19,1,3,DK,0.05); for(let x=15;x<19;x++) for(let z=-2;z<3;z++) v.set(x,-2,z,BL,0.04);
  v.set(13,1,3,'#101418',0).set(13,1,-3,'#101418',0);
  v.box(-3,4,0,3,5,1,DK); v.box(-2,5,0,3,6,1,DK); v.box(0,6,0,3,7,1,DK); v.box(1,7,0,3,8,1,DK);
  v.box(-16,-2,-2,-10,3,3,G1,0.06); v.box(-19,-1,-1,-16,2,2,G1,0.06);
  v.box(-22,0,-6,-19,1,7,DK,0.05); v.del(-22,0,-6).del(-22,0,6);
  v.box(3,-4,4,7,-2,6,DK); v.box(3,-4,-5,7,-2,-3,DK);
  const m=vmesh(v); m.position.y=-20; actorRoot.add(m); return {mesh:m,busy:false,leap:null};
}
const Dolphins=[buildDolphin(21),buildDolphin(22),buildDolphin(23)];

// ---------- green-winged macaw (boss) ----------
const Macaw=(function(){
  const grp=new THREE.Group(), R='#D8262C', GR='#2FA84F', BU='#2455C8';
  const v=new Vox(51); v.box(-3,0,-3,3,9,3,R,0.06); v.box(-3,9,-3,3,15,4,R,0.06);
  for(let x=-3;x<3;x++) for(let y=10;y<13;y++) if(x!==-1&&x!==0) v.set(x,y,3,'#F4EDE4',0.03);
  v.set(-2,12,3,'#101418',0).set(1,12,3,'#101418',0);
  v.box(-1,9,4,1,13,6,'#E9E2D0',0.03); v.box(-1,9,4,1,10,6,'#2A2A2A',0.02);
  v.box(-1,-12,-3,1,0,-1,R,0.05); v.box(-1,-12,-3,1,-7,-1,BU,0.05); v.box(-2,-2,0,-1,0,2,'#4A4A4A'); v.box(0,-2,0,1,0,2,'#4A4A4A');
  grp.add(vmesh(v));
  const w1=new Vox(52); w1.box(0,0,-2,4,8,2,GR,0.05); w1.box(4,0,-2,10,8,2,BU,0.05); w1.box(4,0,-2,10,2,2,'#1B3E9A');
  const w2=new Vox(53); w2.box(-4,0,-2,0,8,2,GR,0.05); w2.box(-10,0,-2,-4,8,2,BU,0.05); w2.box(-10,0,-2,-4,2,2,'#1B3E9A');
  const wR=new THREE.Group(); wR.position.set(0.37,0.5,0); wR.add(vmesh(w1,1/8,0,0,0)); grp.add(wR);
  const wL=new THREE.Group(); wL.position.set(-0.37,0.5,0); wL.add(vmesh(w2,1/8,0,0,0)); grp.add(wL);
  grp.scale.setScalar(1.15); grp.position.set(30,14,-1); grp.visible=false; actorRoot.add(grp);
  return {grp,wR,wL,x:30,y:14,tx:30,ty:14,state:'off',flapT:0};
})();

// ---------- basketball hoop (floats on a pontoon, moves between shots) ----------
const HOOP_Y=8.4;
const Hoop=(function(){
  const v=new Vox(61);
  for(let x=-8;x<8;x++) for(let z=-8;z<8;z++){ const d=Math.hypot(x+0.5,z+0.5); if(d>=6.3&&d<=7.6) v.set(x,0,z,'#E8561F',0.05); }
  for(let y=-7;y<0;y++){ const rr=6.2-(-1-y)*0.28; for(let x=-8;x<8;x++) for(let z=-8;z<8;z++){ const d=Math.hypot(x+0.5,z+0.5); if(d>=rr-0.8&&d<=rr+0.3&&((x+y+z)&1)) v.set(x,y,z,'#F2F2F2',0.03); } }
  v.box(-10,-1,-11,10,14,-9,'#F4F4F4',0.03);
  for(let x=-4;x<4;x++){ v.set(x,1,-10,'#E0383B',0).set(x,7,-10,'#E0383B',0); } for(let y=1;y<8;y++){ v.set(-4,y,-10,'#E0383B',0).set(3,y,-10,'#E0383B',0); }
  v.box(-1,0,-9,1,1,-7,'#9AA3AA'); v.box(-1,-70,-14,1,10,-11,'#E9EDEF',0.04); v.box(-5,-72,-17,5,-68,-8,'#F4B731',0.05);
  const grp=new THREE.Group(); grp.add(vmesh(v)); grp.position.set(0,-12,0); grp.visible=false; actorRoot.add(grp);
  return {grp,x:0,tx:0,rise:0,riseT:0,active:false,wob:0};
})();

// ---------- balls (blocky spheres, 6 voxels across) ----------
const BALL={
  beach:{r:0.75,g:7.2,bv:10.8,pts:10,col:'#FFD23F'},
  rubber:{r:0.5,g:11.5,bv:13.6,pts:15,col:'#FF7A5C'},
  basket:{r:0.62,g:12.5,bv:15.2,pts:20,col:'#FF9A3C'}};
const BALLGEO={};
for(const type in BALL){ const v=new Vox(hashStr(type)), R=3;
  for(let x=-R;x<R;x++) for(let y=-R;y<R;y++) for(let z=-R;z<R;z++){ const cx=x+0.5,cy=y+0.5,cz=z+0.5; if(cx*cx+cy*cy+cz*cz>R*R+0.6) continue; let col;
    if(type==='beach'){ if(Math.abs(cy)>2.2) col='#FFFFFF'; else { const a=Math.atan2(cz,cx); col=['#E8483C','#FFFFFF','#2E7FE0','#FFD23F','#FFFFFF','#3CC46A'][Math.floor((a+Math.PI)/(Math.PI*2)*6)%6]; } }
    else if(type==='rubber'){ col=cy<-1.4?'#C63A28':(cy>1&&cx<0&&cz>0?'#FF9A7F':'#F0503C'); }
    else { col=(cx===0.5||cz===0.5||cy===0.5)?'#3A1E0E':'#E8782A'; }
    v.set(x,y,z,col,0.05); }
  BALLGEO[type]=v.geometry(BALL[type].r/R,0,0,0); }
const markerTex=(function(){ const c=document.createElement('canvas'); c.width=c.height=16; const g=c.getContext('2d');
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const d=Math.hypot(x-7.5,y-7.5); if(d>=5.2&&d<=7.4){g.fillStyle='#fff';g.fillRect(x,y,1,1);} else if(d<5.2){g.fillStyle='rgba(255,255,255,0.22)';g.fillRect(x,y,1,1);} }
  const t=new THREE.CanvasTexture(c); t.magFilter=t.minFilter=THREE.NearestFilter; t.generateMipmaps=false; return t; })();
const MARKGEO=new THREE.PlaneGeometry(1.7,1.7); MARKGEO.rotateX(-Math.PI/2);
function makeBallMesh(type){ const m=addOutline(new THREE.Mesh(BALLGEO[type],VOXMAT),1.14); actorRoot.add(m);
  const mk=new THREE.Mesh(MARKGEO,new THREE.MeshBasicMaterial({map:markerTex,color:BALL[type].col,transparent:true,opacity:0.5,depthWrite:false}));
  mk.renderOrder=2; actorRoot.add(mk); return {mesh:m,marker:mk}; }

// ---------- power-up blocks (icon on every face) ----------
const PICK={
  fish:{icon:'fish',bg:'#2E8FBF',say:'YUM!',label:'+1 FISH'},
  slow:{icon:'whistle',bg:'#1F4E7F',say:'SLOW-MO!',label:'SLOW-MO'},
  dolphin:{icon:'dolphin',bg:'#178E93',say:'DOLPHIN BUDDY!',label:'DOLPHIN BUDDY'},
  star:{icon:'star',bg:'#6A34B8',say:'DOUBLE POINTS!',label:'x2 POINTS'}};

function makePickMesh(type){ return powerBlock(PICK[type].icon,PICK[type].bg,actorRoot); }

// ---------- layout: fit the play area to any screen ----------
function layout(){
  const aspect=W/H, hw=clamp(aspect*6,5,13); World.halfW=hw;
  const t=Math.tan(20*Math.PI/180), fit=hw+1.5, dist=Math.max(fit/(t*aspect),10.4/t);
  World.dist=dist; World.lookY=6.2+(aspect>1?0.5:0); const p=World.pitch;
  camera.aspect=aspect; camera.position.set(0,World.lookY+Math.sin(p)*dist,Math.cos(p)*dist); camera.lookAt(0,World.lookY,0); camera.updateProjectionMatrix();
  CamBase.copy(camera.position);
  const px=hw+0.95; Podiums[0].position.x=-px; Podiums[1].position.x=px;
  Trainers[0].grp.position.set(-px,2.5,-1.4); Trainers[0].grp.rotation.y=0.45; Trainers[1].grp.position.set(px,2.5,-1.4); Trainers[1].grp.rotation.y=-0.45;
  const visHalf=(dist+2)*t*aspect;
  if(visHalf-(hw+2.2)>3.4){ Parrot.mode='perch'; Parrot.base.set(hw+3.6,9.2,-2.4); }
  else { Parrot.mode='swing'; Parrot.base.set(hw*0.6,Math.min(13.7,World.lookY+(dist+3)*t*0.52),-3); }
  Parrot.ropes.forEach(r=>r.visible=Parrot.mode==='swing'); Parrot.post.visible=Parrot.mode==='perch';
  Seal.tx=clamp(Seal.tx,-hw+0.7,hw-0.7);
}
function trainerHand(side){ return {x:side*(World.halfW+0.95)-side*0.75,y:6.3,z:-1.2}; }

// ---------- world animation (runs every frame, independent of rules) ----------
function leap(x0,x1,h,dur,z,idx){
  const d=idx!=null?Dolphins[idx]:Dolphins.slice(0,2).find(d=>!d.busy); if(!d||d.busy&&idx==null) return false;
  d.busy=true; d.leap={t:0,x0,x1,h,dur,z,s0:false,s1:false}; return true; }
function animateWorld(dt,G){
  World.t+=dt; const t=World.t;
  // water drift
  const wt=World.water.material.map; wt.offset.x=(wt.offset.x+dt*0.02)%1; wt.offset.y=(wt.offset.y+dt*0.035)%1;
  Cones.forEach((c,i)=>{ c.rotation.z=Math.sin(t*0.45+i*2)*0.14; c.material.opacity=0.05+(Tint.v<0.9&&i===1?0.05:0); });
  if(Hoop.active&&Tint.v<0.9) Cones[1].position.x+=(Hoop.x-Cones[1].position.x)*Math.min(1,dt*3); else Cones[1].position.x+=(0-Cones[1].position.x)*Math.min(1,dt*2);
  // crowd
  World.cheerT=Math.max(0,World.cheerT-dt); Crowd.place(t,REDUCED?Math.min(0.3,World.cheerT):Math.min(1,World.cheerT));
  // seal
  const s=Seal; s.t+=dt; s.bob=Math.sin(s.t*3)*0.06; s.kick=Math.max(0,s.kick-dt*7); s.clap=Math.max(0,s.clap-dt);
  s.grp.position.set(s.x,s.bob,0); s.grp.rotation.z=clamp(-s.vx*0.022,-0.25,0.25);
  s.head.rotation.z=-s.grp.rotation.z*0.6; s.head.rotation.x=-0.55-0.25*s.kick; s.head.position.y=2.0-0.12*s.kick; s.head.scale.set(1+0.08*s.kick,1-0.1*s.kick,1);
  const fl=0.35+Math.sin(s.t*6)*0.08+Math.min(0.4,Math.abs(s.vx)*0.03);
  if(s.clap>0){ const c=Math.abs(Math.sin(s.t*22))*0.9; s.fr.rotation.z=-0.2-c; s.fl.rotation.z=0.2+c; } else { s.fr.rotation.z=fl; s.fl.rotation.z=-fl; }
  if(Math.abs(s.vx)>4&&Math.random()<dt*20) FX.emit(s.x-sgn(s.vx)*0.8,0.05,0.4,{count:2,colors:['#E4FAFD','#9DEBF6'],speed:1.2,up:1.5,size:0.14,life:0.5,grav:6});
  // trainers
  Trainers.forEach(tr=>{ tr.grp.position.y=2.5+Math.sin(t*2+tr.side)*0.03; const inner=tr.side<0?tr.armR:tr.armL, outer=tr.side<0?tr.armL:tr.armR;
    if(tr.toss>0){ tr.toss+=dt; const k=tr.toss/0.4; inner.rotation.x=-Math.sin(Math.PI*Math.min(1,k))*2.6; if(k>=1){tr.toss=0;inner.rotation.x=0;} }
    if(tr.clap>0){ tr.clap-=dt; const c=Math.abs(Math.sin(t*16)); tr.armR.rotation.x=tr.armL.rotation.x=-1.3; tr.armR.rotation.z=0.3+c*0.35; tr.armL.rotation.z=-0.3-c*0.35; if(tr.clap<=0){tr.armR.rotation.set(0,0,0);tr.armL.rotation.set(0,0,0);} }
    else { outer.rotation.x=Math.sin(t*1.5+tr.side)*0.06; outer.rotation.z=0; if(tr.toss<=0) inner.rotation.z=0; } });
  // parrot
  const P=Parrot; P.talk=Math.max(0,P.talk-dt);
  const sw=P.mode==='swing'?Math.sin(t*1.2)*0.08:0; P.grp.position.copy(P.base); P.grp.rotation.z=sw;
  P.body.rotation.x=P.talk>0?-Math.abs(Math.sin(t*18))*0.25:0; P.body.position.y=0.2+(P.talk>0?Math.abs(Math.sin(t*9))*0.12:0);
  // dolphins
  Dolphins.forEach((d,i)=>{ const m=d.mesh;
    if(d.leap){ const L=d.leap; L.t+=dt/L.dur; const k=Math.min(1,L.t); const x=lerp(L.x0,L.x1,k); const y=-1.3+(L.h+1.3)*4*k*(1-k);
      const dir=sgn(L.x1-L.x0), vy=(L.h+1.3)*4*(1-2*k), vx=Math.abs(L.x1-L.x0);
      m.position.set(x,y,L.z); m.rotation.set(0,dir>0?0:Math.PI,Math.atan2(vy,vx));
      if(!L.s0&&k>0.08){L.s0=true;FX.emit(L.x0+dir*0.6,0.1,L.z,{count:12,colors:['#E4FAFD','#8FE3F2','#FFFFFF'],speed:2.6,up:4,size:0.2,life:0.7});}
      if(!L.s1&&k>0.9){L.s1=true;FX.emit(x,0.1,L.z,{count:14,colors:['#E4FAFD','#8FE3F2','#FFFFFF'],speed:3,up:4.5,size:0.2,life:0.8});}
      if(L.t>=1){ d.leap=null; d.busy=false; m.position.y=-20; } }
    else if(i===2&&G.powers.dolphin>0){ // buddy cruising under the surface
      let tx=Seal.x+2.5; let best=1e9; for(const b of G.balls){ if(b.ret||b.scored) continue; if(b.y<best){best=b.y;tx=b.x;} }
      const px=m.position.y<-5?Seal.x:m.position.x, nx=px+clamp(tx-px,-9*dt,9*dt);
      m.position.set(nx,-0.42+Math.sin(t*4)*0.05,1.8); m.rotation.set(0,nx>=px?0:Math.PI,0); }
    else if(!d.busy) m.position.y=-20; });
  // macaw
  const M=Macaw;
  if(M.grp.visible){ M.flapT+=dt; const flying=M.state!=='perch'; const f=flying?Math.sin(M.flapT*16)*0.8:Math.sin(M.flapT*2)*0.05+0.15;
    M.wR.rotation.z=f; M.wL.rotation.z=-f; const k=Math.min(1,dt*(M.state==='leave'?2.2:3.2)); M.x+=(M.tx-M.x)*k; M.y+=(M.ty-M.y)*k;
    M.grp.position.set(M.x,M.y+(flying?Math.sin(M.flapT*8)*0.15:0),M.state==='perch'?-1.3:-0.6); M.grp.rotation.y=flying?clamp((M.tx-M.x)*0.2,-0.7,0.7):0;
    if(M.state==='leave'&&Math.abs(M.x-M.tx)<1){ M.grp.visible=false; M.state='off'; } }
  // hoop
  if(Hoop.grp.visible){ Hoop.x+=clamp(Hoop.tx-Hoop.x,-7*dt,7*dt); Hoop.riseT+=dt*(Hoop.active?1:-1.2); Hoop.rise=clamp(Hoop.riseT/1.2,0,1);
    Hoop.wob=Math.max(0,Hoop.wob-dt*2); Hoop.grp.position.set(Hoop.x,HOOP_Y-(1-easeOutBack(Hoop.rise))*12,0);
    Hoop.grp.rotation.z=Math.sin(t*20)*0.05*Hoop.wob; if(!Hoop.active&&Hoop.rise<=0) Hoop.grp.visible=false;
    if(M.state==='perch'){ M.tx=Hoop.x; M.x=Hoop.x; } }
  FX.update(dt);
}
