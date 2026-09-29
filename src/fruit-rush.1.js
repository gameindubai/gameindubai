
/* ==========================================================================
   WORLD 2 — FRUIT RUSH @ DUBAI BUTTERFLY GARDEN (Al Barsha South, by Miracle Garden)
   Ten bright climate-controlled domes with triangular windows, white netted
   gazebos, 15 food stations (mango, pineapple, watermelon, banana, orange,
   nutrient syrup), a koi pond and mini waterfall in Dome 2, budgies in cages.
   ========================================================================== */
scene.fog=new THREE.Fog(0xCBEFF7,42,110);
Object.assign(TEXDEF,{
  grass:(g,r)=>{noise16(g,r,'#5DB74A',0.08);for(let i=0;i<24;i++)pxl(g,r()*16|0,r()*16|0,r()<0.5?'#7FD35F':'#4A9C3B');},
  soil:(g,r)=>{noise16(g,r,'#8A5A36',0.1);for(let x=0;x<16;x++){pxl(g,x,0,'#5DB74A');pxl(g,x,1,r()<0.6?'#5DB74A':'#4A9C3B');if(r()<0.4)pxl(g,x,2,'#4A9C3B');}for(let i=0;i<8;i++)pxl(g,r()*16|0,4+(r()*12|0),'#6E4526');},
  stone:(g,r)=>{noise16(g,r,'#9AA3A9',0.07);for(let i=0;i<5;i++){const x=r()*14|0,y=r()*14|0;pxl(g,x,y,'#7D868C');pxl(g,x+1,y,'#7D868C');}bevel(g,'#BAC2C7','#79828A');},
  moss:(g,r)=>{noise16(g,r,'#8F9A8E',0.07);for(let i=0;i<30;i++)pxl(g,r()*16|0,r()*16|0,r()<0.6?'#5E9B45':'#7BB85A');bevel(g,'#A9B6A4','#6E7A6B');},
  glass:(g,r)=>{noise16(g,r,'#C4ECF5',0.02);for(let i=0;i<16;i++){pxl(g,i,15,'#F4FBFD');pxl(g,15-i,i,'#F4FBFD');}for(let i=0;i<5;i++)pxl(g,3+i,9-i,'#FFFFFF');pxl(g,11,12,'#FFFFFF');},
  steel:(g,r)=>{noise16(g,r,'#EEF2F4',0.02);bevel(g,'#FFFFFF','#B9C3C9');for(let i=2;i<14;i+=4)pxl(g,i,i,'#D5DDE2');},
  wood:(g,r)=>{noise16(g,r,'#B07A45',0.06);for(let x=0;x<16;x++){pxl(g,x,4,'#8C5E33');pxl(g,x,10,'#8C5E33');}pxl(g,3,2,'#7A4F2A');pxl(g,11,7,'#7A4F2A');pxl(g,6,13,'#7A4F2A');},
  leaf:(g,r)=>{noise16(g,r,'#3F9D47',0.1);for(let i=0;i<16;i++)pxl(g,r()*16|0,r()*16|0,r()<0.5?'#2E7D36':'#5BBF4F');},
  pond:(g,r)=>{noise16(g,r,'#23A7B8',0.035);for(let y=0;y<16;y+=4){const o=(r()*16)|0;for(let k=0;k<4;k++)pxl(g,(o+k)%16,y+(k>1?1:0),'#67D8E4');}for(let i=0;i<5;i++)pxl(g,r()*16|0,r()*16|0,'#A8F0F6');},
  pondbed:(g,r)=>{noise16(g,r,'#3E7F6A',0.08);for(let i=0;i<10;i++)pxl(g,r()*16|0,r()*16|0,'#58A07F');for(let i=0;i<4;i++)pxl(g,r()*16|0,r()*16|0,'#C9B48A');},
  fall:(g,r)=>{noise16(g,r,'#56CBE0',0.05);for(let x=0;x<16;x+=3)for(let y=0;y<16;y++)if(r()<0.5)pxl(g,x,y,'#C4F4FB');},
  path:(g,r)=>{noise16(g,r,'#E6D5AE',0.05);for(let i=0;i<16;i++){pxl(g,i,15,'#CDBA8E');pxl(g,15,i,'#CDBA8E');pxl(g,7,i,'#D9C79C');}}});
