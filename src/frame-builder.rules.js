
let GAMEDEF=null;
/* ---------- state ---------- */
const Hook={ax:0,vx:0,tx:0,th:0,om:0,x:0,y:6,L:7,wind:0,damp:2.3};
const Towers=[{h:0,w:TW,cx:-TX,meshes:[]},{h:0,w:TW,cx:TX,meshes:[]}];
const Falling=[], Debris=[];
const Life={frames:0};
const _ray=new THREE.Raycaster(), _ndc=new THREE.Vector2(), _plane=new THREE.Plane(new THREE.Vector3(0,0,1),0), _hit=new THREE.Vector3(), _sv=new THREE.Vector3();
let dragId=null, bridgeMeshNow=null;
G.nextHang=0.4;   // title-screen demo starts dropping blocks right away

/* ---------- waves: 6 levels each; wave 5 of every cycle is the sky bridge ---------- */
function frameSpec(w){ const cyc=Math.floor((w-1)/5), k=(w-1)%5;
  return {boss:k===4,cyc,k,goal:(k+1)*LEVELS,beat:Math.max(0.95,2.0-0.12*k-0.28*cyc),gust:w>=2,gustF:1.5+1.0*cyc+0.25*k,gustEvery:Math.max(4.5,8.5-cyc),damp:Math.max(1.1,2.3-0.3*cyc)}; }
const minH=()=>Math.min(Towers[0].h,Towers[1].h), maxH=()=>Math.max(Towers[0].h,Towers[1].h);
const meters=h=>Math.round(h*M_PER);
function beginWave(w){
  G.wave=w; const sp=G.spec=frameSpec(w); G.assist=clamp(1-(w-1)*0.3,0,1); G.waveStartH=minH();
  if(sp.boss){ G.phase='bossIntro'; G.phaseT=0; G.boss={name:'SKY BRIDGE',icon:'bridge',hp:1,max:1};
    banner('SKY BRIDGE!','LOWER IT ACROSS BOTH TOWERS',2.2); AudioKit.horn(); say('BRIDGE TIME! KEEP IT STEADY!',true); AudioKit.intensity=1; G.gustT=3; return; }
  G.phase='wave'; G.gustT=rand(5,8);
  banner(meters(sp.goal)+' M',['KEEP THEM LEVEL','STACK IT HIGH','CITY OF GOLD','WHAT A VIEW'][w%4],1.9);
}
function waveClear(){ G.phase='clear'; G.phaseT=0; const bonus=100*G.wave; addScore(bonus);
  banner(meters(minH())+' M REACHED','+'+fmt(bonus),2); AudioKit.fanfare(); say(pick(['LOOKING GOOD!','HIGHER!','SO SHINY!','GREAT STACKING!']),true); }

