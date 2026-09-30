
let GAMEDEF=null;
/* ---------- state ---------- */
const Crad=makeSwing({y:5,damp:2.3,maxV:15,maxA:45,couple:0.4,thMax:0.42,target:null,hissT:0});   // shared pendulum (blockkit)
const Gust=makeGusts();
const Crew={on:false,ax:0,x:0,y:30,tx:0,target:null,hissT:0};
const Blocks=[], Groups=[], Powers=[], Pops=[];
const Life={windows:0};
const _tip=new THREE.Vector3(), _to=new THREE.Vector3(), _dir=new THREE.Vector3(), _nd=new THREE.Vector3(), _up=new THREE.Vector3(0,1,0);
let dragId=null, chimeT=-1;

/* ---------- waves: each wave is 8 floors further down ---------- */
function floorOf(w){ return 160-(((w-1)*8)%160); }
function shineSpec(w){
  const tier=Math.floor((w-1)/5), k=(w-1)%5, pool={single:3,pair:2,column:1.6};
  if(w>=2){ pool.diag=1.4; pool.thick=0.7+0.35*tier+(k>=2?0.3:0); }
  if(w>=4){ pool.zig=1; pool.line=1; }   // wide traversals once kids have the swing
  return {boss:w%5===0,tier,speed:Math.min(4.4,2.1+0.12*k+0.35*tier),rows:7+Math.min(w-1,7),gap:Math.max(1.05,2.0-0.07*(w-1)),pool,
    packed:w>=3?Math.min(0.5,0.18+0.1*tier):0,mud:tier>=2?0.25:0,gust:w>=2,gustF:2.2+1.3*tier,gustEvery:Math.max(4.5,9-tier),damp:Math.max(1.1,2.4-0.3*tier)};
}
function beginWave(w){
  G.wave=w; const sp=G.spec=shineSpec(w); G.assist=clamp(1-(w-1)*0.2,0,1); Crad.damp=sp.damp+1.0*G.assist;   // early floors: calmer swing
  if(sp.boss){ startBoss(sp); return; }
  G.phase='wave'; G.rowsLeft=sp.rows; G.rowT=0.9; Gust.t=rand(5,8);
  if(G.freshRun){ G.freshRun=false; spawnPattern('single',World.cy-7); spawnPattern('pair',World.cy-12); }   // action within seconds, not after a long climb
  banner('FLOOR '+floorOf(w),['WIPE IT CLEAN','WINDY UP HERE','KEEP IT SHINY','WHAT A VIEW'][w%4],1.9);
}
function waveClear(){
  G.phase='clear'; G.phaseT=0; const bonus=100*G.wave; addScore(bonus); saveWindows();
  banner('FLOOR '+floorOf(G.wave)+' SHINY','+'+fmt(bonus),2); AudioKit.fanfare();
  say(pick(['SPARKLING!','NEXT FLOOR DOWN!','SO SHINY!','LOOK AT THAT VIEW!']),true);
  for(let i=0;i<24;i++) FX.emit(rand(-FH,FH),rand(World.cy-9,World.cy),1,{count:1,colors:['#FFFFFF','#FFE08A','#C4F6FC'],speed:1.5,up:1.5,size:0.13,life:1.1,grav:1,drag:1});
}

