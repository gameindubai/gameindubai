
/* ---------- Juggle Show rules ---------- */
Object.assign(G,{balls:[],pickups:[],queue:[],spec:null,ballSpeed:1,nextSide:1,pickupT:10,leapT:3,powers:{slow:0,dolphin:0,dCharges:0},boss:null,assist:1,waveT:0,waveDur:20,phaseT:0});
function waveSpec(w){
  const tier=Math.floor((w-1)/5), c=((w-1)%5)+1, speed=1+0.07*tier;
  if(c===5) return {boss:true,tier,speed,baskets:3+tier,extra:tier>=2?['beach','rubber']:['beach']};
  const base=[['beach'],['beach','beach'],['beach','rubber'],['beach','beach','rubber']][c-1];
  const types=base.concat(Array(Math.min(tier,3)).fill('rubber')).slice(0,7);
  return {boss:false,tier,speed,types,dur:16+types.length*2};
}
function cheer(dur,big){ World.cheerT=Math.max(World.cheerT,dur); AudioKit.cheer(big); }
function splash(x,big=1){ FX.emit(x,0.1,0,{count:Math.round(18*big),colors:['#E4FAFD','#8FE3F2','#FFFFFF','#39CCE3'],speed:3.4*big,up:5,size:0.22,life:0.8,grav:14}); AudioKit.splash(); }

// ---------- balls ----------
function spawnBall(type,x,y,z,vx,vy){ const T=BALL[type], vis=makeBallMesh(type);
  const b={type,x,y,z,z0:z,vx,vy,r:T.r,age:0,inside:false,cool:0,squash:0,scored:false,ret:null,dead:false,mesh:vis.mesh,marker:vis.marker}; G.balls.push(b); return b; }