/* ---------- the hook: a pendulum under the crane trolley (same physics as Shine Crew's gondola) ---------- */
function updateHook(gdt){
  const lim=TX+TW/2+1.6; Hook.tx=clamp(Hook.tx,-lim,lim);
  const want=clamp((Hook.tx-Hook.ax)*5,-14,14), nv=Hook.vx+clamp(want-Hook.vx,-40*gdt,40*gdt), acc=gdt>0?(nv-Hook.vx)/gdt:0;
  Hook.vx=nv; Hook.ax=clamp(Hook.ax+Hook.vx*gdt,-lim,lim);
  const L=Hook.L, a=-(9.8/L)*Math.sin(Hook.th)-Hook.damp*Hook.om-(acc/L)*Math.cos(Hook.th)*0.35+Hook.wind/L;
  Hook.om+=a*gdt; Hook.th+=Hook.om*gdt; if(Math.abs(Hook.th)>0.5){ Hook.th=Math.sign(Hook.th)*0.5; Hook.om*=-0.3; }
  Hook.x=Hook.ax+L*Math.sin(Hook.th); Hook.y=World.jibY-L*Math.cos(Hook.th);
}
function streaks(dir,n){ for(let i=0;i<n;i++) FX.emit(-dir*(World.halfW+1),World.camY+rand(-World.half,World.half),3.5,{count:1,colors:['#FFFFFF','#FFF1D6'],speed:0.2,up:0,upRand:0,vx:dir*24,size:0.09,life:0.9,grav:0,drag:0}); }
function updateWind(gdt){
  const sp=G.spec, live=G.state==='play'&&sp&&sp.gust&&['wave','bossLevel','boss'].includes(G.phase);
  if(live&&G.gust<=0&&G.gustWarn<=0){ G.gustT-=gdt; if(G.gustT<=0){ G.gustWarn=0.9; G.gustDir=Math.random()<0.5?-1:1;
    popup('WIND!',Hook.x,Hook.y+1.5,'aqua',null,0.9,1); if(Math.random()<0.5) say('HOLD ON, WINDY!'); } }
  if(G.gustWarn>0){ G.gustWarn-=gdt; if(gdt>0) streaks(G.gustDir,1); if(G.gustWarn<=0){ G.gust=1.4; G.gustT=(sp?sp.gustEvery:9)*(G.phase==='boss'?0.6:1)+rand(-1,1.5); AudioKit.swish(); } }
  if(G.gust>0){ G.gust-=gdt; Hook.wind=G.gustDir*(sp?sp.gustF:2)*Math.sin(Math.PI*clamp(1-G.gust/1.4,0,1))*6*(G.phase==='boss'?1.3:1); if(gdt>0) streaks(G.gustDir,2); } else Hook.wind=0;
}

/* ---------- what the hook carries ---------- */
function targetIdx(){ const [a,b]=Towers; return a.h!==b.h?(a.h<b.h?0:1):(G.alt||0); }
function bridgeSpan(){ const A=Towers[0], B=Towers[1], l=A.cx-A.w/2, r=B.cx+B.w/2; return {w:r-l, c:(l+r)/2}; }
function beatLen(){ const sp=G.spec||frameSpec(1); return (G.state==='play'?sp.beat:1.5)*(G.slow>0?1.6:1)*(G.phase==='boss'?1.6:1); }
function canWork(){ return G.state==='play'?['wave','bossLevel','boss'].includes(G.phase):(G.state==='title'||G.state==='over'); }
function pickPower(){ const uneven=Towers[0].h!==Towers[1].h||Math.min(Towers[0].w,Towers[1].w)<1.8;
  const w={net:G.lives<=1?4:G.lives<3?1.4:0.4,laser:1.4,slow:1.2,gold:uneven?2.2:0.8,star:1.4}; let tot=0; for(const k in w) tot+=w[k];
  let r=Math.random()*tot; for(const k in w){ r-=w[k]; if(r<=0) return k; } return 'star'; }
function rehang(){
  let kind='block', power=null;
  if(G.state==='play'&&G.phase==='boss') kind='bridge';
  else if(G.state==='play'&&G.wave>1&&(Math.random()<0.1||G.powerPity>8)){ kind='power'; power=pickPower(); G.powerPity=0; } else G.powerPity=(G.powerPity||0)+1;
  const ti=targetIdx(), w=kind==='bridge'?bridgeSpan().w:Towers[ti].w, mesh=kind==='bridge'?bridgeMesh(w):goldBlockMesh(w);
  if(kind==='power'){ const pb=powerBlock(POW[power].icon,POW[power].bg,mesh); pb.scale.set(0.95/w,0.95,0.95/TD); pb.position.set(0,0,0.62); mesh.userData.pb=pb; }
  actorRoot.add(mesh); G.hang={kind,w,power,mesh,ti}; G.beatT=beatLen(); G.hangK=0;
}
function release(){ const h=G.hang; if(!h) return; G.hang=null;
  const vx=Hook.vx*0.35+Hook.om*Hook.L*Math.cos(Hook.th)*0.35, hb=h.kind==='bridge'?1.2:BH;
  Falling.push({mesh:h.mesh,kind:h.kind,power:h.power,w:h.w,ti:h.ti,hb,x:Hook.x,y:Hook.y-0.55-hb/2,vx,vy:0}); AudioKit.click(); }