/* ---------- crusts ---------- */
function newGroup(kind){ const g={kind,blocks:[],core:null,done:false,missed:false,thickCd:0}; Groups.push(g); return g; }
function addBlock(g,kind,x,y,delay){
  const m=new THREE.Mesh(pick(CrustGeo[kind]),VOXMAT), hp={dust:1,packed:2,mud:3,armor:99,core:2.4,storm:1.35}[kind];
  m.rotation.z=rand(-0.25,0.25); m.position.set(x,y,0.42); actorRoot.add(m);
  const b={g,kind,x,y,hp,max:hp,mesh:m,dead:false,lost:false,hit:0,appear:delay!=null?-delay:1};
  if(delay!=null) m.scale.setScalar(0.001);
  g.blocks.push(b); if(kind==='core') g.core=b; Blocks.push(b); return b;
}
function kindRoll(sp){ const r=Math.random(); return r<sp.mud?'mud':r<sp.mud+sp.packed?'packed':'dust'; }
function spawnPattern(name,yAt){
  const sp=G.spec||shineSpec(1), y0=paneY(yAt!=null?yAt:World.spawnY), ri=()=>Math.floor(Math.random()*NC);
  const one=(c,dr)=>{ const g=newGroup('plain'); addBlock(g,G.state==='play'?kindRoll(sp):'dust',colX(c),y0-dr*RH); };
  if(name==='single') one(ri(),0);
  else if(name==='pair'){ const c=Math.floor(Math.random()*(NC-1)); one(c,0); one(c+1,0); }
  else if(name==='column'){ const c=ri(); one(c,0); one(c,1); one(c,2); }
  else if(name==='diag'){ const s=Math.random()<0.5, c0=Math.floor(Math.random()*(NC-2)); for(let i=0;i<3;i++) one(s?c0+i:c0+2-i,i); }
  else if(name==='zig'){ const s=Math.random()<0.5; one(s?0:NC-1,0); one(s?NC-1:0,2); }
  else if(name==='line'){ const c=Math.random()<0.5?0:1; one(c,0); one(c+2,0); one(c+4,0); }
  else if(name==='thick'){ const c=1+Math.floor(Math.random()*(NC-2)), g=newGroup('thick');
    for(const dc of [-1,0,1]) for(const dr of [0,1]) addBlock(g,dc===0&&dr===0?'core':'armor',colX(c+dc),y0-dr*RH); }
}
function spawnRow(){ const sp=G.spec; G.rowsLeft--; spawnPattern(pickWeighted(sp.pool));
  G.powerPity++; if(G.wave>1&&(Math.random()<0.09||G.powerPity>9)){ G.powerPity=0; spawnPower(pickPower()); } }