function removeBall(b){ b.dead=true; actorRoot.remove(b.mesh); actorRoot.remove(b.marker); b.marker.material.dispose(); }
function clearBalls(){ G.balls.forEach(removeBall); G.balls=[]; G.queue=[]; }
function queueBall(type,delay){ G.queue.push({type,delay}); }
function tossBall(type){
  const side=G.nextSide; G.nextSide*=-1; Trainers[side<0?0:1].toss=0.001;
  const h=trainerHand(side), T=BALL[type], hw=World.halfW, ny=Seal.noseY();
  const tx=rand(-hw*0.55,hw*0.55), apex=rand(9.8,11.4), vy=Math.sqrt(2*T.g*(apex-h.y)), T1=vy/T.g+Math.sqrt(2*(apex-ny)/T.g);
  spawnBall(type,h.x,h.y,h.z,(tx-h.x)/T1,vy);
}
function aiTarget(){
  let best=null,bt=1e9; const ny=Seal.noseY();
  for(const b of G.balls){ if(b.ret||b.scored) continue; const g=BALL[b.type].g, dy=b.y-ny, disc=b.vy*b.vy+2*g*dy; if(disc<0) continue;
    const t=(b.vy+Math.sqrt(disc))/g; if(t<bt){bt=t;best=b;} }
  if(!best) return Seal.tx*0.98;
  const hw=World.halfW; let px=best.x+best.vx*bt; if(px>hw-best.r) px=2*(hw-best.r)-px; if(px<-hw+best.r) px=2*(-hw+best.r)-px;
  let aim=px>0?0.3:-0.3; if(best.type==='basket'&&Hoop.active) aim=-clamp((Hoop.x-px)*0.13,-0.75,0.75);
  return px+aim;
}
function updateBalls(dt){
  const bdt=dt*G.ballSpeed*(G.powers.slow>0?0.6:1)*(G.state==='play'&&G.lives===1&&G.wave<6?0.92:1), steps=2, h=bdt/steps, hw=World.halfW;
  for(const b of G.balls){
    if(b.dead) continue;
    if(b.ret){ b.ret.t+=dt/0.6; const k=Math.min(1,b.ret.t); b.x=lerp(b.ret.x0,b.ret.tx,k); b.y=lerp(b.ret.y0,b.ret.ty,k)+Math.sin(Math.PI*k)*2; b.z=lerp(b.ret.z0,b.ret.tz,k);
      b.mesh.position.set(b.x,b.y,b.z); b.mesh.scale.setScalar(1-k*0.6); b.marker.visible=false;
      if(k>=1){ FX.emit(b.x,b.y,b.z,{count:6,colors:['#FFE28A','#FFFFFF'],speed:2,up:2,size:0.14,life:0.5,grav:4}); removeBall(b); } continue; }
    const T=BALL[b.type];
    for(let s=0;s<steps;s++){
      b.age+=h; const prevY=b.y; b.vy-=T.g*h; b.x+=b.vx*h; b.y+=b.vy*h; b.z=lerp(b.z0,0,Math.min(1,b.age/0.45)); if(b.cool>0) b.cool-=h;
      if(!b.inside&&Math.abs(b.x)<hw-b.r) b.inside=true;
      if(b.inside){ if(b.x<-hw+b.r){b.x=-hw+b.r;b.vx=Math.abs(b.vx)*0.85;} else if(b.x>hw-b.r){b.x=hw-b.r;b.vx=-Math.abs(b.vx)*0.85;} }
      if(b.z>-0.08&&!b.scored&&b.cool<=0&&b.vy<0) noseCheck(b);
      if(b.type==='basket'&&Hoop.active&&Hoop.rise>0.95&&!b.scored) hoopCheck(b,prevY,h);
      if(b.y-b.r*0.4<=0){ if(onDrop(b)) break; }
    }
    if(b.dead) continue;
    b.squash=Math.max(0,b.squash-dt*6); const q=b.squash*0.28;
    b.mesh.position.set(b.x,b.y,b.z); b.mesh.scale.set(1+q,1-q,1+q); b.mesh.rotation.z-=b.vx*bdt*0.9; b.mesh.rotation.x+=bdt*0.6;
    const hk=1-clamp(b.y/13,0,1); b.marker.position.set(b.x,0.04,b.z); b.marker.scale.setScalar(0.45+hk*0.9*(b.r/0.62)); b.marker.material.opacity=0.2+hk*0.65; b.marker.visible=true;
  }
  G.balls=G.balls.filter(b=>!b.dead);
}
function noseCheck(b){
  const s=Seal, ny=s.noseY(), dx=b.x-s.x, dy=b.y-ny, reach=b.r+0.55+G.assist*0.35;
  if(Math.abs(dx)<reach&&dy>-0.4&&dy<b.r+0.35){ const T=BALL[b.type], perfect=Math.abs(dx)<0.28+G.assist*0.15;
    b.y=ny+b.r+0.05; b.vy=T.bv; b.vx=clamp(dx*2.6+s.vx*0.22,-7,7)*(1-G.assist*0.3)-b.x*0.08*G.assist; b.cool=0.15; b.squash=1; onHit(b,perfect); }
}
function onHit(b,perfect){
  Seal.kick=1;
  if(G.state!=='play'){ AudioKit.bounce(3); return; }
  const pts=scoreHit(BALL[b.type].pts,perfect); popup('+'+pts,b.x,b.y+1.0,perfect?'gold':'hud'); AudioKit.bounce(G.combo);
  FX.emit(b.x,b.y-b.r,0.2,{count:perfect?10:4,colors:perfect?['#FFE28A','#F4B731','#FFFFFF']:['#FFFFFF','#E4FAFD'],speed:2.4,up:1.5,size:0.13,life:0.45,grav:6});
  if(perfect){ AudioKit.perfect(); Seal.clap=0.45; popup('PERFECT!',b.x,b.y+2.1,'gold',null,0.8); if(G.perfects%5===0) say(pick(['PERFECT!','SO SMOOTH!','BRAVO!','SHOWSTOPPER!'])); }
  if(G.combo%10===0){ say(G.combo+' IN A ROW!',true); cheer(1.3,G.combo>=30); }
}
function onDrop(b){
  if(b.scored){ splash(b.x,0.6); removeBall(b); return true; }
  if(G.state==='play'&&G.powers.dolphin>0&&G.powers.dCharges>0){ dolphinSave(b); return false; }
  splash(b.x,b.type==='beach'?1.15:1); removeBall(b);
  if(G.state!=='play'){ if(G.state==='title'||G.state==='over') queueBall(b.type,0.9); return true; }
  breakCombo();
  if(b.type==='basket'&&G.boss){ G.boss.ball=null; G.boss.dropT=1.4; } else queueBall(b.type,1.2);
  loseLife(); return true;
}
function dolphinSave(b){
  G.powers.dCharges--; if(G.powers.dCharges<=0) G.powers.dolphin=0;
  const dir=b.vx>=0?1:-1; leap(b.x-dir*2.2,b.x+dir*2.2,2.4,0.8,0.7,2);
  b.y=0.45+b.r; b.vy=BALL[b.type].bv*1.03; b.vx=b.vx*0.35-b.x*0.12; b.squash=1; b.cool=0.2;
  popup('SAVE!',b.x,2.5,'aqua'); AudioKit.chirp(); FX.emit(b.x,0.1,0,{count:14,colors:['#E4FAFD','#8FE3F2','#FFFFFF'],speed:3,up:4,size:0.2,life:0.7});
}