Object.assign(SPR,{
  bloom:{pal:{D:'#8A1F45',P:'#E0457B',L:'#FF9CC0',Y:'#FFD23F',G:'#2E8B3A'},rows:["..DDDDD..",".DPPLPPD.","DPPLLLPPD","DPLLYLLPD","DPLYYYLPD","DPPLYLPPD",".DPPPPPD.","..DDGDD..","....G...."]},
  bfly:{pal:{K:'#14181F',B:'#2E7CF6',L:'#9CCBFF'},rows:["KK.......KK","KBK.....KBK","KBBK.K.KBBK","KBLBKKKBLBK",".KBBBKBBBK.","..KBBKBBK..",".KBBBKBBBK.",".KBLK.KLBK.","..KK...KK.."]},
  basket:{pal:{D:'#5A3514',B:'#B07A45',L:'#D9A066',R:'#E8483C',Y:'#FFD23F',G:'#3FA34D',O:'#FF8C1A'},rows:["...RR.YY...","..RRRYYYGG.",".OOORRYYGG.","DDDDDDDDDDD","DBLBLBLBLBD","DLBLBLBLBLD",".DBLBLBLBD.",".DLBLBLBLD.","..DDDDDDD.."]},
  melon:{pal:{K:'#14181F',G:'#2E8B3A',W:'#E9F7C9',R:'#F2444B',B:'#1B1B1B'},rows:["KRRRRRRRRK","KRRBRRBRRK",".KRRRRRRK.",".KRBRRBRK.","..KWWWWK..","...KGGK...","....KK...."]},
  pine:{pal:{G:'#3E9A3A',D:'#2E7D32',Y:'#E8B32C',O:'#B67A16',K:'#14181F'},rows:[".G.D.G.","..GDG..",".KGDGK.","KYOYOYK","KOYOYOK","KYOYOYK","KOYOYOK","KYOYOYK",".KOYOK.","..KKK.."]},
  mango:{pal:{K:'#14181F',G:'#7FB23A',Y:'#E8B32C',O:'#F07A2A',R:'#E0462E',S:'#6B4A1E'},rows:["...SG...","...SGG..",".KKKKK..","KGYYYYK.","KYYYYOOK","KYYYOORK","KYYOORRK",".KOORRK.","..KKKK.."]}});

const worldRoot=new THREE.Group(); scene.add(worldRoot);
const actorRoot=new THREE.Group(); scene.add(actorRoot);
const FX=new Particles(actorRoot,640);
const World={halfW:6,lookY:6.4,dist:30,pitch:0.16,t:0,apexMax:12,spare:false};
const GRAV=13;
const dz=x=>{const a=Math.abs(x)-19;return a>0?Math.min(16,Math.round(a*a/8)):0;}; // dome wall curves in at the sides