/* ---------- spraying (auto-fire at the nearest crust) ---------- */
function hitBlock(b,dmg,splash){
  if(b.kind==='armor'&&b.g.core&&!b.g.core.dead){ b.hit=0.08; if(splash) return; const g=b.g;
    if(g.thickCd<=0){ g.thickCd=1.1; popup('TOO THICK!',b.x,b.y+1,'hud',null,0.8,0.8); AudioKit.clank();
      FX.emit(b.x,b.y,0.9,{count:5,colors:CRUST.armor,speed:3,up:2,size:0.14,life:0.4,grav:12});
      if(G.state==='play'&&!G.saidCore){ G.saidCore=true; say('AIM FOR THE GLOWING CORE!',true); } }
    return; }
  b.hp-=dmg; b.hit=0.1; if(b.hp<=0) cleanBlock(b);
}
function chime(){ if(G.t-chimeT<0.06) return; chimeT=G.t; AudioKit.bounce(Math.min(G.combo,24)%12); }
function cleanBlock(b){
  if(b.dead) return; b.dead=true; actorRoot.remove(b.mesh);
  const core=b.kind==='core', col=core?['#FFE08A','#FFB23E','#FF8A1F']:CRUST[b.kind]||CRUST.dust;
  FX.emit(b.x,b.y,0.7,{count:core?26:10,colors:col.concat(['#FFFFFF']),speed:core?6:3.4,up:2.5,size:0.17,life:0.7,grav:10});
  FX.emit(b.x,b.y,0.9,{count:4,colors:['#FFFFFF','#E6F7FF'],speed:1.2,up:1,size:0.12,life:0.55,grav:0,drag:2});
  glint(b.x,b.y);
  if(G.state==='play'){ G.windows++; const pts=scoreHit({dust:10,packed:15,mud:20,storm:10,core:50}[b.kind]||10,core);
    if(core) popup('+'+fmt(pts),b.x,b.y+0.9,'gold',null,1,0.8); chime(); }
  if(core){ AudioKit.crack(); AudioKit.sparkle(); G.shake=REDUCED?0:Math.max(G.shake,0.15); const g=b.g; let d=0.05;
    if(g.kind==='thick'){ for(const o of g.blocks) if(!o.dead){ Pops.push({b:o,t:d}); d+=0.05; }
      if(G.state==='play'&&Math.random()<0.6) say(pick(['CRUSHED IT!','CORE CLEAN!','SO SPARKLY!'])); }
    else if(g.kind==='wall') for(const o of g.blocks) if(!o.dead&&Math.abs(o.x-b.x)<CW*1.1&&Math.abs(o.y-b.y)<RH*1.1){ Pops.push({b:o,t:d}); d+=0.04; } }
}
function spray(c,M,gdt,eff){
  M.grp.updateMatrixWorld(true); const tip=M.lance.localToWorld(_tip.set(0,-3.0,0));
  const R=(G.wide>0?5.0:3.6)*(1+0.15*(G.assist||0)); let best=null, bd=R*R, urgent=null, ud=(R*1.5)*(R*1.5);
  for(const b of Blocks){ if(b.dead||b.lost||b.appear<1||b.y>World.half+1) continue; const dx=b.x-tip.x, dy=b.y-tip.y, d=dx*dx+dy*dy; if(d<bd){ bd=d; best=b; }
    if(b.y>World.escY-1.2&&b.kind!=='armor'&&d<ud){ ud=d; urgent=b; } }   // last-chance catch: about to escape and a bit out of range still gets sprayed
  if(urgent) best=urgent;
  c.target=best;
  if(!best){ M.jet.visible=M.core.visible=false; return; }
  _to.set(best.x,best.y,0.55); _dir.subVectors(_to,tip); const len=_dir.length(); _nd.copy(_dir).normalize();
  for(const j of [M.jet,M.core]){ j.visible=true; j.position.copy(tip).addScaledVector(_dir,0.5); j.scale.set(1+0.15*Math.sin(G.t*40),len,1+0.15*Math.sin(G.t*37)); j.quaternion.setFromUnitVectors(_up,_nd); }
  const dps=3.3*eff*(1+0.3*(G.assist||0));
  hitBlock(best,dps*gdt,false);
  if(G.wide>0) for(const b of Blocks){ if(b===best||b.dead||b.lost||b.appear<1) continue; if(Math.abs(b.x-best.x)<CW*1.05&&Math.abs(b.y-best.y)<RH*1.05) hitBlock(b,dps*0.55*gdt,true); }
  if(gdt>0&&Math.random()<gdt*40) FX.emit(best.x+rand(-0.4,0.4),best.y+rand(-0.3,0.3),0.8,{count:1,colors:['#FFFFFF','#C4F6FC','#8FE3F2'],speed:2.2,up:1.5,size:0.1,life:0.35,grav:9});
  if(gdt>0){ c.hissT-=gdt; if(c.hissT<=0){ c.hissT=0.11; AudioKit.noise(0.09,{vol:0.02,type:'highpass',f:2600}); } }
}

/* ---------- the gondola: a pendulum under a roof trolley ---------- */
function updateCradle(gdt){
  Crad.lim=FH-1.3; Crad.anchorY=World.anchorY; Crad.L=Math.max(6,World.anchorY-World.cy);
  stepSwing(Crad,gdt); Crad.x=clamp(Crad.x,-FH+1.1,FH-1.1);
}
function updateCrew(gdt){
  if(G.crew>0){ G.crew=Math.max(0,G.crew-gdt); let best=null, bs=-1e9;
    for(const b of Blocks){ if(b.dead||b.lost||b.appear<1||b.y>World.escY) continue; const x=b.kind==='armor'&&b.g.core&&!b.g.core.dead?b.g.core.x:b.x;
      const s=b.y+0.3*Math.abs(x-Crad.x); if(s>bs){ bs=s; best=x; } }
    if(best!=null) Crew.tx=best; if(Math.abs(Crew.tx-Crad.x)<4.2) Crew.tx=Crad.x+(Crew.tx>=Crad.x?4.2:-4.2);
    Crew.tx=clamp(Crew.tx,-FH+1.3,FH-1.3); Crew.ax+=clamp((Crew.tx-Crew.ax)*4*gdt,-11*gdt,11*gdt); Crew.x=Crew.ax;
    Crew.y+=(World.cy-1.4-Crew.y)*(1-Math.exp(-gdt*3)); }
  else if(Crew.on){ Crew.y+=gdt*9; if(Crew.y>World.half+7) Crew.on=false; }
}

