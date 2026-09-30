
/* ---------- Fruit Rush rules ---------- */
Object.assign(G,{fruits:[],halves:[],tokens:[],pending:[],spec:null,speed:1,nextSide:1,volleyT:1,volleysLeft:0,powerPity:0,
  swarm:0,frenzy:0,frenzyT:0,sticky:0,boss:null,assist:1,phaseT:0,attractT:0.6,botT:0,botTrail:[],newSpecies:0,seenRun:new Set()});
const Album=new Set(), Toasts=[];
let GAMEDEF=null;
const POW={bloom:{icon:'bloom',bg:'#D63C79',say:'A NEW BLOOM!',label:'+1 BLOOM'},swarm:{icon:'bfly',bg:'#178E93',say:'BUTTERFLY SWARM!',label:'SLOW FALL'},
  basket:{icon:'basket',bg:'#3A8F3A',say:'FEEDING TIME!',label:'FRUIT FRENZY'},star:{icon:'star',bg:'#6A34B8',say:'DOUBLE POINTS!',label:'x2 POINTS'}};
function domeSpec(w){
  const tier=Math.floor((w-1)/5), c=((w-1)%5)+1, dome=((w-1)%10)+1, speed=1+0.07*tier;
  if(c===5) return {boss:true,tier,speed,dome,type:['melon','pine','mango'][tier%3],hp:4+Math.min(tier,4)};
  const volleys=7+c+Math.min(tier,3), minN=[1,1,2,2][c-1]+Math.min(tier,2), maxN=[1,2,3,4][c-1]+Math.min(tier,3);
  const pool=['mango','orange']; if(c>=2||tier>0) pool.push('banana','melon'); if(c>=3||tier>0) pool.push('pine');
  const coco=(c>=4||tier>0)?0.11+0.03*Math.min(tier,4):0, syrup=tier>0?0.08+0.02*Math.min(tier,4):0, gap=Math.max(0.85,2.1-0.18*c-0.12*tier);
  let intro=null; if(tier===0) intro=['MANGOES & ORANGES','BANANAS & WATERMELONS','PINEAPPLES NEED 2 CUTS',"DON'T CUT COCONUTS"][c-1];
  else if(c===1) intro=tier===1?'NEW: STICKY SYRUP BOTTLES':'LAP '+(tier+1)+': FASTER FRUIT';
  return {boss:false,tier,speed,dome,volleys,minN,maxN,pool,coco,syrup,gap,intro};
}

// ---------- tossing ----------
function tossFruit(it){
  const side=it.side, K=Keepers[side<0?0:1]; K.toss=0.001; const h=keeperHand(side), hw=World.halfW, o=it.opts||{};
  const ax=o.ax!=null?o.ax:rand(-hw*0.62,hw*0.62), lo=Math.min(World.apexMax-2.4,7.4), ay=o.ay!=null?o.ay:rand(lo,World.apexMax);
  const vy=Math.sqrt(2*GRAV*Math.max(0.6,ay-h.y)), vx=(ax-h.x)/(vy/GRAV), isPow=it.type==='power';
  if(isPow&&!POW[it.power]) it.power=pickPower();
  const mesh=isPow?powerBlock(POW[it.power].icon,POW[it.power].bg,actorRoot):makeFruitMesh(it.type);
  G.fruits.push({type:it.type,power:isPow?it.power:null,hazard:isPow?null:(FRUIT[it.type].hazard||null),bonus:!!it.bonus,x:h.x,y:h.y,z:h.z,z0:h.z,vx,vy,
    r:isPow?0.8:FRUIT[it.type].r,rot:0,vr:rand(-3,3),rx:rand(-1,1),age:0,hp:isPow?1:(FRUIT[it.type].hp||1),cool:0,pulse:0,base:isPow?0.95:1,dead:false,mesh});
  AudioKit.tone(240+Math.random()*80,0.08,{type:'triangle',vol:0.05,slide:520});
}
function queueToss(type,side,delay,opts,extra){ G.pending.push(Object.assign({type,side,delay,opts},extra||{})); }
function pickPower(){ return pickWeighted({bloom:G.lives<=1?4:G.lives<3?2:0.6,swarm:1.6,basket:1.4,star:1.6}); }
function launchVolley(){
  const sp=G.spec; G.volleysLeft--; const n=Math.round(rand(sp.minN,sp.maxN+0.49)), side0=G.nextSide; G.nextSide*=-1;
  const pattern=n>=3&&Math.random()<0.35?'line':(n>=2&&Math.random()<0.5?'cross':'spread');
  for(let i=0;i<n;i++){
    let type=pick(sp.pool); const r=Math.random(); if(i>0){ if(r<sp.coco) type='coco'; else if(r<sp.coco+sp.syrup) type='syrup'; }
    const side=pattern==='cross'?(i%2?-side0:side0):side0, delay=pattern==='cross'?Math.floor(i/2)*0.16:i*0.15, opts={};
    if(pattern==='line'){ opts.ay=World.apexMax-0.9; opts.ax=lerp(-World.halfW*0.55,World.halfW*0.55,n>1?i/(n-1):0.5); }
    queueToss(type,side,delay,opts);
  }
  G.powerPity++; if(G.wave>1&&(Math.random()<0.1||G.powerPity>9)){ G.powerPity=0; queueToss('power',-side0,0.45,{},{power:pickPower()}); }
  G.volleyT=sp.gap+n*0.18;
}