// ---------- pickups ----------
function spawnPickup(){
  const w={fish:G.lives<=1?4:G.lives<3?2:0.7,slow:1.6,dolphin:1.6,star:1.6}; let tot=0; for(const k in w) tot+=w[k];
  let r=Math.random()*tot, type='star'; for(const k in w){ r-=w[k]; if(r<=0){type=k;break;} }
  const side=G.nextSide; G.nextSide*=-1; Trainers[side<0?0:1].toss=0.001; const h=trainerHand(side), tx=rand(-World.halfW*0.6,World.halfW*0.6);
  G.pickups.push({type,x:h.x,y:h.y,z:h.z,z0:h.z,vx:(tx-h.x)/2.2,vy:6.5,age:0,mesh:makePickMesh(type)});
}
function updatePickups(dt){
  for(const p of G.pickups){
    p.age+=dt; p.vy-=9*dt; if(p.vy<-2.4) p.vy=-2.4; if(p.age>1.4) p.vx*=Math.exp(-dt*1.5);
    p.x+=p.vx*dt+Math.sin(p.age*3)*0.5*dt; p.y+=p.vy*dt; p.z=lerp(p.z0,0,Math.min(1,p.age/0.5));
    p.mesh.position.set(p.x,p.y,p.z); p.mesh.rotation.y+=dt*2.2; p.mesh.rotation.x=Math.sin(p.age*2)*0.2;
    if(Math.abs(p.x-Seal.x)<1.3&&p.y<4.8&&p.y>0.2&&p.age>0.3){ applyPickup(p.type,p.x,p.y); p.dead=true; }
    else if(p.y<0.15){ FX.emit(p.x,0.1,0,{count:8,colors:['#E4FAFD','#8FE3F2'],speed:2,up:3,size:0.16,life:0.5}); p.dead=true; }
    if(p.dead) actorRoot.remove(p.mesh);
  }
  G.pickups=G.pickups.filter(p=>!p.dead);
}
function applyPickup(type,x,y){
  const P=PICK[type]; AudioKit.pickup(); say(P.say,true); popup(P.label,x,y+1.2,'aqua',null,1.1);
  FX.emit(x,y,0.3,{count:16,colors:['#FFE28A','#F4B731','#FFFFFF',P.bg],speed:3.5,up:3,size:0.18,life:0.7,grav:6});
  if(type==='fish'){ if(!gainLife()) addScore(200*mult()); }
  if(type==='slow') G.powers.slow=6;
  if(type==='dolphin'){ G.powers.dolphin=14; G.powers.dCharges=2; AudioKit.chirp(); }
  if(type==='star') G.x2=10;
}
function clearPickups(){ G.pickups.forEach(p=>actorRoot.remove(p.mesh)); G.pickups=[]; }