/* ---------- wind gusts: telegraphed, then they swing the gondola ---------- */
function updateWind(gdt){
  const sp=G.spec, live=G.state==='play'&&sp&&sp.gust&&(G.phase==='wave'||G.phase==='boss');
  Crad.wind=stepGusts(Gust,gdt,live,{every:(sp?sp.gustEvery:9)*(G.phase==='boss'?0.6:1),strength:sp?sp.gustF:2,scale:6,
    onWarn(){ popup('WIND!',Crad.x,Crad.y+2.6,'aqua',null,0.9,CZ); if(Math.random()<0.5) say('HOLD ON!'); },
    streak(dir,n){ windStreaks(FX,dir,n,World.halfW,0,World.half); }});
}

/* ---------- boss: the sandstorm coats a whole section of the facade ---------- */
function startBoss(sp){
  G.phase='bossIntro'; G.phaseT=0; const tier=sp.tier, rowsN=4+Math.min(tier,2), top=paneY(World.cy-6.2), g=newGroup('wall'), cells=[];
  for(let r=0;r<rowsN;r++) for(let c=0;c<NC;c++) cells.push([c,r]);
  const cores=new Set(), want=Math.min(3+tier,6); while(cores.size<want){ const i=Math.floor(Math.random()*cells.length); if(cells[i][1]<rowsN-1) cores.add(i); }
  cells.forEach(([c,r],i)=>addBlock(g,cores.has(i)?'core':'storm',colX(c),top-r*RH,0.3+c*0.09+r*0.06));
  G.boss={name:'SANDSTORM',icon:'sand',g,tier,max:g.blocks.length,hp:g.blocks.length,speed:(0.5+0.08*tier)*World.vsScale,lob:0,t:0,pT:5};
  banner('SANDSTORM!','CLEAR THE WALL',2.2); AudioKit.horn(); say('SANDSTORM! GET READY!',true); Tint.target=0.86; AudioKit.intensity=1; Gust.t=2;
}
function stormDust(n){ for(let i=0;i<n;i++) FX.emit(-World.halfW-1,rand(-World.half,World.half),2.5,{count:1,colors:CRUST.storm,speed:0.3,up:0,upRand:0,vx:rand(14,22),size:0.12,life:1.3,grav:0,drag:0}); }
function stormHit(){ const B=G.boss; B.lob=1.2; breakCombo(); loseLife(); AudioKit.burst(); G.shake=REDUCED?0:0.4;
  FX.emit(Crad.x,Crad.y+0.5,CZ,{count:30,colors:CRUST.storm,speed:6,up:3,size:0.2,life:0.9,grav:8}); if(G.lives>0) say('HOLD TIGHT!',true); }
function bossWin(){ const B=G.boss; G.phase='bossDown'; G.phaseT=0; AudioKit.fanfare(); AudioKit.cheer(true); AudioKit.sparkle();
  for(let i=0;i<60;i++) FX.emit(rand(-FH,FH),rand(World.cy-9,World.cy),1,{count:1,colors:['#FFFFFF','#FFE08A','#C4F6FC'],speed:2,up:2,size:0.15,life:1.3,grav:1.5,drag:1});
  for(let i=0;i<NC;i++) glint(colX(i),paneY(World.cy-2-(i%3)*RH));
  const bonus=1000*(B.tier+1); addScore(bonus); banner('SPOTLESS!','+'+fmt(bonus),2.4); say('THE STORM IS GONE!',true);
  Tint.target=1; AudioKit.intensity=0; CradMesh.talk=2.2; saveWindows(); }