// ---------- slicing ----------
const Blade={on:false,id:null,x:0,y:0,tx:0,ty:0,lt:0,pts:[],stroke:{n:0,t:0,x:0,y:0},stun:0};
function segDist(px,py,x0,y0,x1,y1){ const dx=x1-x0,dy=y1-y0,l2=dx*dx+dy*dy; let t=l2>0?((px-x0)*dx+(py-y0)*dy)/l2:0; t=clamp(t,0,1); return {d:Math.hypot(px-(x0+dx*t),py-(y0+dy*t)),t}; }
function weakPos(){ const B=G.boss; return {x:B.x+Math.cos(B.wpA)*B.R*0.6,y:B.y+Math.sin(B.wpA)*B.R*0.6,z:B.R*0.85}; }
function cutSegment(x0,y0,x1,y1){
  if(Blade.stun>0) return; const ppu=1/worldPerPixel(0), ang=Math.atan2(-(y1-y0),x1-x0), hits=[];
  for(const f of G.fruits){ if(f.dead||f.cool>0||f.age<0.08) continue; const s=toScreen(f.x,f.y,f.z), R=f.r*ppu*(f.hazard?0.85:1.08+0.25*G.assist), q=segDist(s.x,s.y,x0,y0,x1,y1);
    if(q.d<R) hits.push({f,t:q.t,perfect:q.d<R*0.3}); }
  hits.sort((a,b)=>a.t-b.t);
  for(const h of hits){ if(Blade.stun>0) break; sliceFruit(h.f,ang,h.perfect); }
  if(G.boss&&G.phase==='boss') bossCut(x0,y0,x1,y1,ppu);
  for(const b of Flutter){ if(b.mode==='perch'||b.dead) continue; const s=toScreen(b.x,b.y,b.z), q=segDist(s.x,s.y,x0,y0,x1,y1);
    if(q.d<46*S){ const px=x0+(x1-x0)*q.t, py=y0+(y1-y0)*q.t, dx=s.x-px, dy=s.y-py, l=Math.max(1,Math.hypot(dx,dy)); b.vx+=dx/l*7; b.vy-=dy/l*7; } }
}
function spawnHalves(f,ang){ const g=FGEO[f.type], phi=ang-Math.PI/2, nx=Math.cos(phi), ny=Math.sin(phi);
  for(const side of[-1,1]){ const m=new THREE.Mesh(side<0?g.L:g.R,VOXMAT); addOutline(m,1.13); actorRoot.add(m);
    G.halves.push({mesh:m,x:f.x,y:f.y,z:f.z,vx:f.vx*0.35+side*nx*2.8,vy:Math.max(f.vy*0.3,1)+side*ny*2.8,rz:phi,vr:side*rand(2,5)}); } }