// ---------- waves & boss ----------
function beginWave(w){
  G.wave=w; const sp=G.spec=waveSpec(w); G.ballSpeed=sp.speed; G.assist=clamp(1-(w-1)*0.3,0,1); G.pickupT=rand(7,11);
  if(sp.boss){ startBoss(sp); return; }
  G.phase='wave'; G.waveT=0; G.waveDur=sp.dur; sp.types.forEach((t,i)=>queueBall(t,0.35+i*0.9));
  const n=sp.types.length; banner('WAVE '+w,n+(n>1?' BALLS':' BALL'),1.5); Screen.art('dolphin');
}
function waveClear(){
  G.phase='clear'; G.phaseT=0; let kept=0;
  for(const b of G.balls){ const h=trainerHand(b.x<0?-1:1); b.ret={t:0,x0:b.x,y0:b.y,z0:b.z,tx:h.x,ty:h.y,tz:h.z}; kept++; }
  G.queue=[]; const bonus=50*G.wave*Math.max(1,kept); addScore(bonus);
  banner('WAVE '+G.wave+' CLEAR','+'+fmt(bonus),2); AudioKit.whistle(); AudioKit.fanfare(); cheer(1.6,false);
  Trainers.forEach(t=>t.clap=1.4); say(pick(['NICE ONE!','CROWD LOVES YOU!','ENCORE!','KEEP IT UP!']),true);
  FX.emit(0,11,-1,{count:40,colors:['#F4B731','#39CCE3','#F0503C','#FFFFFF','#3CC46A'],speed:7,up:4,size:0.2,life:1.6,grav:5,drag:1.2});
}
function startBoss(sp){
  G.phase='bossIntro'; G.phaseT=0; G.boss={hp:sp.baskets,max:sp.baskets,extra:sp.extra,dropT:1.2,ball:null,tier:sp.tier};
  const hw=World.halfW; Hoop.x=Hoop.tx=pick([-1,1])*hw*0.55; Hoop.active=true; Hoop.riseT=0; Hoop.grp.visible=true;
  Macaw.grp.visible=true; Macaw.state='fly'; Macaw.x=hw+12; Macaw.y=15; Macaw.tx=Hoop.x; Macaw.ty=HOOP_Y+1.9;
  Tint.target=0.55; AudioKit.horn(); AudioKit.intensity=1; banner('BOSS!','MACAW HOOPS',2.3,'red'); Screen.art('macaw'); say('HOOPS TIME!',true);
}
function macawDrop(){ const hw=World.halfW; let x=rand(-hw*0.6,hw*0.6); if(Math.abs(x-Hoop.x)<2.6) x=Hoop.x+sgn(-Hoop.x||1)*rand(2.8,4);
  Macaw.state='fly'; Macaw.tx=clamp(x,-hw+1,hw-1); Macaw.ty=12.6; G.boss.dropping=true; }
function hoopCheck(b,prevY,h){
  const ry=HOOP_Y+0.06, dx=b.x-Hoop.x;
  if(b.vy<0&&b.y>ry&&b.y<ry+4.5&&Math.abs(dx)<2.4){ b.vx+=(-dx)*(2.6+2*G.assist)*h; b.vx*=(1-1.2*h); }
  if(b.vy<0&&prevY>ry&&b.y<=ry){ const a=Math.abs(dx);
    if(a<0.78) basketScored(b);
    else if(a<0.78+b.r+0.1){ b.y=ry+0.05; b.vy=4.2; b.vx+=sgn(dx)*2.2; AudioKit.clank(); popup('CLANK!',b.x,ry+1,'hud',null,0.6); Hoop.wob=0.6; } }
}
function basketScored(b){
  b.scored=true; b.vx*=0.15; b.vy=-3; Hoop.wob=1;
  const pts=250*(G.boss?G.boss.tier+1:1)*mult(); addScore(pts); popup('SWISH!',Hoop.x,HOOP_Y+2.2,'gold',null,1.1); popup('+'+fmt(pts),Hoop.x,HOOP_Y+1.2,'gold');
  AudioKit.swish(); cheer(1.4,true); say(pick(['SWISH!','NOTHING BUT NET!','SLAM DUNK!']),true);
  FX.emit(Hoop.x,HOOP_Y,0,{count:24,colors:['#FFE28A','#F4B731','#E8561F','#FFFFFF'],speed:4,up:3,size:0.18,life:0.9,grav:7});
  if(G.boss){ G.boss.hp--; G.boss.ball=null; G.boss.dropT=1.3;
    if(G.boss.hp<=0) bossDown(); else { const hw=World.halfW; let nx=0; for(let i=0;i<30;i++){ nx=rand(-hw*0.72,hw*0.72); if(Math.abs(nx-Hoop.x)>=3) break; } Hoop.tx=nx; } }
}
function bossDown(){
  G.phase='bossDown'; G.phaseT=0; const bonus=1000*(G.boss.tier+1); addScore(bonus);
  banner('BOSS BEATEN!','+'+fmt(bonus),2.4); AudioKit.fanfare(); cheer(2.4,true); Trainers.forEach(t=>t.clap=2);
  FX.emit(0,12,-1,{count:70,colors:['#F4B731','#39CCE3','#F0503C','#FFFFFF','#3CC46A','#2455C8'],speed:8,up:5,size:0.22,life:2,grav:5,drag:1.1});
  for(const b of G.balls){ if(b.scored) continue; const h=trainerHand(b.x<0?-1:1); b.ret={t:0,x0:b.x,y0:b.y,z0:b.z,tx:h.x,ty:h.y,tz:h.z}; }
  G.queue=[]; Macaw.state='leave'; Macaw.tx=World.halfW+14; Macaw.ty=17; Hoop.active=false; Tint.target=1; AudioKit.intensity=0; Screen.art('dolphin');
}