/* ---------- power-ups ride up the facade; touch one with the gondola ---------- */
function pickPower(){ return pickWeighted({hat:G.lives<=1?4:G.lives<3?1.4:0.4,wide:1.6,rain:1.1,crew:1.2,star:1.4}); }
function spawnPower(p){ const c=Math.floor(Math.random()*NC), y=paneY(World.spawnY-RH), m=powerBlock(POW[p].icon,POW[p].bg,actorRoot);
  m.scale.setScalar(1.05); m.position.set(colX(c),y,0.95); Powers.push({p,x:colX(c),y,mesh:m,dead:false}); }
function activatePower(p,x,y){ const P=POW[p]; AudioKit.pickup(); if(G.state!=='play') return; say(P.say,true); popup(P.label,x,y+1.4,'lime',null,1.2,CZ);
  if(p==='hat'){ if(!gainLife()) addScore(200*mult()); }
  if(p==='wide') G.wide=8;
  if(p==='rain'){ G.rain=1.3; AudioKit.noise(1.3,{vol:0.07,type:'bandpass',f:1800,q:0.5}); }
  if(p==='crew'){ G.crew=10; if(!Crew.on){ Crew.on=true; Crew.y=World.half+6; Crew.ax=Crew.x=Crad.x<0?FH-2:-FH+2; } }
  if(p==='star') G.x2=10; }

/* ---------- bookkeeping ---------- */
function saveWindows(){ const n=G.windows-(G.banked||0); if(n<=0) return; G.banked=G.windows; Life.windows+=n; Store.set(GAMEDEF.key('windows'),Life.windows); }
function clearAll(){ for(const b of Blocks) actorRoot.remove(b.mesh); Blocks.length=0; Groups.length=0; Pops.length=0;
  for(const p of Powers) actorRoot.remove(p.mesh); Powers.length=0; G.boss=null; G.crew=0; G.wide=0; G.rain=0; Gust.gust=0; Gust.warn=0; Crad.wind=0; }
function botTick(dt){ G.botT=(G.botT||0)-dt; if(G.botT>0) return; G.botT=0.12; let best=null, bs=-1e9;
  for(const b of Blocks){ if(b.dead||b.lost||b.appear<1||b.y>World.escY-0.2) continue; const x=b.kind==='armor'&&b.g.core&&!b.g.core.dead?b.g.core.x:b.x;
    const s=b.y-Math.abs(x-Crad.x)*0.18; if(s>bs){ bs=s; best=x; } }
  for(const p of Powers){ if(p.dead||p.y>World.cy+0.5||p.y<World.cy-5) continue; const s=p.y+1.5-Math.abs(p.x-Crad.x)*0.1; if(s>bs){ bs=s; best=p.x; } }
  if(best!=null) Crad.tx=best; }
function screenToWorldX(sx){ return screenToPlaneX(sx,Crad.x,Crad.y,CZ,Crad.tx); }