function sendToken(f){ const tray=Trays[f.x<0?0:1]; const m=new THREE.Mesh(FGEO[f.type].chunk,VOXMAT); actorRoot.add(m); G.tokens.push({mesh:m,tray,x0:f.x,y0:f.y,z0:f.z,t:0}); }
function sliceFruit(f,ang,perfect){
  const play=G.state==='play';
  if(f.power){ f.dead=true; actorRoot.remove(f.mesh); FX.emit(f.x,f.y,0.3,{count:18,colors:['#FFE28A','#F4B731','#FFFFFF',POW[f.power].bg],speed:4,up:2,size:0.18,life:0.7,grav:6}); activatePower(f.power,f.x,f.y); return; }
  if(f.hazard==='coco'){ f.cool=99; f.vy=Math.max(f.vy,4.5); f.vx=-f.vx*0.5+rand(-1.5,1.5); f.vr*=-3; Blade.stun=0.35; AudioKit.clank(); G.shake=REDUCED?0:0.25;
    popup('CLANK!',f.x,f.y+1,'red',null,0.8); FX.emit(f.x,f.y,0.3,{count:8,colors:['#6B4226','#8A5A33','#FFFFFF'],speed:3,up:2,size:0.14,life:0.5});
    if(play){ breakCombo(); loseLife(); if(G.lives>0) say('NOT THE COCONUT!',true); } return; }
  if(f.hazard==='syrup'){ f.dead=true; actorRoot.remove(f.mesh); FX.emit(f.x,f.y,0.3,{count:24,colors:['#D98B1E','#F7C46A','#FFE0A0'],speed:3.5,up:1,size:0.18,life:0.9,grav:9});
    AudioKit.sticky(); if(play){ G.sticky=3.2; breakCombo(); popup('STICKY!',f.x,f.y+1,'gold',null,0.9); say('STICKY FINGERS!',true); } return; }
  if(f.hp>1){ f.hp--; f.cool=0.18; f.vr+=8*sgn(f.vr||1); f.vy+=1.2; f.pulse=1; AudioKit.crack(); popup('CRACK!',f.x,f.y+1.1,'hud',null,0.6);
    FX.emit(f.x,f.y+0.6,0.3,{count:8,colors:['#3E9A3A','#2E7D32','#D9A21E'],speed:3,up:2,size:0.14,life:0.5}); return; }
  f.dead=true; actorRoot.remove(f.mesh); spawnHalves(f,ang); sendToken(f);
  FX.emit(f.x,f.y,0.3,{count:perfect?22:14,colors:FRUIT[f.type].juice,speed:4.5,up:1,size:0.16,life:0.6,grav:12});
  AudioKit.slice(play?G.combo:3);
  if(play){ const pts=scoreHit(FRUIT[f.type].pts,perfect); popup('+'+pts,f.x,f.y+0.9,perfect?'gold':'hud'); strokeAdd(f);
    if(perfect){ AudioKit.perfect(); popup('PERFECT!',f.x,f.y+1.8,'gold',null,0.8); if(G.perfects%5===0) say(pick(['JUICY!','CLEAN CUT!','PERFECT!','SO SHARP!'])); }
    if(G.combo%10===0) say(G.combo+' IN A ROW!',true); }
}
function strokeAdd(f){ const s=Blade.stroke; if(G.t-s.t>0.4) s.n=0; s.n++; s.t=G.t; s.x=f.x; s.y=f.y; }
function strokeEnd(){ const s=Blade.stroke; if(s.n>=3&&G.state==='play'){ const b=s.n*s.n*5*mult(); addScore(b); popup(s.n+' FRUIT COMBO!',s.x,s.y+2.5,'gold',null,1.3); popup('+'+fmt(b),s.x,s.y+1.7,'gold',null,1.3);
  AudioKit.fanfare(); say(s.n>=5?'MEGA SLICE!':s.n===4?'QUADRUPLE!':'TRIPLE!',true); Keepers.forEach(k=>k.cheer=1); } s.n=0; }
function bladeStep(nx,ny){ const x0=Blade.x,y0=Blade.y, now=performance.now(), dtm=Math.max(4,now-Blade.lt)/1000; Blade.x=nx; Blade.y=ny; Blade.lt=now;
  Blade.pts.push({x:nx,y:ny,t:G.t}); const len=Math.hypot(nx-x0,ny-y0); if(len>1.5&&len/dtm>90) cutSegment(x0,y0,nx,ny); }
function synthSwipe(cx,cy){ const a=rand(-0.7,0.7)+(Math.random()<0.5?0:Math.PI), L=70*S, dx=Math.cos(a)*L, dy=Math.sin(a)*L;
  G.botTrail.push({x0:cx-dx,y0:cy-dy,x1:cx+dx,y1:cy+dy,t:G.t}); cutSegment(cx-dx,cy-dy,cx+dx,cy+dy); }
function botTick(dt){ G.botT-=dt; if(G.botT>0) return;
  if(G.boss&&G.phase==='boss'&&G.boss.wpCool<=0){ const w=weakPos(), s=toScreen(w.x,w.y,w.z); synthSwipe(s.x,s.y); G.botT=0.6; return; }
  const f=G.fruits.find(f=>!f.dead&&!f.hazard&&f.cool<=0&&f.age>0.3&&f.vy<1.5&&f.y>2.5); if(!f) return;
  const s=toScreen(f.x,f.y,f.z); synthSwipe(s.x,s.y); G.botT=0.14; }

// ---------- power-ups ----------
function activatePower(p,x,y){ const P=POW[p]; AudioKit.pickup(); if(G.state!=='play') return; say(P.say,true); popup(P.label,x,y+1.2,'lime',null,1.2);
  if(p==='bloom'){ if(!gainLife()) addScore(200*mult()); }
  if(p==='swarm'){ G.swarm=6; for(let i=0;i<6;i++){ const b=makeButterfly(SPECIES[i%4],(i%2?1:-1)*(World.halfW+4),rand(4,10),0.6); b.mode='escort'; } }
  if(p==='basket'){ G.frenzy=4; G.frenzyT=0; }
  if(p==='star') G.x2=10; }