/* ---------- landing, trimming, missing ---------- */
function debris(x,y,w,h,vx,col){ const m=goldBlockMesh(w); m.scale.y=h; m.position.set(x,y,0); actorRoot.add(m); Debris.push({mesh:m,x,y,vx,vy:2,rot:0,vr:rand(-4,4)}); }
function land(f,ti){
  const t=Towers[ti], tol=0.25+0.2*(G.assist||0), perfect=Math.abs(f.x-t.cx)<tol, topY=t.h*BH;
  let l=t.cx-t.w/2, r=t.cx+t.w/2;
  if(!perfect){ const bl=f.x-f.w/2, br=f.x+f.w/2, nl=Math.max(bl,l), nr=Math.min(br,r);
    if(bl<nl-0.02) debris((bl+nl)/2,topY+BH/2,nl-bl,BH,-2,null); if(br>nr+0.02) debris((nr+br)/2,topY+BH/2,br-nr,BH,2,null); l=nl; r=nr; }
  let nw=Math.max(1.0,r-l), ncx=(l+r)/2; if(perfect){ ncx=t.cx; nw=Math.min(TW,t.w+0.3); }   // never thinner than a third: fun beats punishing for 3–10 year olds
  const uneven=G.state==='play'&&ti!==targetIdx()&&Towers[0].h!==Towers[1].h;
  t.h++; t.w=nw; t.cx=ncx;
  const mesh=goldBlockMesh(nw); mesh.position.set(ncx,(t.h-0.5)*BH,0); actorRoot.add(mesh); t.meshes.push(mesh); actorRoot.remove(f.mesh);
  const y=t.h*BH; FX.emit(ncx,y,1.3,{count:perfect?16:8,colors:perfect?['#FFE08A','#FFFFFF','#F4B731']:['#E8AE34','#C98C22','#D9C79C'],speed:perfect?4:2.5,up:2,size:0.15,life:0.6,grav:9});
  if(G.state==='play'){ G.placed++; const pts=scoreHit(10,perfect); popup(perfect?'PERFECT!':'+'+pts,ncx,y+1.1,perfect?'gold':'hud',null,0.8,1);
    if(perfect){ AudioKit.perfect(); if(Math.random()<0.3) say(pick(['PERFECT!','SPOT ON!','NAILED IT!'])); } else AudioKit.clank();
    if(uneven){ popup('UNEVEN!',ncx,y+2,'red',null,0.9,1); breakCombo(); if(!G.saidLevel){ G.saidLevel=true; say('FOLLOW THE ARROW! KEEP THEM LEVEL!',true); } }
    if(Towers[0].h===Towers[1].h){ addScore(20*mult()); popup('LEVEL!',0,y+1.6,'aqua',null,0.9,1); } }
  else AudioKit.clank();
  if(Towers[0].h===Towers[1].h) G.alt=1-ti;
  if(f.kind==='power') activatePower(f.power,ncx,y);
  G.nextHang=0.35;
}
function miss(f){ actorRoot.remove(f.mesh); FX.emit(f.x,0.3,1,{count:18,colors:['#D9C79C','#C9B48A','#7FD35F'],speed:4,up:3,size:0.2,life:0.8,grav:10});
  if(G.state==='play'&&['wave','bossLevel','boss'].includes(G.phase)){ AudioKit.bloop(); breakCombo(); loseLife(); popup('MISSED!',f.x,World.camY-World.half*0.3,'red',null,0.9,1); }
  G.nextHang=0.5; }