/* ---------- the world, as the kit sees it ---------- */
GAMEDEF={
  powers:POW,   // the engine pre-warms these power-up textures at load
  meta:{id:'shine-crew',world:3,logo:['SHINE','CREW'],place:'BURJ KHALIFA',overTitle:"SHIFT'S OVER",lifeIcon:'pane',
    hint:'DRAG TO MOVE',hintMotion:'drag',voice:'chirp',startSfx:'sparkle',clear:0x9ED3F0,accent:'aqua',accentHex:PAL.aqua,scrim:0.5},
  lines:{start:"LET'S SHINE!",over:"SHIFT'S OVER!",last:'LAST WINDOW!',hurt:['MISSED A SPOT!','STILL DUSTY!','IT GOT AWAY!']},
  music:{tempo:120,lead:'square',leadVol:0.05,scale:[293.66,329.63,369.99,415.3,440.0,493.88,554.37,587.33],
    mel:[0,2,4,7,4,2,4,-1,5,4,2,4,3,-1,2,-1,0,2,4,7,7,5,4,5,6,5,4,2,4,-1,-1,-1],bass:[73.42,73.42,110.0,110.0,98.0,98.0,110.0,82.41],dum:[0,3,6],tek:[2,5],ka:[4,7]},
  build(){},
  layout(){ layout(); },
  load(){ Store.get(this.key('windows')).then(v=>{ Life.windows=parseInt(v)||0; }); },
  reset(){ clearAll(); G.freshRun=true; G.windows=0; G.banked=0; G.powerPity=0; G.saidCore=false; Gust.t=6; Crad.ax=Crad.tx=Crad.x=0; Crad.vx=Crad.th=Crad.om=0; Crew.on=false; Tint.target=1; },
  start(w){ beginWave(w); },
  toTitle(){ G.attractT=0.4; },
  onOver(){ saveWindows(); clearAll(); G.attractT=1.2; },
  onSay(){ CradMesh.talk=0.9; },
  commentator(){ return {x:Crad.x-1.6,y:Crad.y+0.2,z:CZ}; },   // bubble hangs up-left of this, level with the crew
  waveLabel(){ return 'FLOOR '+floorOf(G.wave||1); },
  waveProgress(){ return G.phase==='wave'&&G.spec?(G.spec.rows-G.rowsLeft)/G.spec.rows:1; },
  bossHUD(){ return G.boss&&(G.phase==='boss'||G.phase==='bossIntro')?{name:G.boss.name,hp:G.boss.hp,max:G.boss.max,icon:G.boss.icon}:null; },
  powersHUD(){ const p=[]; if(G.wide>0) p.push(['nozzle',G.wide/8]); if(G.crew>0) p.push(['crew',G.crew/10]); return p; },
  overStats(){ return 'FLOOR '+floorOf(G.wave||1)+'   TOP COMBO '+G.maxCombo; },
  overExtra(){ return 'WINDOWS THIS SHIFT '+fmt(G.windows||0); },
  titleExtra(){ return Life.windows>=24348?'ALL 24,348 WINDOWS!':'WINDOWS '+fmt(Life.windows)+' / 24,348'; },
  pointerDown(x,y,id){ dragId=id; Crad.tx=screenToWorldX(x); },
  pointerMove(x,y,id){ if(id===dragId) Crad.tx=screenToWorldX(x); },
  pointerUp(x,y,id){ if(id===dragId) dragId=null; },
  update(gdt,dt){
    const play=G.state==='play', sp=G.spec;
    // the descent: the facade (and everything stuck to it) rises past the gondola
    let vs=1.25*World.vsScale;
    if(play&&sp){ vs=sp.speed*World.vsScale; if(G.boss&&(G.phase==='boss'||G.phase==='bossIntro')) vs=G.boss.speed; if(G.phase==='clear'||G.phase==='bossDown') vs*=0.7; }
    World.vs=vs; const dy=vs*gdt; World.scroll+=dy; if(Facade) Facade.position.y=((World.scroll%RH)+RH)%RH;
    for(const b of Blocks){ b.y+=dy; if(b.appear<1) b.appear=Math.min(1,b.appear+gdt*3.2); }
    for(const p of Powers) p.y+=dy;
    if(G.boss&&G.boss.lob>0){ const push=(2*RH/1.2)*gdt; G.boss.lob-=gdt; for(const b of G.boss.g.blocks) b.y-=push; }
    const auto=G.state==='title'||G.state==='over'||(BOT&&play); if(auto) botTick(dt);
    if(G.state==='title'||G.state==='over'){ G.attractT-=gdt; if(G.attractT<=0){ G.attractT=rand(1.3,1.9); spawnPattern(pick(['single','pair','column','single'])); } }
    updateCradle(gdt); updateWind(gdt); updateCrew(gdt);
    spray(Crad,CradMesh,gdt,1); if(Crew.on&&G.crew>0&&Crew.y<World.cy+1) spray(Crew,CrewMesh,gdt,0.75); else { CrewMesh.jet.visible=CrewMesh.core.visible=false; }
    if(G.rain>0){ G.rain-=gdt; for(const b of Blocks){ if(b.dead||b.lost||b.appear<1||Math.abs(b.y)>World.half) continue; hitBlock(b,2.6*gdt,true); }
      if(gdt>0) for(let i=0;i<4;i++) FX.emit(rand(-FH,FH),World.half+1,2,{count:1,colors:['#C4F6FC','#8FE3F2','#FFFFFF'],speed:0.3,up:-14,upRand:0,size:0.1,life:1.4,grav:10,drag:0}); }
    for(let i=Pops.length-1;i>=0;i--){ const p=Pops[i]; p.t-=gdt; if(p.t<=0){ Pops.splice(i,1); cleanBlock(p.b); } }
    // escaped crusts cost a life (one per group; thick clusters count once)
    for(const g of Groups){ g.thickCd-=gdt; if(g.done||g.missed||g.kind==='wall') continue; let lo=Infinity, alive=0;
      for(const b of g.blocks) if(!b.dead){ alive++; if(b.y<lo) lo=b.y; }
      if(!alive){ g.done=true; continue; }
      if(lo>World.escY){ g.missed=true; for(const b of g.blocks) if(!b.dead) b.lost=true;
        if(play&&(G.phase==='wave'||G.phase==='boss'||G.phase==='clear')){ breakCombo(); loseLife(); popup('MISSED!',g.blocks[0].x,World.escY+1,'red',null,0.9,0.8); } } }
    for(const b of Blocks) if(!b.dead&&b.y>World.half+3){ b.dead=true; b.lost=true; actorRoot.remove(b.mesh); }
    for(let i=Blocks.length-1;i>=0;i--) if(Blocks[i].dead) Blocks.splice(i,1);
    for(let i=Groups.length-1;i>=0;i--){ const g=Groups[i]; if((g.done||g.missed)&&g.blocks.every(b=>b.dead)) Groups.splice(i,1); }
    for(const p of Powers){ if(p.dead) continue;
      const hit=Math.hypot(p.x-Crad.x,p.y-(Crad.y+0.5))<1.7||(Crew.on&&G.crew>0&&Math.hypot(p.x-Crew.x,p.y-(Crew.y+0.5))<1.7);
      if(hit){ p.dead=true; actorRoot.remove(p.mesh); FX.emit(p.x,p.y,1,{count:18,colors:['#FFE08A','#FFFFFF',POW[p.p].bg],speed:5,up:3,size:0.16,life:0.7,grav:8}); activatePower(p.p,p.x,p.y); }
      else if(p.y>World.half+3){ p.dead=true; actorRoot.remove(p.mesh); } }
    for(let i=Powers.length-1;i>=0;i--) if(Powers[i].dead) Powers.splice(i,1);
    if(play){ G.wide=Math.max(0,G.wide-gdt);
      if(G.phase==='wave'){ G.rowT-=gdt; if(G.rowT<=0&&G.rowsLeft>0){ G.rowT=sp.gap; spawnRow(); }
        if(G.rowsLeft<=0&&Pops.length===0&&!Groups.some(g=>!g.done&&!g.missed)) waveClear(); }
      else if(G.phase==='clear'){ G.phaseT+=gdt; if(G.phaseT>2.3) beginWave(G.wave+1); }
      else if(G.phase==='bossIntro'){ G.phaseT+=gdt; if(gdt>0) stormDust(3); if(G.phaseT>1.9) G.phase='boss'; }
      else if(G.phase==='boss'){ const B=G.boss; B.t+=gdt; if(gdt>0) stormDust(2); B.hp=B.g.blocks.filter(b=>!b.dead).length;
        let top=-Infinity; for(const b of B.g.blocks) if(!b.dead&&b.y>top) top=b.y;
        if(B.hp<=0) bossWin(); else if(top>World.escY&&B.lob<=0) stormHit();
        B.pT-=gdt; if(B.pT<=0){ B.pT=rand(6,9); spawnPower(pickPower()); } }
      else if(G.phase==='bossDown'){ G.phaseT+=gdt; if(G.phaseT>2.8){ G.boss=null; beginWave(G.wave+1); } } }
  },
  animate(gdt,dt){ const t=(World.t+=gdt);
    const M=CradMesh; M.grp.position.set(Crad.x,Crad.y,CZ); M.grp.rotation.z=Crad.th*0.5; placeCables(M,Crad.x,Crad.y,Crad.ax,World.anchorY);
    M.talk=Math.max(0,M.talk-dt); M.wave.rotation.z=M.talk>0?2.6+Math.sin(t*14)*0.4:0.12+Math.sin(t*2)*0.05;
    M.lance.rotation.x=-0.55+(Crad.target?Math.sin(t*50)*0.02:0); if(!Crad.target) M.jet.visible=M.core.visible=false;
    const C=CrewMesh; C.grp.visible=Crew.on; C.cables.forEach(c=>c.visible=Crew.on);
    if(Crew.on){ C.grp.position.set(Crew.x,Crew.y,CZ); placeCables(C,Crew.x,Crew.y,Crew.x,World.anchorY); C.wave.rotation.z=2.4+Math.sin(t*10)*0.4; }
    for(const b of Blocks){ if(b.dead) continue; const ap=b.appear<=0?0.001:easeOutBack(clamp(b.appear,0,1));
      const hs=b.kind==='armor'||b.kind==='core'?1:0.6+0.4*clamp(b.hp/b.max,0,1), pulse=b.kind==='core'?1+0.1*Math.sin(t*8+b.x):1;
      b.hit=Math.max(0,b.hit-dt); b.mesh.position.set(b.x+(b.hit>0?rand(-0.05,0.05):0),b.y,0.42); b.mesh.scale.setScalar(Math.max(0.001,ap*hs*pulse)); }
    for(const p of Powers){ p.mesh.position.set(p.x,p.y+Math.sin(t*3+p.x)*0.12,0.95); p.mesh.rotation.y+=gdt*1.6; }
    for(const g of Glints){ if(g.t>=1) continue; g.t=Math.min(1,g.t+Math.max(gdt,dt*0.5)*2.4); g.m.position.set(g.x-0.9+g.t*1.8,g.y,0.62); g.m.material.opacity=Math.sin(g.t*Math.PI)*0.85; if(g.t>=1) g.m.visible=false; }
    for(const c of Clouds){ const f=(World.dist-c.m.position.z)/World.dist; c.y+=World.vs*c.sp*gdt; if(c.y>World.half*1.3) c.y=-World.half*1.3;
      c.m.position.set(c.x*f,c.y*f,c.m.position.z); }   // same screen spot as (x,y) on the facade plane, just far behind it
    const haze=G.boss&&(G.phase==='boss'||G.phase==='bossIntro')?0.16:0; Haze.material.opacity+=(haze-Haze.material.opacity)*Math.min(1,dt*2);
    FX.update(gdt);
  },
  debug:{beginWave,activatePower,spawnPattern,spawnPower,Blocks,Groups,Crad,World,Life}
};
function placeCables(M,x,y,ax,top){ const pts=[-1.25,1.25];
  M.cables.forEach((cm,i)=>{ const x0=x+pts[i], y0=y+1.3, x1=ax+pts[i], dx=x1-x0, dy=top-y0, len=Math.hypot(dx,dy);
    cm.position.set((x0+x1)/2,(y0+top)/2,CZ); cm.scale.set(1,len,1); cm.rotation.z=-Math.atan2(dx,dy); }); }
Kit.run(GAMEDEF);