// ---------- butterflies at the trays ----------
function discover(sp,tray){ G.seenRun.add(sp.id); const p=tray.grp.position;
  if(!Album.has(sp.id)){ Album.add(sp.id); Store.set(GAMEDEF.key('album'),[...Album].join(',')); G.newSpecies++;
    Toasts.push({sp,n:Album.size}); }
  else if(sp.rar>=2) popup(sp.name,p.x,p.y+1.6,'aqua',null,1.3,p.z); }
function trayFed(tray,boost){ tray.fill++; tray.pulse=1; const p=tray.grp.position;
  FX.emit(p.x,p.y+0.3,p.z,{count:6,colors:['#FFE28A','#FFFFFF'],speed:1.5,up:1.5,size:0.1,life:0.5,grav:3});
  if(Math.random()<(G.state==='play'?0.55:0.35)||boost){ const sp=rollSpecies(boost||0); arriveButterfly(tray,sp); if(G.state==='play') discover(sp,tray); } }

// ---------- waves ----------
function beginWave(w){
  G.wave=w; const sp=G.spec=domeSpec(w); G.speed=sp.speed; G.assist=clamp(1-(w-1)*0.3,0,1);
  if(sp.boss){ startBoss(sp); return; }
  G.phase='wave'; G.volleysLeft=sp.volleys; G.volleyT=1.1; banner('DOME '+sp.dome,sp.intro||'FEED THE BUTTERFLIES',1.9);
}
function waveClear(){
  G.phase='clear'; G.phaseT=0; const bonus=100*G.wave; addScore(bonus);
  banner('DOME '+G.spec.dome+' CLEAR','+'+fmt(bonus),2); AudioKit.fanfare(); AudioKit.cheer(false); Keepers.forEach(k=>k.cheer=1.6);
  say(pick(['BUTTERFLIES ARE HAPPY!','NEXT DOME!','SO YUMMY!','WHAT A FEAST!']),true);
  FX.emit(0,11,-1,{count:44,colors:['#F25C9A','#FFD23F','#FF8A3D','#FFFFFF','#9B59D0','#7ED957'],speed:7,up:4,size:0.2,life:1.7,grav:4,drag:1.2});
}
function startBoss(sp){
  G.phase='bossIntro'; G.phaseT=0; const D=BOSSDEF[sp.type], m=addOutline(new THREE.Mesh(bossGeo(sp.type),VOXMAT),1.06); actorRoot.add(m);
  G.boss={type:sp.type,name:D.name,icon:D.icon,R:D.R,hp:sp.hp,max:sp.hp,tier:sp.tier,mesh:m,x:0,y:-4,t:0,wpA:rand(0,6.28),wpCool:0.5,thickCd:0,
    sink:0.42+0.08*sp.tier,amp:World.halfW*0.42,freq:0.55+0.12*sp.tier+(sp.type==='mango'?0.25:0),lob:0,pulse:0,extraT:2.6};
  Tint.target=0.68; AudioKit.horn(); AudioKit.intensity=1; banner('BOSS!',D.name,2.3,'red'); say('GIANT FRUIT!',true); Keepers.forEach(k=>k.heave=2.4);
  FX.emit(0,0.2,0,{count:30,colors:['#E4FAFD','#8FE3F2','#FFFFFF'],speed:4,up:6,size:0.24,life:1,grav:12}); AudioKit.splash();
}
function bossCut(x0,y0,x1,y1,ppu){
  const B=G.boss, w=weakPos(), s=toScreen(w.x,w.y,w.z), q=segDist(s.x,s.y,x0,y0,x1,y1);
  if(B.wpCool<=0&&q.d<B.R*(0.36+0.12*G.assist)*ppu){ bossHit(w); return; }
  const bs=toScreen(B.x,B.y,0), q2=segDist(bs.x,bs.y,x0,y0,x1,y1);
  if(q2.d<B.R*ppu*0.9&&B.thickCd<=0){ B.thickCd=0.7; popup('TOO THICK!',B.x,B.y+B.R+0.6,'hud',null,0.8); AudioKit.clank(); B.pulse=0.5; }
}
function bossHit(w){
  const B=G.boss; B.hp--; B.wpCool=0.4; B.pulse=1; B.y=Math.min(B.y+1.2,World.apexMax-B.R*0.6); B.wpA+=rand(1.8,4.4);
  const pts=scoreHit(150*(B.tier+1),false); popup('+'+fmt(pts),w.x,w.y+1,'gold',null,1); AudioKit.crack(); G.shake=REDUCED?0:0.2;
  const fl=FRUIT[B.type==='melon'?'melon':B.type==='pine'?'pine':'mango'];
  FX.emit(w.x,w.y,w.z,{count:26,colors:fl.juice,speed:5,up:2,size:0.2,life:0.8,grav:10});
  for(let i=0;i<2;i++) sendToken({type:B.type,x:w.x+(i?1:-1),y:w.y,z:w.z});
  if(B.hp%2===0&&B.hp>0) say(pick(['KEEP GOING!','IT\'S CRACKING!','AGAIN!']),true);
  if(B.hp<=0) bossBurst();
}
function bossBurst(){
  const B=G.boss; G.phase='bossDown'; G.phaseT=0; actorRoot.remove(B.mesh); WeakMark.visible=false; AudioKit.burst(); AudioKit.fanfare(); AudioKit.cheer(true);
  const fl=FRUIT[B.type]; FX.emit(B.x,B.y,0,{count:90,colors:fl.juice.concat(['#FFFFFF']),speed:9,up:4,size:0.26,life:1.4,grav:9,drag:0.8});
  for(let i=0;i<8;i++) sendToken({type:B.type,x:B.x+rand(-1.5,1.5),y:B.y+rand(-1.5,1.5),z:0});
  for(let i=0;i<4;i++){ const tr=Trays[i%2], sp=rollSpecies(i===0?30:14); arriveButterfly(tr,sp); discover(sp,tr); }
  const bonus=1000*(B.tier+1); addScore(bonus); banner('BOSS BEATEN!','+'+fmt(bonus),2.4); say('WHAT A FEAST!',true); Keepers.forEach(k=>k.cheer=2.2);
  Tint.target=1; AudioKit.intensity=0;
}
function bossDunk(){ const B=G.boss; FX.emit(B.x,0.2,0,{count:40,colors:['#E4FAFD','#8FE3F2','#FFFFFF'],speed:5,up:7,size:0.26,life:1,grav:12});
  AudioKit.splash(); koiRush(B.x); Keepers.forEach(k=>k.heave=1.2); B.lob=1.3; breakCombo(); loseLife(); if(G.lives>0) say('HEAVE HO!',true); }