function landBridge(f){
  const A=Towers[0], B=Towers[1], bl=f.x-f.w/2, br=f.x+f.w/2;
  const ovA=Math.min(br,A.cx+A.w/2)-Math.max(bl,A.cx-A.w/2), ovB=Math.min(br,B.cx+B.w/2)-Math.max(bl,B.cx-B.w/2);
  if(ovA>=Math.min(0.8,A.w*0.4)&&ovB>=Math.min(0.8,B.w*0.4)){
    f.mesh.position.set(f.x,A.h*BH+0.6,0); f.mesh.rotation.set(0,0,0); bridgeMeshNow=f.mesh;
    bossWin(Math.abs(f.x-bridgeSpan().c)<0.35+0.15*(G.assist||0)); return; }
  Debris.push({mesh:f.mesh,x:f.x,y:f.y,vx:ovA<ovB?-2:2,vy:0,rot:0,vr:ovA<ovB?2:-2});   // slips off one side
  if(G.state==='play'){ AudioKit.hurt(); breakCombo(); loseLife(); if(G.lives>0) say('ALMOST! ONE MORE TRY!',true); }
  G.nextHang=1.0; }
function bossWin(perfect){
  G.phase='bossDown'; G.phaseT=0; AudioKit.fanfare(); AudioKit.cheer(true); AudioKit.sparkle(); Tint.target=1; AudioKit.intensity=0;
  const tier=G.spec?G.spec.cyc:0, bonus=1000*(tier+1)+(perfect?500:0); addScore(bonus);
  banner(perfect?'GLASS FLOOR!':'FRAME COMPLETE!','+'+fmt(bonus),2.6);
  say(perfect?'PERFECT! THE FLOOR TURNED CLEAR!':'THE FRAME IS DONE!',true);
  if(perfect&&bridgeMeshNow) bridgeMeshNow.userData.floor.material=new THREE.MeshBasicMaterial({color:0xE6F7FF,transparent:true,opacity:0.35});
  const y=Towers[0].h*BH+1; for(let i=0;i<50;i++) FX.emit(rand(-TX-2,TX+2),y+rand(-1,2),1.2,{count:1,colors:['#FFE08A','#FFFFFF','#F4B731','#8FD3F0'],speed:4,up:4,size:0.18,life:1.4,grav:5,drag:0.8});
  Life.frames++; Store.set(GAMEDEF.key('frames'),Life.frames);
}
function clearTowers(){ for(const t of Towers){ t.meshes.forEach(m=>actorRoot.remove(m)); t.meshes=[]; t.h=0; t.w=TW; } Towers[0].cx=-TX; Towers[1].cx=TX;
  if(bridgeMeshNow){ actorRoot.remove(bridgeMeshNow); bridgeMeshNow=null; } }
function clearAll(){ clearTowers(); for(const f of Falling) actorRoot.remove(f.mesh); Falling.length=0; for(const d of Debris) actorRoot.remove(d.mesh); Debris.length=0;
  if(G.hang){ actorRoot.remove(G.hang.mesh); G.hang=null; } G.boss=null; G.laser=0; G.slow=0; G.gust=0; G.gustWarn=0; Hook.wind=0; G.nextHang=0.4; Laser.visible=false; }