// ---------- the dome ----------
(function buildDome(){
  const B=new Batch();
  for(let x=-24;x<=24;x++){ B.add('moss',x,0,-3); B.add('stone',x,0,11); }
  for(let z=-2;z<=10;z++){ B.add('stone',-24,0,z); B.add('stone',24,0,z); }
  for(let x=-44;x<=44;x++){ B.add('soil',x,1,-9-dz(x)*0.3|0); }
  for(let x=-44;x<=44;x++){ const c=dz(x);
    for(let y=1;y<=34;y++){ const zf=y>15?Math.round((y-15)*(y-15)/9):0, z=-17+c+zf; if(z>-4) continue;
      B.add((x%6===0||y%7===0)?'steel':'glass',x,y,z); } }
  // white netted gazebo (the centre of every dome)
  for(const px of[-3,2]) for(const pz of[-12,-15]) for(let y=2;y<=6;y++) B.add('steel',px,y,pz);
  for(let x=-4;x<=3;x++) for(let z=-16;z<=-11;z++) B.add('steel',x,7,z);
  for(let x=-3;x<=2;x++) for(let z=-15;z<=-12;z++) B.add('steel',x,8,z);
  for(let x=-1;x<=0;x++) for(let z=-14;z<=-13;z++) B.add('steel',x,9,z);
  for(let x=-2;x<=1;x++) B.add('wood',x,2,-14);
  // mini waterfall rocks (Dome 2)
  for(let y=1;y<=8;y++){ const w=Math.max(1,5-Math.floor(y/2)); for(let x=10-w;x<=12+w;x++) B.add(y%3===0?'stone':'moss',x,y,-13); }
  for(let y=1;y<=3;y++) for(let x=8;x<=15;x++) B.add('moss',x,y,-12);
  // hedges on the upper terrace
  for(let x=-44;x<=44;x++){ if(x>-6&&x<5) continue; if(x>7&&x<16) continue; if(Math.random()<0.25) continue; B.add('leaf',x,2,-10-(dz(x)*0.3|0)); if(Math.random()<0.4) B.add('leaf',x,3,-10-(dz(x)*0.3|0)); }
  B.build(worldRoot);
  const pond=planeMesh(47,13,'pond',47,13,1,{transparent:true,opacity:0.82,depthWrite:false}); pond.rotation.x=-Math.PI/2; pond.position.set(0,0,4); pond.renderOrder=1; worldRoot.add(pond); World.pond=pond;
  const bed=planeMesh(47,13,'pondbed',47,13,0.9); bed.rotation.x=-Math.PI/2; bed.position.set(0,-2.2,4); worldRoot.add(bed);
  const back=planeMesh(47,2.2,'stone',47,2.2,0.9); back.position.set(0,-1.1,-2.5); worldRoot.add(back);
  const t1=planeMesh(96,6,'grass',96,6,1); t1.rotation.x=-Math.PI/2; t1.position.set(0,0.5,-5.5); worldRoot.add(t1);
  const t2=planeMesh(96,10,'grass',96,10,1); t2.rotation.x=-Math.PI/2; t2.position.set(0,1.5,-14); worldRoot.add(t2);
  const path=planeMesh(4,6,'path',4,6,1); path.rotation.x=-Math.PI/2; path.position.set(-0.5,0.52,-5.5); worldRoot.add(path);
  const front=planeMesh(96,14,'grass',96,14,1); front.rotation.x=-Math.PI/2; front.position.set(0,0.5,18.5); worldRoot.add(front);
  for(const s of[-1,1]){ const sd=planeMesh(30,15,'grass',30,15,1); sd.rotation.x=-Math.PI/2; sd.position.set(s*39.5,0.5,4); worldRoot.add(sd); }
  // gazebo nets
  const netC=document.createElement('canvas'); netC.width=netC.height=16; const ng=netC.getContext('2d'); ng.fillStyle='rgba(255,255,255,0.18)'; ng.fillRect(0,0,16,16);
  ng.fillStyle='rgba(255,255,255,0.75)'; for(let i=0;i<16;i+=4){ ng.fillRect(i,0,1,16); ng.fillRect(0,i,16,1); }
  const netT=new THREE.CanvasTexture(netC); netT.magFilter=netT.minFilter=THREE.NearestFilter; netT.generateMipmaps=false; netT.wrapS=netT.wrapT=THREE.RepeatWrapping; netT.repeat.set(5,4);
  const netM=tintable(new THREE.MeshBasicMaterial({map:netT,transparent:true,depthWrite:false,side:THREE.DoubleSide}),1);
  const net=new THREE.Mesh(new THREE.PlaneGeometry(5,4),netM); net.position.set(-0.5,4.5,-11.45); worldRoot.add(net);
  // waterfall
  const fallT=tex('fall').clone(); fallT.needsUpdate=true; fallT.repeat.set(2,6);
  const fall=new THREE.Mesh(new THREE.PlaneGeometry(2,6.5),tintable(new THREE.MeshBasicMaterial({map:fallT,transparent:true,opacity:0.9}),1));
  fall.position.set(11,4.6,-11.9); worldRoot.add(fall); World.fall=fall;
})();

// ---------- flowers, nectar plants and palms (one voxel model) ----------
(function buildPlants(){
  const dk=c=>'#'+hexToRgb(c).map(q=>Math.round(q*0.85*255).toString(16).padStart(2,'0')).join('');
  const v=new Vox(77), s=0.3, petals=['#F25C9A','#FF8A3D','#FFD23F','#E8483C','#9B59D0','#FFFFFF','#FF6F91','#B388EB'], rng=mulberry32(5);
  const flower=(ux,uy,uz)=>{ const X=Math.round(ux/s), Y=Math.round(uy/s), Z=Math.round(uz/s), h=3+(rng()*3|0), col=petals[(rng()*petals.length)|0];
    for(let y=0;y<h;y++) v.set(X,Y+y,Z,'#3E9A3A',0.08); v.set(X+1,Y+1,Z,'#4FB048',0.08);
    const cy=Y+h; v.set(X,cy,Z,'#FFD23F',0.04); [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>v.set(X+d[0],cy+d[1],Z,col,0.05));
    if(rng()<0.5) [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>v.set(X+d[0],cy+d[1],Z,dk(col),0.05)); };
  for(let x=-40;x<=40;x+=1.2){ if(x>-2.6&&x<1.4) continue; flower(x+rng()*0.4,0.5,-4.3-rng()*0.6); if(rng()<0.7) flower(x+0.6,0.5,-6.2-rng()*1.4); }
  for(let x=-40;x<=40;x+=2.1){ if(Math.abs(x+0.5)<5||(x>7&&x<16)) continue; flower(x,1.5,-10.8-rng()*0.8); }
  const palm=(ux,uz,h)=>{ const X=Math.round(ux/s), Z=Math.round(uz/s), Y=Math.round(0.5/s);
    for(let y=0;y<h;y++){ v.set(X,Y+y,Z,'#8A6440',0.08); v.set(X+1,Y+y,Z,'#8A6440',0.08); if(y%3===0){ v.set(X,Y+y,Z,'#6E4E30'); } }
    const top=Y+h; for(const d of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) for(let k=1;k<9;k++){ const dropY=top-Math.floor(k*k/14);
      v.set(X+d[0]*k,dropY,Z+d[1]*k,k>6?'#5BBF4F':'#3F9D47',0.08); if(k<7) v.set(X+d[0]*k,dropY+1,Z+d[1]*k,'#3F9D47',0.08); } };
  for(const [x,z,h] of [[-13,-7,26],[14.5,-7,22],[-21,-5,30],[21,-5,28],[-9,-15,20],[6,-15,24],[-30,-8,30],[30,-8,26]]) palm(x,z,h);
  const m=new THREE.Mesh(v.geometry(s),tintable(new THREE.MeshBasicMaterial({vertexColors:true}))); worldRoot.add(m);
})();