// ---------- per-frame helpers ----------
function fruitFell(f){ f.dead=true; actorRoot.remove(f.mesh); FX.emit(f.x,0.1,f.z,{count:12,colors:['#E4FAFD','#8FE3F2','#FFFFFF'],speed:2.6,up:4,size:0.18,life:0.7,grav:14});
  if(G.state==='play'&&!f.hazard&&!f.power&&!f.bonus&&(G.phase==='wave'||G.phase==='boss')){ AudioKit.splash(); koiRush(f.x); breakCombo(); loseLife(); }
  else if(Math.random()<0.5) AudioKit.bloop(); }
function updateFruits(dt){ const sp=G.speed*(G.state==='play'&&G.lives===1&&G.wave<6?0.9:1)*(1-0.12*G.assist);
  for(const f of G.fruits){ if(f.dead) continue; const h=dt*sp; f.age+=h; f.vy-=GRAV*h; if(G.swarm>0&&f.vy<-2.6&&!f.hazard) f.vy=-2.6;
    f.x+=f.vx*h; f.y+=f.vy*h; f.z=lerp(f.z0,0,Math.min(1,f.age/0.4)); f.rot+=f.vr*h; if(f.cool>0&&f.cool<50) f.cool-=dt; f.pulse=Math.max(0,f.pulse-dt*4);
    f.mesh.position.set(f.x,f.y,f.z); f.mesh.rotation.set(f.rot*0.4*f.rx,f.rot*0.6,f.rot); f.mesh.scale.setScalar(f.base*(1+0.14*f.pulse));
    if(f.y<-0.7) fruitFell(f); }
  G.fruits=G.fruits.filter(f=>!f.dead); }
function updateHalves(dt){ for(const h of G.halves){ h.vy-=GRAV*dt; h.x+=h.vx*dt; h.y+=h.vy*dt; h.rz+=h.vr*dt; h.mesh.position.set(h.x,h.y,h.z); h.mesh.rotation.set(0,0,h.rz);
    if(h.y<-0.9){ h.dead=true; actorRoot.remove(h.mesh); FX.emit(h.x,0.1,h.z,{count:5,colors:['#E4FAFD','#8FE3F2'],speed:1.6,up:2.5,size:0.12,life:0.5,grav:12}); } }
  G.halves=G.halves.filter(h=>!h.dead); }
function updateTokens(dt){ for(const k of G.tokens){ k.t+=dt/0.6; const e=Math.min(1,k.t), tp=k.tray.grp.position, tx=tp.x, ty=tp.y+0.35, tz=tp.z;
    const mx=(k.x0+tx)/2, my=Math.max(k.y0,ty)+2.4, u=1-e; k.mesh.position.set(u*u*k.x0+2*u*e*mx+e*e*tx,u*u*k.y0+2*u*e*my+e*e*ty,lerp(k.z0,tz,e));
    k.mesh.rotation.x+=dt*6; k.mesh.rotation.y+=dt*5; if(e>=1){ k.dead=true; actorRoot.remove(k.mesh); trayFed(k.tray); } }
  G.tokens=G.tokens.filter(k=>!k.dead); }