function updateFalling(gdt){
  for(let i=Falling.length-1;i>=0;i--){ const f=Falling[i]; f.vy-=26*gdt; f.x+=f.vx*gdt; f.y+=f.vy*gdt; f.vx*=Math.exp(-gdt*0.5); f.mesh.position.set(f.x,f.y,0);
    const bottom=f.y-f.hb/2; let done=false;
    if(f.kind==='bridge'){ if(bottom<=Towers[0].h*BH&&f.vy<0){ Falling.splice(i,1); landBridge(f); done=true; } }
    else for(let ti=0;ti<2&&!done;ti++){ const t=Towers[ti], top=t.h*BH;
      if(bottom<=top&&bottom>top-0.9){ const ov=Math.min(f.x+f.w/2,t.cx+t.w/2)-Math.max(f.x-f.w/2,t.cx-t.w/2); if(ov>0.05){ Falling.splice(i,1); land(f,ti); done=true; } } }
    if(!done&&f.y<-1.5){ Falling.splice(i,1); miss(f); } }
}
function updateDebris(gdt){ for(let i=Debris.length-1;i>=0;i--){ const d=Debris[i]; d.vy-=26*gdt; d.x+=d.vx*gdt; d.y+=d.vy*gdt; d.rot+=d.vr*gdt;
  d.mesh.position.set(d.x,d.y,0); d.mesh.rotation.z=d.rot;
  if(d.y<-1){ FX.emit(d.x,0.2,1,{count:8,colors:['#D9C79C','#7FD35F'],speed:2.5,up:2.5,size:0.15,life:0.6,grav:10}); actorRoot.remove(d.mesh); Debris.splice(i,1); } } }

/* ---------- power blocks ---------- */
function activatePower(p,x,y){ const P=POW[p]; AudioKit.pickup(); if(G.state!=='play') return; say(P.say,true); popup(P.label,x,y+2.2,'lime',null,1.2,1);
  if(p==='net'){ if(!gainLife()) addScore(200*mult()); }
  if(p==='laser') G.laser=8;
  if(p==='slow') G.slow=8;
  if(p==='star') G.x2=10;
  if(p==='gold'){ const lo=Towers[0].h<Towers[1].h?Towers[0]:Towers[1], hi=lo===Towers[0]?Towers[1]:Towers[0];
    while(lo.h<hi.h){ lo.h++; const m=goldBlockMesh(TW); m.position.set(lo===Towers[0]?-TX:TX,(lo.h-0.5)*BH,0); actorRoot.add(m); lo.meshes.push(m); }
    for(const t of Towers){ t.w=TW; t.cx=t===Towers[0]?-TX:TX; }
    FX.emit(0,maxH()*BH,1.2,{count:40,colors:['#FFE08A','#FFFFFF','#F4B731'],speed:6,up:3,size:0.18,life:1,grav:6}); popup('AUTO LEVEL!',0,maxH()*BH+2.6,'gold',null,1.2,1); } }

/* ---------- camera climbs with the frame; the crane climbs with it ---------- */
function updateCamera(k){
  const top=maxH()*BH+(bridgeMeshNow?1.2:0), hookRest=top+4.6;
  const want=Math.max(World.half*0.45,hookRest-World.half*0.15);
  World.camY+=(want-World.camY)*k;
  World.jibY=World.camY+World.half-World.hudUnits-0.9; Hook.L=clamp(World.jibY-hookRest,4.5,30);
  CamBase.set(0,World.camY,World.dist);
}

/* ---------- bot + input ---------- */
function botTick(dt){ G.botT=(G.botT||0)-dt; if(G.botT>0) return; G.botT=0.1;
  if(G.hang) Hook.tx=G.hang.kind==='bridge'?bridgeSpan().c:Towers[targetIdx()].cx; }
function screenToWorldX(sx){ _sv.set(Hook.x,Hook.y,0).project(camera); _ndc.set((sx/W)*2-1,_sv.y); _ray.setFromCamera(_ndc,camera); return _ray.ray.intersectPlane(_plane,_hit)?_hit.x:Hook.tx; }