// ---------- input ----------
const _ray=new THREE.Raycaster(),_ndc=new THREE.Vector2(),_plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),_hit=new THREE.Vector3(),_sv=new THREE.Vector3();
function screenToWorldX(sx){ _sv.set(Seal.x,2.2,0).project(camera); _ndc.set((sx/W)*2-1,_sv.y); _ray.setFromCamera(_ndc,camera); return _ray.ray.intersectPlane(_plane,_hit)?_hit.x:Seal.tx; }
let dragId=null;

/* ---------- the world, as the kit sees it ---------- */
Kit.run({
  meta:{id:'juggle-show',world:1,logo:['JUGGLE','SHOW'],place:'DUBAI DOLPHINARIUM',overTitle:"SHOW'S OVER",lifeIcon:'fish',
    hint:'DRAG TO MOVE',hintMotion:'drag',voice:'squawk',startSfx:'whistle',clear:0x0D2340,accent:'aqua',accentHex:PAL.aqua},
  lines:{start:'SHOWTIME!',over:"SHOW'S OVER!",last:'LAST FISH!',hurt:['OOPS!','SPLASH!','SHAKE IT OFF!']},
  music:{tempo:112,scale:[293.66,311.13,369.99,392.0,440.0,466.16,523.25,587.33],
    mel:[4,-1,4,5,4,3,2,-1,2,3,4,-1,3,2,1,0,4,-1,6,5,4,5,6,7,6,5,4,3,2,1,0,-1],bass:[73.42,73.42,73.42,55.0,98.0,98.0,110.0,73.42],dum:[0,4],tek:[1,3,6],ka:[5,7]},
  build(){ },
  layout(){ layout(); },
  reset(){ clearBalls(); clearPickups(); G.powers={slow:0,dolphin:0,dCharges:0}; G.boss=null; Hoop.active=false; Macaw.state='off'; Macaw.grp.visible=false; },
  start(w){ beginWave(w); },
  toTitle(){ Screen.art('dolphin'); queueBall('beach',0.8); },
  onOver(){ clearBalls(); clearPickups(); Hoop.active=false; if(Macaw.grp.visible){Macaw.state='leave';Macaw.tx=World.halfW+14;} G.powers={slow:0,dolphin:0,dCharges:0}; queueBall('beach',1.2); },
  onLifeLost(){ AudioKit.aww(); },
  onSay(){ Parrot.talk=0.6; },
  commentator(){ const p=Parrot.grp.position; return {x:p.x,y:p.y+1.6,z:p.z}; },
  waveLabel(){ return 'WAVE '+G.wave; },
  waveProgress(){ return G.phase==='wave'?G.waveT/G.waveDur:1; },
  bossHUD(){ return G.boss&&(G.phase==='boss'||G.phase==='bossIntro')?{name:'MACAW HOOPS',hp:G.boss.hp,max:G.boss.max,icon:'macaw'}:null; },
  powersHUD(){ const p=[]; if(G.powers.slow>0) p.push(['whistle',G.powers.slow/6]); if(G.powers.dolphin>0) p.push(['dolphin',G.powers.dolphin/14,G.powers.dCharges]); return p; },
  overStats(){ return 'WAVE '+G.wave+'   TOP COMBO '+G.maxCombo; },
  pointerDown(x,y,id){ dragId=id; Seal.tx=screenToWorldX(x); },
  pointerMove(x,y,id){ if(id===dragId) Seal.tx=screenToWorldX(x); },
  pointerUp(x,y,id){ if(id===dragId) dragId=null; },
  drawOverlay(){ if(G.state!=='play') return; const c=uctx, limit=SAFE.t+Math.round(10*S)+Math.round(42*S)+Math.round(10*S);
    for(const b of G.balls){ if(b.ret) continue; const sp=toScreen(b.x,b.y,0); if(sp.y<limit){ const ax=clamp(sp.x,20,W-20), s2=Math.round(4*S);
      c.fillStyle=PAL.ink; c.fillRect(Math.round(ax-s2*2-1),limit-1,s2*4+2,s2+2); c.fillRect(Math.round(ax-s2-1),limit+s2-1,s2*2+2,s2+2);
      c.fillStyle=BALL[b.type].col; c.fillRect(Math.round(ax-s2*2),limit,s2*4,s2); c.fillRect(Math.round(ax-s2),limit+s2,s2*2,s2); } } },
  update(gdt,dt){
    const auto=G.state==='title'||G.state==='over'||(BOT&&G.state==='play');
    if(auto) Seal.tx+=(aiTarget()-Seal.tx)*Math.min(1,dt*10); else if(Input.keys) Seal.tx+=Input.keys*15*dt;
    const hw=World.halfW; Seal.tx=clamp(Seal.tx,-hw+0.7,hw-0.7);
    const px=Seal.x; Seal.x+=(Seal.tx-Seal.x)*(1-Math.exp(-gdt*20)); Seal.vx=gdt>0?(Seal.x-px)/gdt:0;
    G.leapT-=dt; if(G.leapT<=0){ G.leapT=rand(4,8); const dir=pick([-1,1]), x0=-dir*rand(4,9), x1=x0+dir*rand(6,10);
      leap(x0,x1,rand(3,5),rand(1.3,1.7),-3.2); if(Math.random()<0.35) leap(x0-dir*1.5,x1-dir*1.5,rand(3,5),1.5,-4.4); }
    const tossing=G.state==='title'||G.state==='over'||(G.state==='play'&&(G.phase==='wave'||G.phase==='boss'));
    if(tossing){ const due=G.queue.filter(q=>(q.delay-=gdt)<=0); if(due.length){ G.queue=G.queue.filter(q=>q.delay>0); for(const q of due){ try{ tossBall(q.type); }catch(e){ console.error(e); } } } }
    if(G.state==='play'){
      G.powers.slow=Math.max(0,G.powers.slow-dt);
      if(G.powers.dolphin>0){ G.powers.dolphin=Math.max(0,G.powers.dolphin-dt); if(G.powers.dolphin<=0) G.powers.dCharges=0; }
      if(G.phase==='wave'||G.phase==='boss'){ G.pickupT-=gdt; if(G.pickupT<=0){ G.pickupT=rand(9,14); spawnPickup(); } }
      if(G.phase==='wave'){ G.waveT+=gdt; if(G.waveT>=G.waveDur) waveClear(); }
      else if(G.phase==='clear'){ G.phaseT+=gdt; if(G.phaseT>2.2) beginWave(G.wave+1); }
      else if(G.phase==='bossIntro'){ G.phaseT+=gdt; if(G.phaseT>0.9&&Macaw.state==='fly'&&Math.abs(Macaw.x-Hoop.x)<0.5) Macaw.state='perch';
        if(G.phaseT>2.6){ G.phase='boss'; Macaw.state='perch'; G.boss.extra.forEach((t,i)=>queueBall(t,0.2+i*0.9)); } }
      else if(G.phase==='boss'){ const B=G.boss;
        if(!B.ball&&!B.dropping){ B.dropT-=gdt; if(B.dropT<=0) macawDrop(); }
        if(B.dropping&&Math.abs(Macaw.x-Macaw.tx)<0.35&&Math.abs(Macaw.y-Macaw.ty)<0.5){
          B.dropping=false; B.ball=spawnBall('basket',Macaw.x,Macaw.y-1,0,0,0.5); B.ball.inside=true; AudioKit.squawk(); Macaw.tx=Hoop.x; Macaw.ty=HOOP_Y+1.9; }
        if(Macaw.state==='fly'&&!B.dropping&&Math.abs(Macaw.x-Hoop.x)<0.4&&Math.abs(Macaw.y-(HOOP_Y+1.9))<0.4) Macaw.state='perch';
        if(Macaw.state==='perch'&&B.dropping) Macaw.state='fly'; }
      else if(G.phase==='bossDown'){ G.phaseT+=gdt; if(G.phaseT>2.8){ G.boss=null; beginWave(G.wave+1); } }
    }
    updateBalls(gdt); updatePickups(gdt);
  },
  animate(gdt,dt){ animateWorld(gdt,G); },
  debug:{beginWave,spawnPickup,applyPickup,World,Seal,Hoop,Macaw}
});