function clearAll(){ for(const f of G.fruits) actorRoot.remove(f.mesh); for(const h of G.halves) actorRoot.remove(h.mesh); for(const k of G.tokens) actorRoot.remove(k.mesh);
  G.fruits=[]; G.halves=[]; G.tokens=[]; G.pending=[]; if(G.boss){ actorRoot.remove(G.boss.mesh); G.boss=null; } WeakMark.visible=false;
  G.swarm=0; G.frenzy=0; G.sticky=0; Blade.stroke.n=0; }
function drawTrail(pts){ if(pts.length<2) return; const c=uctx, st=G.sticky>0, outer=st?'rgba(232,161,58,0.9)':'rgba(159,241,255,0.9)', inner=st?'#FFE0A0':'#FFFFFF';
  for(let pass=0;pass<2;pass++){ c.fillStyle=pass?inner:outer;
    for(let i=1;i<pts.length;i++){ const a=pts[i-1], b=pts[i]; if(b.gap) continue; const k=1-(G.t-b.t)/0.16; if(k<=0) continue;
      const len=Math.hypot(b.x-a.x,b.y-a.y), n=Math.max(1,Math.ceil(len/(3*S))), s=Math.max(1,Math.round((pass?5:10)*S*k));
      for(let j=0;j<=n;j++){ const x=lerp(a.x,b.x,j/n), y=lerp(a.y,b.y,j/n); c.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s); } } } }

function drawToast(){
  const q=Toasts[0]; if(!q) return; if(q.t0==null){ q.t0=G.t; AudioKit.sparkle(); }
  const dur=Toasts.length>1?1.3:1.9, e=G.t-q.t0; if(e>dur){ Toasts.shift(); return; }
  const inK=Math.min(1,e/0.22), outK=Math.max(0,(e-(dur-0.22))/0.22), slide=(1-easeOutBack(inK))+outK;
  const w=Math.min(W*0.86,320*S), h=Math.round(62*S), x=W/2-w/2, y=SAFE.t+Math.round(98*S)-slide*(h+120*S);
  panel(x,y,w,h); const art=speciesArt(q.sp,Math.max(2,Math.round(2.6*S))); uctx.drawImage(art,Math.round(x+10*S),Math.round(y+h/2-art.height/2));
  const tx=x+20*S+art.width, sm=Math.max(2,Math.round(1.9*S)), nm=Math.max(2,Math.min(Math.round(2.4*S),Math.floor((x+w-tx-12*S)/Math.max(1,measureText(q.sp.name,1)))));
  drawText(uctx,'NEW BUTTERFLY!',tx,y+h*0.32,sm,'gold','left'); drawText(uctx,q.sp.name,tx,y+h*0.68,nm,'hud','left');
  drawText(uctx,q.n+'/'+SPECIES.length,x+w-10*S,y+h*0.32,sm,'lime','right'); }