/* ---------- the world, as the kit sees it ---------- */
GAMEDEF={
  meta:{id:'frame-builder',world:4,logo:['FRAME','BUILDER'],place:'DUBAI FRAME',overTitle:"CRANE'S PARKED",lifeIcon:'fblock',
    hint:'DRAG TO MOVE',hintMotion:'drag',voice:'click',startSfx:'horn',clear:0xBFE3F5,accent:'gold',accentHex:PAL.gold,scrim:0.5},
  lines:{start:"LET'S BUILD!",over:"CRANE'S PARKED!",last:'LAST BLOCK!',hurt:['OOPS, MISSED!','WATCH THE SWING!','TRY AGAIN!']},
  music:{tempo:112,lead:'triangle',leadVol:0.07,scale:[261.63,293.66,329.63,349.23,392.0,440.0,493.88,523.25],
    mel:[0,2,4,2,5,4,2,-1,4,5,7,5,4,2,1,-1,0,2,4,5,7,7,5,4,2,4,5,4,2,1,0,-1],bass:[65.41,65.41,87.31,87.31,98.0,98.0,65.41,98.0],dum:[0,4],tek:[2,6],ka:[1,3,5,7]},
  build(){},
  layout(){ layout(); updateCamera(1); },
  load(){ Store.get(this.key('frames')).then(v=>{ Life.frames=parseInt(v)||0; }); },
  reset(){ clearAll(); G.placed=0; G.alt=0; G.powerPity=0; G.saidLevel=false; Hook.ax=Hook.tx=Hook.x=0; Hook.vx=Hook.th=Hook.om=0; Tint.target=1; },
  start(w){ beginWave(w); },
  toTitle(){ G.nextHang=0.4; },
  onOver(){ clearAll(); G.nextHang=0.8; },
  onSay(){ G.talk=0.9; },
  commentator(){ return {x:Crane.mastX-0.4,y:World.jibY-2.2,z:1}; },
  waveLabel(){ return meters(minH())+' M'; },
  waveProgress(){ const sp=G.spec; if(G.phase!=='wave'||!sp) return 1; const s=G.waveStartH||0; return clamp((minH()-s)/Math.max(1,sp.goal-s),0,1); },
  bossHUD(){ return G.boss&&['bossIntro','bossLevel','boss'].includes(G.phase)?{name:G.boss.name,hp:G.boss.hp,max:G.boss.max,icon:G.boss.icon}:null; },
  powersHUD(){ const p=[]; if(G.laser>0) p.push(['laser',G.laser/8]); if(G.slow>0) p.push(['slowc',G.slow/8]); return p; },
  overStats(){ return meters(minH())+' M   TOP COMBO '+G.maxCombo; },
  overExtra(){ return 'BLOCKS PLACED '+fmt(G.placed||0); },
  titleExtra(){ return 'FRAMES BUILT '+fmt(Life.frames); },
  pointerDown(x,y,id){ dragId=id; Hook.tx=screenToWorldX(x); },
  pointerMove(x,y,id){ if(id===dragId) Hook.tx=screenToWorldX(x); },
  pointerUp(x,y,id){ if(id===dragId) dragId=null; },
  update(gdt,dt){
    const play=G.state==='play', sp=G.spec;
    if(play){ G.laser=Math.max(0,G.laser-gdt); G.slow=Math.max(0,G.slow-gdt); }
    Hook.damp=(sp&&play?sp.damp:2.3)+(G.slow>0?1.2:0)+1.2*(play?(G.assist||0):1);   // early waves: calmer swing
    updateCamera(1-Math.exp(-gdt*2.2)); updateWind(gdt); updateHook(gdt);
    if(G.state==='title'||G.state==='over'||(BOT&&play)) botTick(dt);
    if(!G.hang&&!Falling.length&&canWork()){ G.nextHang-=gdt; if(G.nextHang<=0) rehang(); }
    if(G.hang){ G.hangK=Math.min(1,G.hangK+gdt*4);
      if(canWork()){ const prev=G.beatT; G.beatT-=gdt; if(prev>0.5&&G.beatT<=0.5) AudioKit.click(); if(G.beatT<=0) release(); } }
    updateFalling(gdt); updateDebris(gdt);
    if(!play&&maxH()>=9&&!Falling.length&&!G.hang){ clearTowers(); }   // attract mode: start over before it gets too tall
    if(play){
      if(G.phase==='wave'&&!Falling.length&&minH()>=sp.goal) waveClear();
      else if(G.phase==='clear'){ G.phaseT+=gdt; if(G.phaseT>2.1) beginWave(G.wave+1); }
      else if(G.phase==='bossIntro'){ G.phaseT+=gdt; if(G.phaseT>2.2){ G.phase=Towers[0].h===Towers[1].h?'boss':'bossLevel';
          if(G.phase==='bossLevel') say('LEVEL THE TOWERS FIRST!',true);
          if(G.phase==='boss'&&G.hang&&G.hang.kind!=='bridge'){ actorRoot.remove(G.hang.mesh); G.hang=null; G.nextHang=0.3; } } }
      else if(G.phase==='bossLevel'&&!Falling.length&&Towers[0].h===Towers[1].h){ G.phase='boss'; if(G.hang&&G.hang.kind!=='bridge'){ actorRoot.remove(G.hang.mesh); G.hang=null; G.nextHang=0.3; } }
      else if(G.phase==='bossDown'){ G.phaseT+=gdt; if(G.phaseT>3.6){ clearTowers(); G.boss=null; beginWave(G.wave+1); } } }
  },
  animate(gdt,dt){ const t=(World.t+=gdt);
    Crane.jib.position.y=World.jibY; growMast(World.jibY);
    Trolley.position.set(Hook.ax,World.jibY-0.2,0);
    HookMesh.position.set(Hook.x,Hook.y-0.4,0); HookMesh.rotation.z=Hook.th;
    [-0.18,0.18].forEach((o,i)=>{ const c=Cables[i], x0=Hook.ax+o, y0=World.jibY-0.3, x1=Hook.x+o, y1=Hook.y, dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy);
      c.position.set((x0+x1)/2,(y0+y1)/2,0); c.scale.set(1,len,1); c.rotation.z=Math.atan2(-dx,dy); });
    const h=G.hang;
    if(h){ const hb=h.kind==='bridge'?1.2:BH, s=easeOutBack(G.hangK); h.mesh.position.set(Hook.x,Hook.y-0.55-hb/2,0); h.mesh.rotation.z=Hook.th*0.6; h.mesh.scale.y=(h.kind==='bridge'?1:BH)*Math.max(0.01,s);
      if(h.mesh.userData.pb) h.mesh.userData.pb.rotation.y=t*2;
      const bl=beatLen(), k=clamp(1-G.beatT/bl,0,1); BeatBar.visible=canWork(); BeatBar.position.set(Hook.x-h.w*(1-k)/2,Hook.y-0.55-hb+0.14,TD/2+0.08); BeatBar.scale.set(Math.max(0.01,h.w*k),1,1); BeatBar.rotation.z=h.mesh.rotation.z;   // a 'fuse' filling along the block's front edge
      BeatBar.material.color.setHex(G.beatT<0.5?0xFF5A3C:0x7ED957);
      const tg=Towers[targetIdx()]; Arrow.visible=h.kind!=='bridge'; Arrow.position.set(h.kind==='bridge'?0:tg.cx,tg.h*BH+1.9+Math.abs(Math.sin(t*5))*0.5,1.3);
      Laser.visible=G.laser>0; if(Laser.visible){ const top=(h.kind==='bridge'?Towers[0]:tg).h*BH, y0=Hook.y-0.55-hb; Laser.position.set(Hook.x,(y0+top)/2,1.25); Laser.scale.y=Math.max(0.1,y0-top); } }
    else { BeatBar.visible=false; Arrow.visible=false; Laser.visible=false; }
    Backdrop.position.y=World.camY*0.82+World.half*0.1;
    G.talk=Math.max(0,(G.talk||0)-dt); Cab.rotation.z=G.talk>0?Math.sin(t*20)*0.02:0;
    FX.update(gdt);
  },
  debug:{beginWave,activatePower,Towers,Hook,World,Life,rehang,release}
};
Kit.run(GAMEDEF);