// ---------- sunlight through the triangular windows ----------
const Beams=[-7,1,9].map((x,i)=>{ const m=new THREE.Mesh(new THREE.ConeGeometry(2.6,34,10,1,true),
  new THREE.MeshBasicMaterial({color:0xFFF4C8,transparent:true,opacity:0.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  m.position.set(x,15,-4); m.rotation.z=0.32; m.renderOrder=3; worldRoot.add(m); return m; });

// ---------- keepers (garden staff) on stepping stones ----------
function buildStone(){ const g=new THREE.Group(); for(let y=-3;y<=0;y++){ const m=new THREE.Mesh(BOXGEO,blockMat(y===0?'moss':'stone')); m.position.y=y; g.add(m); }
  g.position.z=-1.4; worldRoot.add(g); return g; }
const Stones=[buildStone(),buildStone()];
function buildKeeper(skin,female,seed){
  const grp=new THREE.Group(), shirt='#2F8F4E', pants='#C9B48A', HJ='#E8DCC4', v=new Vox(seed);
  v.box(-4,0,-2,0,12,2,pants); v.box(0,0,-2,4,12,2,pants); v.box(-4,0,-2,4,2,2,'#5A3A1E');
  v.box(-4,12,-2,4,24,2,shirt); for(let x=-2;x<2;x++) v.set(x,23,1,'#FFFFFF',0); v.set(-3,19,1,'#F4E04D',0).set(-2,19,1,'#2E7CF6',0);
  v.box(-4,24,-4,4,32,4,skin,0.04);
  if(female){ v.box(-4,24,-4,4,32,-3,HJ); v.box(-4,31,-4,4,33,4,HJ); v.box(-5,24,-4,-4,32,4,HJ); v.box(4,24,-4,5,32,4,HJ);
    for(let y=24;y<32;y++){ v.set(-4,y,3,HJ); v.set(3,y,3,HJ); } for(let x=-4;x<4;x++){ v.set(x,24,3,HJ); v.set(x,30,3,HJ); v.set(x,31,3,HJ); } }
  else { v.box(-4,28,-4,4,31,-3,'#2A1B12'); v.box(-4,31,-4,4,33,4,shirt); v.box(-4,31,4,4,32,7,shirt,0.04); }
  v.set(-3,27,3,'#FFFFFF',0).set(-2,27,3,'#1B2A3A',0).set(1,27,3,'#1B2A3A',0).set(2,27,3,'#FFFFFF',0).set(-1,25,3,'#8E4E3A',0).set(0,25,3,'#8E4E3A',0);
  grp.add(vmesh(v));
  const av=new Vox(seed+3); av.box(-2,-12,-2,2,0,2,skin,0.04); av.box(-2,-4,-2,2,0,2,shirt); const ag=av.geometry(1/8);
  const armR=new THREE.Group(); armR.position.set(0.75,3.0,0); armR.add(new THREE.Mesh(ag,VOXMAT)); grp.add(armR);
  const armL=new THREE.Group(); armL.position.set(-0.75,3.0,0); armL.add(new THREE.Mesh(ag,VOXMAT)); grp.add(armL);
  actorRoot.add(grp); return {grp,armR,armL,toss:0,heave:0,cheer:0};
}
const Keepers=[buildKeeper('#C58E62',true,71),buildKeeper('#8A5A3C',false,73)]; Keepers[0].side=-1; Keepers[1].side=1;
function keeperHand(side){ return {x:side*(World.halfW+0.95)-side*0.7,y:4.3,z:-1.2}; }

// ---------- hanging feeding trays ----------
function buildTray(seed){
  const grp=new THREE.Group(), v=new Vox(seed), bits=['#FFB22E','#FFA530','#F2444B','#FFE45C','#FFF3C4'];
  v.box(-9,0,-5,9,1,5,'#B07A45',0.07); for(let x=-9;x<9;x++){ v.set(x,1,-5,'#8C5E33'); v.set(x,1,4,'#8C5E33'); } for(let z=-5;z<5;z++){ v.set(-9,1,z,'#8C5E33'); v.set(8,1,z,'#8C5E33'); }
  const rng=mulberry32(seed); for(let i=0;i<14;i++){ const x=-7+(rng()*14|0), z=-3+(rng()*6|0); v.set(x,1,z,bits[(rng()*bits.length)|0],0.05); if(rng()<0.4) v.set(x,2,z,bits[(rng()*bits.length)|0],0.05); }
  grp.add(vmesh(v));
  const chainM=new THREE.MeshBasicMaterial({color:0x6E7A82});
  for(const x of[-1,1]){ const c=new THREE.Mesh(BOXGEO,chainM); c.scale.set(0.07,14,0.07); c.position.set(x*1.05,7.1,0); c.rotation.z=x*-0.05; grp.add(c); }
  actorRoot.add(grp);
  const slots=[[-0.75,0.2],[0.75,0.15],[-0.25,-0.2],[0.3,0.3],[0,0.1]].map(a=>({x:a[0],z:a[1],b:null}));
  return {grp,slots,fill:0,pulse:0};
}
const Trays=[buildTray(81),buildTray(82)];

// ---------- the budgie commentator (garden aviary resident) ----------
const Budgie=(function(){
  const grp=new THREE.Group(); actorRoot.add(grp); const v=new Vox(91);
  v.box(-2,0,-2,2,6,2,'#6CC24A',0.06); for(let y=1;y<5;y++) for(let z=-2;z<2;z++){ v.set(-2,y,z,'#4FA838'); v.set(1,y,z,'#4FA838'); }
  v.box(-2,6,-2,2,10,3,'#F4E04D',0.04); for(let x=-2;x<2;x++){ v.set(x,9,-2,'#1B1B1B',0); v.set(x,7,-2,'#1B1B1B',0); }
  v.set(-2,8,2,'#101418',0).set(1,8,2,'#101418',0); v.box(-1,8,3,1,9,4,'#3B7DD8',0.02); v.box(-1,6,3,1,8,4,'#E8C07A',0.02);
  v.set(-2,6,2,'#2E6FD8',0).set(1,6,2,'#2E6FD8',0); v.box(-1,-5,-2,1,0,-1,'#2E6FD8',0.05); v.box(-2,-1,0,-1,0,1,'#C98A9A'); v.box(0,-1,0,1,0,1,'#C98A9A');
  const body=vmesh(v,1/5.2); body.position.y=0.2; grp.add(body);
  return {grp,body,talk:0};
})();

// ---------- layout ----------
function layout(){
  const aspect=W/H, hw=clamp(aspect*6,5,13); World.halfW=hw;
  const t=Math.tan(20*Math.PI/180), fit=hw+1.5, dist=Math.max(fit/(t*aspect),10.6/t);
  World.dist=dist; World.lookY=6.4+(aspect>1?0.5:0); const p=World.pitch;
  camera.aspect=aspect; camera.position.set(0,World.lookY+Math.sin(p)*dist,Math.cos(p)*dist); camera.lookAt(0,World.lookY,0); camera.updateProjectionMatrix();
  CamBase.copy(camera.position);
  const half=dist*t, hudUnits=(SAFE.t+130*S)/H*half*2; World.apexMax=clamp(World.lookY+half-hudUnits-1.2,8.5,13);
  const px=hw+0.95; Stones[0].position.x=-px; Stones[1].position.x=px;
  Keepers[0].grp.position.set(-px,0.5,-1.4); Keepers[0].grp.rotation.y=0.45; Keepers[1].grp.position.set(px,0.5,-1.4); Keepers[1].grp.rotation.y=-0.45;
  World.spare=(dist+3)*t*aspect-(hw+2.2)>3.4;
  Trays.forEach((tr,i)=>{ const s=i?1:-1; if(World.spare) tr.grp.position.set(s*(hw+3.4),8.2,-3); else tr.grp.position.set(s*(hw-0.9),World.apexMax-0.6,-3.4); tr.base=tr.grp.position.clone(); });
}