/* ---------- the world, as the kit sees it ---------- */
GAMEDEF={
  powers:POW,   // the engine pre-warms these power-up textures at load
  meta:{id:'fruit-rush',world:2,logo:['FRUIT','RUSH'],place:'DUBAI BUTTERFLY GARDEN',overTitle:"GARDEN'S CLOSED",lifeIcon:'bloom',
    hint:'SWIPE TO SLICE',hintMotion:'swipe',voice:'tweet',startSfx:'sparkle',clear:0xBFE9F3,accent:'lime',accentHex:PAL.lime,scrim:0.6},
  lines:{start:'FEEDING TIME!',over:"GARDEN'S CLOSED!",last:'LAST BLOOM!',hurt:['THE KOI GOT IT!','SPLASH!','OOPS!']},
  music:{tempo:126,lead:'triangle',leadVol:0.07,scale:[293.66,329.63,369.99,392.0,440.0,493.88,554.37,587.33],
    mel:[0,2,4,-1,4,5,4,2,3,-1,3,4,3,1,2,-1,4,4,5,7,5,4,2,4,3,2,1,-1,0,-1,-1,-1],bass:[73.42,73.42,98.0,98.0,110.0,110.0,73.42,110.0],dum:[0,3,6],tek:[2,5,7],ka:[1,4]},
  build(){},
  layout(){ layout(); },
  load(){ Store.get(this.key('album')).then(v=>{ if(v) v.split(',').filter(Boolean).forEach(id=>Album.add(id)); }); },
  reset(){ clearAll(); Toasts.length=0; G.powerPity=0; G.newSpecies=0; G.seenRun=new Set(); G.botTrail=[]; Tint.target=1; },
  start(w){ beginWave(w); },
  toTitle(){ G.attractT=0.6; },
  onOver(){ clearAll(); G.attractT=1.2; },
  onLifeLost(){ },
  onSay(){ Budgie.talk=0.6; },
  commentator(){ const p=Budgie.grp.position; return {x:p.x,y:p.y+1.5,z:p.z}; },
  waveLabel(){ return 'DOME '+(G.spec?G.spec.dome:1); },
  waveProgress(){ return G.phase==='wave'&&G.spec?(G.spec.volleys-G.volleysLeft)/G.spec.volleys:1; },
  bossHUD(){ return G.boss&&(G.phase==='boss'||G.phase==='bossIntro')?{name:G.boss.name,hp:G.boss.hp,max:G.boss.max,icon:G.boss.icon}:null; },
  powersHUD(){ const p=[]; if(G.swarm>0) p.push(['bfly',G.swarm/6]); if(G.frenzy>0) p.push(['basket',G.frenzy/4]); return p; },
  overStats(){ return 'DOME '+(G.spec?G.spec.dome:1)+'   TOP COMBO '+G.maxCombo; },
  overExtra(){ return G.newSpecies>0?'NEW BUTTERFLIES '+G.newSpecies:'BUTTERFLIES SEEN '+G.seenRun.size; },
  titleExtra(){ return 'BUTTERFLY ALBUM '+Album.size+'/'+SPECIES.length; },
  pointerDown(x,y,id){ Blade.on=true; Blade.id=id; Blade.x=Blade.tx=x; Blade.y=Blade.ty=y; Blade.lt=performance.now(); Blade.pts.push({x,y,t:G.t,gap:true}); },
  pointerMove(x,y,id){ if(!Blade.on||id!==Blade.id) return; Blade.tx=x; Blade.ty=y; if(G.sticky<=0) bladeStep(x,y); },
  pointerUp(x,y,id){ if(id!==Blade.id) return; Blade.on=false; Blade.id=null; strokeEnd(); },
  drawOverlay(){ Blade.pts=Blade.pts.filter(p=>G.t-p.t<0.16); drawTrail(Blade.pts); if(G.state==='play'||G.state==='paused') drawToast();
    G.botTrail=G.botTrail.filter(b=>G.t-b.t<0.16); for(const b of G.botTrail) drawTrail([{x:b.x0,y:b.y0,t:b.t},{x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2,t:b.t},{x:b.x1,y:b.y1,t:b.t}]); },
  update(gdt,dt){
    Blade.stun=Math.max(0,Blade.stun-dt);
    if(Blade.on&&G.sticky>0){ const k=1-Math.exp(-dt*6); bladeStep(lerp(Blade.x,Blade.tx,k),lerp(Blade.y,Blade.ty,k)); }
    if(Blade.stroke.n>0&&G.t-Blade.stroke.t>0.4) strokeEnd();
    const auto=G.state==='title'||G.state==='over'||(BOT&&G.state==='play'); if(auto) botTick(dt);
    if(G.state==='title'||G.state==='over'){ G.attractT-=gdt; if(G.attractT<=0){ G.attractT=rand(1.1,1.7); queueToss(pick(['mango','orange','banana','melon','pine']),G.nextSide,0,{}); G.nextSide*=-1; } }
    const due=G.pending.filter(q=>(q.delay-=gdt)<=0); if(due.length){ G.pending=G.pending.filter(q=>q.delay>0); for(const q of due){ try{ tossFruit(q); }catch(e){ console.error(e); } } }
    if(G.state==='play'){
      G.swarm=Math.max(0,G.swarm-dt); G.sticky=Math.max(0,G.sticky-dt);
      if(G.frenzy>0){ G.frenzy=Math.max(0,G.frenzy-dt); G.frenzyT-=dt; if(G.frenzyT<=0){ G.frenzyT=0.28; queueToss(pick(['mango','orange','banana','melon']),G.nextSide,0,{},{bonus:true}); G.nextSide*=-1; } }
      if(G.phase==='wave'){ G.volleyT-=gdt; if(G.volleyT<=0&&G.volleysLeft>0) launchVolley();
        if(G.volleysLeft<=0&&G.pending.length===0&&G.fruits.every(f=>f.dead||f.hazard||f.power||f.bonus)) waveClear(); }
      else if(G.phase==='clear'){ G.phaseT+=gdt; if(G.phaseT>2.3) beginWave(G.wave+1); }
      else if(G.phase==='bossIntro'){ const B=G.boss; G.phaseT+=gdt; const k=clamp((G.phaseT-0.3)/1.4,0,1); B.y=lerp(-4,7.8,easeOutBack(k)); B.mesh.position.set(0,B.y,0); B.mesh.rotation.y+=gdt*2;
        if(G.phaseT>2.5){ G.phase='boss'; } }
      else if(G.phase==='boss'){ const B=G.boss; B.t+=gdt; B.x=B.amp*Math.sin(B.t*B.freq);
        if(B.lob>0){ B.lob-=gdt; B.y+=(7.8-B.y)*(1-Math.exp(-gdt*4)); } else B.y-=B.sink*gdt*G.speed*(1-0.3*G.assist);
        B.wpCool-=gdt; B.thickCd-=gdt; B.pulse=Math.max(0,B.pulse-gdt*3); if(B.type==='pine') B.wpA+=gdt*1.3;
        B.mesh.position.set(B.x,B.y,0); B.mesh.rotation.set(0,Math.sin(B.t*0.6)*0.5,Math.sin(B.t*0.8)*0.12); B.mesh.scale.setScalar(1+0.08*B.pulse);
        if(B.y-B.R*0.8<0.1&&B.lob<=0) bossDunk();
        B.extraT-=gdt; if(B.extraT<=0){ B.extraT=rand(2.2,3.2); const pw=Math.random()<0.15; queueToss(pw?'power':pick(['mango','orange','banana']),G.nextSide,0,{},pw?{power:pickPower()}:null); G.nextSide*=-1; } }
      else if(G.phase==='bossDown'){ G.phaseT+=gdt; if(G.phaseT>2.8){ G.boss=null; beginWave(G.wave+1); } }
    }
    if(G.boss&&G.phase==='boss'&&G.boss.wpCool<=0){ const w=weakPos(); WeakMark.visible=true; WeakMark.position.set(w.x,w.y,w.z); WeakMark.scale.setScalar(1+0.18*Math.sin(G.t*9)); WeakMark.rotation.z=Math.sin(G.t*3)*0.2; }
    else WeakMark.visible=false;
    updateFruits(gdt); updateHalves(gdt); updateTokens(gdt);
  },
  animate(gdt,dt){ const t=(World.t+=gdt);
    const pt=World.pond.material.map; pt.offset.x=(pt.offset.x+gdt*0.02)%1; pt.offset.y=(pt.offset.y+gdt*0.03)%1;
    World.fall.material.map.offset.y=(World.fall.material.map.offset.y+gdt*1.4)%1;
    if(Math.random()<gdt*6) FX.emit(11+rand(-0.8,0.8),1.8,-11.6,{count:2,colors:['#E4FAFD','#BFF3FB'],speed:1.2,up:1.5,size:0.14,life:0.5,grav:8});
    Beams.forEach((b,i)=>{ b.material.opacity=0.06+Math.sin(t*0.7+i*2)*0.02; b.rotation.z=0.32+Math.sin(t*0.3+i)*0.03; });
    Keepers.forEach(k=>{ const inner=k.side<0?k.armR:k.armL, outer=k.side<0?k.armL:k.armR; k.grp.position.y=0.5+Math.sin(t*2+k.side)*0.03;
      if(k.heave>0){ k.heave-=gdt; const s=Math.abs(Math.sin(t*6))*0.3; k.armR.rotation.set(-2.9+s,0,0.25); k.armL.rotation.set(-2.9+s,0,-0.25); if(k.heave<=0){k.armR.rotation.set(0,0,0);k.armL.rotation.set(0,0,0);} return; }
      if(k.cheer>0){ k.cheer-=gdt; const s=Math.sin(t*14)*0.35; k.armR.rotation.set(-2.6,0,0.4+s); k.armL.rotation.set(-2.6,0,-0.4-s); if(k.cheer<=0){k.armR.rotation.set(0,0,0);k.armL.rotation.set(0,0,0);} return; }
      if(k.toss>0){ k.toss+=gdt; const q=k.toss/0.35; inner.rotation.x=-Math.sin(Math.PI*Math.min(1,q))*2.8; if(q>=1){k.toss=0;inner.rotation.x=0;} }
      outer.rotation.x=Math.sin(t*1.5+k.side)*0.06; });
    Trays.forEach((tr,i)=>{ tr.pulse=Math.max(0,tr.pulse-gdt*3); tr.grp.rotation.z=Math.sin(t*1.1+i)*0.04; tr.grp.scale.setScalar(1+0.08*tr.pulse); });
    const bp=Trays[1].grp.position; Budgie.talk=Math.max(0,Budgie.talk-gdt); Budgie.grp.position.set(bp.x+0.62,bp.y+0.22,bp.z+0.35); Budgie.grp.rotation.y=-0.35;
    Budgie.body.rotation.x=Budgie.talk>0?-Math.abs(Math.sin(t*18))*0.25:0; Budgie.body.position.y=0.2+(Budgie.talk>0?Math.abs(Math.sin(t*9))*0.12:0);
    updateButterflies(gdt); updateKoi(gdt); FX.update(gdt);
  },
  debug:{beginWave,activatePower,cutSegment,World,Blade,Trays,Flutter,Album,queueToss,synthSwipe}
};
Kit.run(GAMEDEF);
