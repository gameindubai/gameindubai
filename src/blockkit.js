/* ==========================================================================
   SAMAR'S GAME IN DUBAI — BLOCK KIT v3 (games only; load after three.js + pixel.js)
   Renderer, block textures, voxel models, particles, synth audio, UI widgets,
   the shared screens (title / HUD / pause / game over), scoring, lives, input.
   A world script defines a GAME object and calls Kit.run(GAME).
   ========================================================================== */
'use strict';
if(!window.THREE){ document.getElementById('boot').textContent="Couldn't load the 3D engine. Check your connection, then reload."; throw new Error('three.js missing'); }
const HOME_URL=window.GID_HOME||null; // the site sets this; shows a MAP button on every title screen

// ---------- storage (artifact storage in Claude, memory elsewhere; swap to localStorage when self-hosting) ----------
const Store={mem:{},
  async get(k){try{if(window.storage&&typeof window.storage.get==='function'){const r=await window.storage.get(k);if(r&&r.value!=null)return r.value;}}catch(e){}return this.mem[k]!=null?this.mem[k]:null;},
  async set(k,v){this.mem[k]=String(v);try{if(window.storage&&typeof window.storage.set==='function')await window.storage.set(k,String(v));}catch(e){}}};

// ---------- audio: all synthesised ----------
const AudioKit={
  ctx:null,master:null,sfxBus:null,musicBus:null,muted:false,noiseBuf:null,musicOn:false,nextNoteTime:0,step:0,intensity:0,song:null,
  init(){ try{
    if(this.ctx&&this.ctx.state==='closed'){ this.ctx=null; this.musicOn=false; }   // iOS can close it while the app is in the background
    if(this.ctx){ if(this.ctx.state!=='running'){ const p=this.ctx.resume(); if(p&&p.catch) p.catch(()=>{}); } return; }
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; const c=this.ctx=new AC();
    this.master=c.createGain(); this.master.gain.value=this.muted?0:0.9; this.master.connect(c.destination);
    const comp=c.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=4; comp.connect(this.master);
    this.sfxBus=c.createGain(); this.sfxBus.gain.value=0.9; this.sfxBus.connect(comp);
    this.musicBus=c.createGain(); this.musicBus.gain.value=0.32; this.musicBus.connect(comp);
    const len=c.sampleRate, b=c.createBuffer(1,len,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1; this.noiseBuf=b;
  }catch(e){} },
  suspend(){ try{ if(this.ctx&&this.ctx.state==='running'){ const p=this.ctx.suspend(); if(p&&p.catch) p.catch(()=>{}); } }catch(e){} },
  setMuted(m){ this.muted=m; if(this.master) this.master.gain.setTargetAtTime(m?0:0.9,this.ctx.currentTime,0.02); },
  tone(f,dur,o={}){
    if(!this.ctx) return; const c=this.ctx,t=c.currentTime+Math.max(0,o.at||0), osc=c.createOscillator(), g=c.createGain(); osc.type=o.type||'square';
    osc.frequency.setValueAtTime(f,t); if(o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide,t+dur);
    const vol=o.vol||0.15, atk=o.attack||0.004; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+atk); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    let node=osc; if(o.lp){const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=o.lp; osc.connect(fl); node=fl;}
    node.connect(g); g.connect(o.bus||this.sfxBus); osc.start(t); osc.stop(t+dur+0.05);
  },
  noise(dur,o={}){
    if(!this.ctx) return; const c=this.ctx,t=c.currentTime+Math.max(0,o.at||0), s=c.createBufferSource(); s.buffer=this.noiseBuf; s.loop=true;
    const fl=c.createBiquadFilter(); fl.type=o.type||'lowpass'; fl.frequency.setValueAtTime(o.f||1200,t); if(o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2,t+dur); fl.Q.value=o.q||0.8;
    const g=c.createGain(), vol=o.vol||0.2, atk=o.attack||0.005; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+atk); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(fl); fl.connect(g); g.connect(o.bus||this.sfxBus); s.start(t,Math.random()*0.5); s.stop(t+dur+0.05);
  },
  PENTA:[0,2,4,7,9],
  step12(n,base){ n=Math.min(n,14); return base*Math.pow(2,(this.PENTA[n%5]+12*Math.floor(n/5))/12); },
  bounce(step){ const f=this.step12(step,330); this.tone(f,0.11,{type:'square',vol:0.08,slide:f*1.18,lp:3200}); this.tone(150,0.08,{type:'triangle',vol:0.2,slide:90}); },
  slice(step){ const f=this.step12(step,392); this.noise(0.12,{vol:0.16,type:'highpass',f:1800,f2:5200}); this.tone(f,0.09,{type:'triangle',vol:0.1,slide:f*1.25,at:0.02}); this.noise(0.14,{vol:0.1,type:'lowpass',f:900,f2:300,at:0.03}); },
  perfect(){ [0,4,7].forEach((s,i)=>this.tone(988*Math.pow(2,s/12),0.09,{type:'triangle',vol:0.08,at:0.05+i*0.045})); },
  splash(){ this.noise(0.45,{vol:0.3,f:2600,f2:280}); this.tone(110,0.25,{type:'sine',vol:0.25,slide:55}); },
  bloop(){ this.tone(220,0.14,{type:'sine',vol:0.18,slide:520}); },
  whistle(){ if(!this.ctx) return; const c=this.ctx,t=c.currentTime, o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
    o.type='sine'; o.frequency.value=2250; lfo.frequency.value=34; lg.gain.value=140; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.11,t+0.02); g.gain.setValueAtTime(0.11,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
    g.gain.setValueAtTime(0.0001,t+0.2); g.gain.exponentialRampToValueAtTime(0.11,t+0.22); g.gain.setValueAtTime(0.11,t+0.5); g.gain.exponentialRampToValueAtTime(0.0001,t+0.56);
    o.connect(g); g.connect(this.sfxBus); o.start(t); lfo.start(t); o.stop(t+0.6); lfo.stop(t+0.6); },
  cheer(big){ const d=big?1.8:1.1; this.noise(d,{vol:big?0.15:0.09,type:'bandpass',f:1400,q:0.6,attack:0.25}); for(let i=0;i<(big?14:7);i++) this.noise(0.05,{vol:0.06,type:'highpass',f:1800,at:rand(0.05,d*0.8)}); },
  aww(){ this.noise(0.9,{vol:0.07,type:'bandpass',f:900,f2:420,q:1.2,attack:0.1}); },
  squawk(){ this.tone(880,0.07,{type:'sawtooth',vol:0.05,slide:1500,lp:2600}); this.tone(1300,0.08,{type:'sawtooth',vol:0.045,slide:700,lp:2600,at:0.08}); },
  tweet(){ this.tone(2600,0.06,{type:'sine',vol:0.07,slide:3400}); this.tone(3000,0.05,{type:'sine',vol:0.06,slide:2400,at:0.07}); this.tone(2800,0.06,{type:'sine',vol:0.06,slide:3600,at:0.13}); },
  chirp(){ this.tone(1400,0.12,{type:'sine',vol:0.08,slide:2600}); this.tone(1600,0.1,{type:'sine',vol:0.07,slide:2900,at:0.13}); },
  pickup(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,0.1,{type:'triangle',vol:0.12,at:i*0.055})); },
  sparkle(){ [1319,1568,2093,2637].forEach((f,i)=>this.tone(f,0.12,{type:'triangle',vol:0.07,at:i*0.07})); },
  hurt(){ this.tone(330,0.3,{type:'square',vol:0.09,slide:150,lp:1800}); },
  horn(){ this.tone(110,0.7,{type:'sawtooth',vol:0.11,lp:900}); this.tone(165,0.7,{type:'sawtooth',vol:0.09,lp:900}); this.tone(147,0.5,{type:'sawtooth',vol:0.09,lp:900,at:0.75}); this.tone(220,0.5,{type:'sawtooth',vol:0.09,lp:900,at:0.75}); },
  swish(){ this.noise(0.28,{vol:0.18,type:'highpass',f:2500,f2:6000}); [784,988,1319].forEach((f,i)=>this.tone(f,0.14,{type:'triangle',vol:0.1,at:0.1+i*0.07})); },
  clank(){ this.tone(420,0.12,{type:'square',vol:0.08,slide:380}); this.tone(1260,0.2,{type:'triangle',vol:0.06}); this.noise(0.08,{vol:0.1,type:'bandpass',f:3000}); },
  crack(){ this.noise(0.18,{vol:0.22,type:'bandpass',f:1400,q:1.5}); this.tone(180,0.2,{type:'square',vol:0.1,slide:70,lp:900}); },
  burst(){ this.noise(0.6,{vol:0.3,f:3000,f2:200}); this.tone(90,0.4,{type:'sine',vol:0.3,slide:40}); },
  sticky(){ this.tone(160,0.35,{type:'triangle',vol:0.14,slide:90}); this.noise(0.3,{vol:0.08,type:'lowpass',f:500}); },
  fanfare(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,i===3?0.35:0.12,{type:'square',vol:0.06,lp:3000,at:i*0.11})); },
  over(){ [392,349,311,262].forEach((f,i)=>this.tone(f,0.25,{type:'square',vol:0.07,lp:2000,at:i*0.18})); },
  click(){ this.tone(660,0.05,{type:'square',vol:0.06,slide:880}); },
  // music engine: 32 eighth-note steps, drum pattern over 8 steps, per-world song
  startMusic(){ if(!this.ctx||this.musicOn||!this.song) return; this.musicOn=true; this.step=0; this.nextNoteTime=this.ctx.currentTime+0.1; },
  pumpMusic(){ const S2=this.song; if(!this.ctx||!this.musicOn||this.muted||!S2) return; const c=this.ctx;
    if(this.nextNoteTime<c.currentTime-0.2) this.nextNoteTime=c.currentTime+0.05;
    const spb=60/(S2.tempo*(1+this.intensity*0.14))/2;
    while(this.nextNoteTime<c.currentTime+0.15){ this.playStep(this.step,this.nextNoteTime-c.currentTime); this.nextNoteTime+=spb; this.step=(this.step+1)%32; } },
  playStep(s,at){ const S2=this.song, bar=s%8, B=this.musicBus;
    if(S2.dum.includes(bar)){ this.tone(95,0.18,{type:'sine',vol:0.34,slide:48,at,bus:B}); }
    if(bar===0||bar===4) this.tone(S2.bass[(s>>2)%S2.bass.length],0.3,{type:'triangle',vol:0.2,at,bus:B});
    if(S2.tek.includes(bar)) this.noise(0.06,{vol:0.1,type:'highpass',f:2800,at,bus:B});
    if(this.intensity>0&&S2.ka.includes(bar)) this.noise(0.04,{vol:0.06,type:'highpass',f:3500,at,bus:B});
    const n=S2.mel[s]; if(n>=0) this.tone(S2.scale[n],0.16,{type:S2.lead||'square',vol:S2.leadVol||0.04,at,bus:B,lp:2400}); }
};

// ---------- renderer & scene ----------
const glCanvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas:glCanvas,antialias:false,powerPreference:'high-performance'});
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(40,1,0.5,300);
const CamBase=new THREE.Vector3();
const FACE_SHADE=[0.74,0.74,1.0,0.55,0.92,0.68]; // Minecraft-style fixed shading: +x,-x,+y,-y,+z,-z
function shadedBoxGeo(w=1,h=1,d=1){ const g=new THREE.BoxGeometry(w,h,d), cols=[];
  for(let f=0;f<6;f++) for(let v=0;v<4;v++) cols.push(FACE_SHADE[f],FACE_SHADE[f],FACE_SHADE[f]);
  g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3)); return g; }
const BOXGEO=shadedBoxGeo(1,1,1);

// ---------- 16x16 block textures (worlds add entries to TEXDEF) ----------
const TEX={};
function pxl(g,x,y,col){g.fillStyle=col;g.fillRect(x,y,1,1);}
function noise16(g,r,base,amp){const c=hexToRgb(base);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=1+(r()-0.5)*amp*2;pxl(g,x,y,rgbCss(c[0]*k,c[1]*k,c[2]*k));}}
function bevel(g,light,dark){for(let i=0;i<16;i++){pxl(g,i,0,light);pxl(g,0,i,light);pxl(g,i,15,dark);pxl(g,15,i,dark);}}
const TEXDEF={
  quartz:(g,r)=>{noise16(g,r,'#E4E9EC',0.035);bevel(g,'#F8FAFB','#BFC8CE');for(let i=0;i<4;i++)pxl(g,1+(r()*14|0),1+(r()*14|0),'#D3DADF');},
  gold:(g,r)=>{noise16(g,r,'#F2B632',0.08);for(let i=0;i<10;i++)pxl(g,1+(r()*14|0),1+(r()*14|0),'#FFE08A');bevel(g,'#FFE08A','#B27510');},
  water:(g,r)=>{noise16(g,r,'#1EA6C8',0.035);for(let y=0;y<16;y+=4){const o=(r()*16)|0;for(let k=0;k<4;k++)pxl(g,(o+k)%16,y+(k>1?1:0),'#5FD3E9');}for(let i=0;i<5;i++)pxl(g,r()*16|0,r()*16|0,'#A2ECF6');},
  lamp:(g,r)=>{noise16(g,r,'#FFE7A0',0.03);for(let y=4;y<12;y++)for(let x=4;x<12;x++)pxl(g,x,y,'#FFFBEA');bevel(g,'#FFF6D6','#D2A94E');}};
function tex(name){
  if(TEX[name]) return TEX[name]; const c=document.createElement('canvas'); c.width=c.height=16; const g=c.getContext('2d');
  TEXDEF[name](g,mulberry32(hashStr(name)));
  const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter; t.generateMipmaps=false; t.wrapS=t.wrapT=THREE.RepeatWrapping; TEX[name]=t; return t;
}
const WORLD_MATS=[]; const Tint={v:1,target:1};
function tintable(m,base=1){ WORLD_MATS.push({m,base}); m.color.setScalar(base); return m; }
const MAT={}, GLOW=new Set(['lamp']);
function blockMat(name){ if(MAT[name]) return MAT[name]; const glow=GLOW.has(name);
  const m=new THREE.MeshBasicMaterial({map:tex(name),vertexColors:!glow}); if(!glow) tintable(m); MAT[name]=m; return m; }
function planeMesh(w,h,texName,rx,ry,shade=1,extra={}){
  const t=tex(texName).clone(); t.needsUpdate=true; t.repeat.set(rx,ry);
  const m=new THREE.MeshBasicMaterial(Object.assign({map:t},extra)); tintable(m,shade); return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m); }
class Batch{
  constructor(){this.m=new Map();}
  add(mat,x,y,z){let l=this.m.get(mat);if(!l){l=[];this.m.set(mat,l);}l.push(x,y,z);}
  build(parent){ const mtx=new THREE.Matrix4();
    for(const [name,l] of this.m){ const n=l.length/3, im=new THREE.InstancedMesh(BOXGEO,blockMat(name),n);
      for(let i=0;i<n;i++){ mtx.makeTranslation(l[i*3],l[i*3+1],l[i*3+2]); im.setMatrixAt(i,mtx); }
      im.instanceMatrix.needsUpdate=true; im.frustumCulled=false; parent.add(im); } }
}

// ---------- voxel models ----------
const FACES=[
  {d:[1,0,0],v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},{d:[-1,0,0],v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
  {d:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},{d:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
  {d:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]},{d:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]}];
class Vox{
  constructor(seed=7){this.cells=new Map();this.r=mulberry32(seed);}
  k(x,y,z){return((x+256)*512+(y+256))*512+(z+256);}
  set(x,y,z,hex,noise=0.06){const c=hexToRgb(hex),f=1+(this.r()-0.5)*noise*2;this.cells.set(this.k(x,y,z),[x,y,z,c[0]*f,c[1]*f,c[2]*f]);return this;}
  del(x,y,z){this.cells.delete(this.k(x,y,z));return this;}
  has(x,y,z){return this.cells.has(this.k(x,y,z));}
  get(x,y,z){return this.cells.get(this.k(x,y,z));}
  box(x0,y0,z0,x1,y1,z1,hex,noise=0.06){for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++)for(let z=z0;z<z1;z++)this.set(x,y,z,hex,noise);return this;}
  filter(fn){ const v=new Vox(); v.r=this.r; for(const [k,c] of this.cells) if(fn(c[0],c[1],c[2])) v.cells.set(k,c.slice()); return v; }
  geometry(s=1/8,ox=0,oy=0,oz=0){
    const pos=[],col=[],idx=[0,1,2,0,2,3];
    for(const c of this.cells.values()){ const x=c[0],y=c[1],z=c[2];
      for(let f=0;f<6;f++){ const F=FACES[f]; if(this.has(x+F.d[0],y+F.d[1],z+F.d[2])) continue; const sh=FACE_SHADE[f];
        for(const i of idx){ const q=F.v[i]; pos.push((x+q[0]-ox)*s,(y+q[1]-oy)*s,(z+q[2]-oz)*s); col.push(c[3]*sh,c[4]*sh,c[5]*sh); } } }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); geo.computeBoundingSphere(); return geo;
  }
}
const VOXMAT=new THREE.MeshBasicMaterial({vertexColors:true});
const OUTLINE_MAT=new THREE.MeshBasicMaterial({color:0x14181F,side:THREE.BackSide});
const vmesh=(v,s=1/8,ox=0,oy=0,oz=0,mat=VOXMAT)=>new THREE.Mesh(v.geometry(s,ox,oy,oz),mat);
function addOutline(mesh,scale=1.13,mat=OUTLINE_MAT){const o=new THREE.Mesh(mesh.geometry,mat);o.scale.setScalar(scale);mesh.add(o);return mesh;}
// blocky sphere/ellipsoid helper: colour(x,y,z,cx,cy,cz) -> hex or null
function voxBlob(rx,ry,rz,colour,seed=1,noise=0.05){ const v=new Vox(seed);
  for(let x=-rx;x<rx;x++) for(let y=-ry;y<ry;y++) for(let z=-rz;z<rz;z++){ const cx=x+0.5,cy=y+0.5,cz=z+0.5;
    if((cx*cx)/(rx*rx)+(cy*cy)/(ry*ry)+(cz*cz)/(rz*rz)>1.07) continue; const col=colour(x,y,z,cx,cy,cz); if(col) v.set(x,y,z,col,noise); }
  return v; }
// the power-up block (gold frame + icon on every face) — identical in every world
const PowerMats={};
function powerBlockMat(icon,bg){ const key=icon+bg; if(PowerMats[key]) return PowerMats[key];
  const c=document.createElement('canvas'); c.width=c.height=18; const g=c.getContext('2d');
  g.fillStyle='#B27510'; g.fillRect(0,0,18,18); g.fillStyle='#FFE08A'; g.fillRect(0,0,17,17); g.fillStyle=PAL.gold; g.fillRect(1,1,16,16);
  g.fillStyle=bg; g.fillRect(2,2,14,14); const s=renderSprite(icon,1); g.drawImage(s,Math.round(9-s.width/2),Math.round(9-s.height/2));
  const t=new THREE.CanvasTexture(c); t.magFilter=t.minFilter=THREE.NearestFilter; t.generateMipmaps=false;
  return PowerMats[key]=new THREE.MeshBasicMaterial({map:t,vertexColors:true}); }
function powerBlock(icon,bg,parent){ const m=addOutline(new THREE.Mesh(BOXGEO,powerBlockMat(icon,bg)),1.12); m.scale.setScalar(0.95); parent.add(m); return m; }

// ---------- voxel particles ----------
class Particles{
  constructor(parent,n=560){ this.n=n; this.im=new THREE.InstancedMesh(BOXGEO,new THREE.MeshBasicMaterial({vertexColors:true}),n);
    this.im.frustumCulled=false; this.p=[]; this.d=new THREE.Object3D(); this.col=new THREE.Color(); this.next=0;
    for(let i=0;i<n;i++){ this.p.push({life:0,dead:false}); this.im.setColorAt(i,this.col.set(1,1,1)); } parent.add(this.im); this.update(0); }
  emit(x,y,z,o={}){ const count=o.count||10, sp=o.speed||4;
    for(let k=0;k<count;k++){ const i=this.next; this.next=(this.next+1)%this.n; const p=this.p[i], a=Math.random()*Math.PI*2, e=Math.random();
      p.x=x+(o.jx?rand(-o.jx,o.jx):0); p.y=y+(o.jy?rand(-o.jy,o.jy):0); p.z=z; p.vx=Math.cos(a)*sp*e+(o.vx||0); p.vz=Math.sin(a)*sp*e*0.6;
      p.vy=(o.up!=null?o.up:3)+Math.random()*sp*(o.upRand!=null?o.upRand:1); p.life=p.max=(o.life||0.8)*(0.6+Math.random()*0.6);
      p.size=(o.size||0.18)*(0.6+Math.random()*0.8); p.grav=o.grav!=null?o.grav:12; p.drag=o.drag!=null?o.drag:0.5; p.rot=Math.random()*6; p.vr=rand(-8,8); p.dead=false;
      this.im.setColorAt(i,this.col.set(o.colors?pick(o.colors):(o.color||'#ffffff'))); }
    this.im.instanceColor.needsUpdate=true; }
  update(dt){ const d=this.d;
    for(let i=0;i<this.n;i++){ const p=this.p[i];
      if(p.life<=0){ if(p.dead) continue; p.dead=true; d.position.set(0,-999,0); d.scale.setScalar(0.001); d.updateMatrix(); this.im.setMatrixAt(i,d.matrix); continue; }
      p.life-=dt; p.vy-=p.grav*dt; const dr=Math.exp(-p.drag*dt); p.vx*=dr; p.vz*=dr; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; p.rot+=p.vr*dt;
      d.position.set(p.x,p.y,p.z); d.rotation.set(p.rot*0.7,p.rot,0); d.scale.setScalar(Math.max(0.001,p.size*Math.min(1,p.life/p.max*2.5))); d.updateMatrix(); this.im.setMatrixAt(i,d.matrix); }
    this.im.instanceMatrix.needsUpdate=true; }
}

// ---------- UI widgets (2D overlay, pixel-drawn) ----------
const ui=document.getElementById('ui'), uctx=ui.getContext('2d');
let W=innerWidth,H=innerHeight,DPR=1,S=1; const SAFE={t:0,b:0,l:0,r:0};
function readSafe(){ const d=document.createElement('div');
  d.style.cssText='position:fixed;left:0;top:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(d); const cs=getComputedStyle(d); SAFE.t=parseFloat(cs.paddingTop)||0; SAFE.r=parseFloat(cs.paddingRight)||0; SAFE.b=parseFloat(cs.paddingBottom)||0; SAFE.l=parseFloat(cs.paddingLeft)||0; d.remove(); }
const UI={buttons:[],pressed:null};
const BTN={gold:{face:'#F4B731',light:'#FFE08A',dark:'#D59A1C',deep:'#9C6A0D',text:'ink'},aqua:{face:'#39CCE3',light:'#A8F1FB',dark:'#22A7BF',deep:'#146E88',text:'ink'},
  navy:{face:'#1F4E7F',light:'#3C77B2',dark:'#173C62',deep:'#0B213D',text:'white'}};
function button(id,x,y,w,h,o={}){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h); UI.buttons.push({id,x,y,w,h});
  const c=uctx,p=Math.max(2,Math.round(2.5*S)),d=Math.round(p*2.2),st=BTN[o.style||'gold'],down=UI.pressed===id,oy=down?d:0;
  c.fillStyle=PAL.ink; c.fillRect(x-p,y-p+oy,w+p*2,h+(d-oy)+p*2); if(!down){ c.fillStyle=st.deep; c.fillRect(x,y+h,w,d); }
  c.fillStyle=st.face; c.fillRect(x,y+oy,w,h); c.fillStyle=st.light; c.fillRect(x,y+oy,w,p); c.fillRect(x,y+oy,p,h);
  c.fillStyle=st.dark; c.fillRect(x,y+oy+h-p,w,p); c.fillRect(x+w-p,y+oy,p,h);
  const cx=x+w/2, cy=y+oy+h/2, tint=st.text==='ink'?PAL.ink:'#FFFFFF';
  if(o.icon) drawSprite(c,o.icon,cx,cy,o.px||Math.max(2,Math.round(h/12)),{tint}); else if(o.label) drawText(c,o.label,cx,cy,o.px||Math.max(2,Math.round(h/13)),st.text);
}
function hitButton(x,y){ for(let i=UI.buttons.length-1;i>=0;i--){ const b=UI.buttons[i]; if(x>=b.x-8&&x<=b.x+b.w+8&&y>=b.y-8&&y<=b.y+b.h+16) return b; } return null; }
function panel(x,y,w,h){ const c=uctx,p=Math.max(2,Math.round(3*S)); x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  c.fillStyle=PAL.ink; c.fillRect(x-p,y-p,w+p*2,h+p*2); c.fillStyle='#17416E'; c.fillRect(x,y,w,h); c.fillStyle='#2A5E93'; c.fillRect(x,y,w,p); c.fillRect(x,y,p,h);
  c.fillStyle='#0F2D52'; c.fillRect(x,y+h-p,w,p); c.fillRect(x+w-p,y,p,h); c.fillStyle=PAL.gold; const q=p*2;
  [[x+p,y+p],[x+w-p-q,y+p],[x+p,y+h-p-q],[x+w-p-q,y+h-p-q]].forEach(a=>c.fillRect(a[0],a[1],q,q)); }
function pill(x,y,w,h,face){ const c=uctx,p=Math.max(1,Math.round(2*S)); x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  c.fillStyle=PAL.ink; c.fillRect(x-p,y-p,w+p*2,h+p*2); c.fillStyle=face; c.fillRect(x,y,w,h); }
function bar(x,y,w,h,frac,col,bg='#0B1F3A'){ const c=uctx,p=Math.max(1,Math.round(1.5*S)); x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  c.fillStyle=PAL.ink; c.fillRect(x-p,y-p,w+p*2,h+p*2); c.fillStyle=bg; c.fillRect(x,y,w,h); const fw=Math.round(w*clamp(frac,0,1));
  c.fillStyle=col; c.fillRect(x,y,fw,h); c.fillStyle='rgba(255,255,255,0.35)'; c.fillRect(x,y,fw,Math.max(1,Math.round(h/3))); }
function scrim(h){ const a=(GAME&&GAME.meta.scrim)||1, g=uctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'rgba(6,16,32,'+(0.9*a).toFixed(2)+')'); g.addColorStop(0.6,'rgba(6,16,32,'+(0.55*a).toFixed(2)+')'); g.addColorStop(1,'rgba(6,16,32,0)'); uctx.fillStyle=g; uctx.fillRect(0,0,W,h); }
const _pv=new THREE.Vector3();
function toScreen(x,y,z){ _pv.set(x,y,z).project(camera); return {x:(_pv.x+1)/2*W,y:(1-_pv.y)/2*H,behind:_pv.z>1}; }
function worldPerPixel(z=0){ const a=toScreen(0,5,z), b=toScreen(1,5,z); return 1/Math.max(1e-3,Math.abs(b.x-a.x)); }

/* ==========================================================================
   SHARED RULES: state, scoring, lives, flow
   ========================================================================== */
let GAME=null;
const G={state:'boot',phase:'',t:0,score:0,best:0,lives:3,wave:0,combo:0,maxCombo:0,hits:0,perfects:0,x2:0,
  popups:[],banner:null,bubble:null,flash:0,shake:0,timeScale:1,grace:0,dieT:0,prev:null,startT:0,hint:true,newBest:false,lifeLostT:0};
const Loop={id:0,fb:0,rafAt:performance.now(),lastStep:0,glLost:false,glLostAt:0,kick(){},nudge(){},back(){}};
const MAX_LIVES=5;
const Top={v:0,known:false,at:-1e9,   // all-time best across every player, from /api/stats
  load(){ if(!/^https?:/.test(location.protocol)||performance.now()-this.at<30000) return; this.at=performance.now();
    fetch('/api/stats').then(r=>r.ok?r.json():null).then(d=>{ if(!d||!GAME) return; const s=d[GAME.meta.id]; this.v=Math.max(this.v,(s&&s.best)||0); this.known=true; }).catch(()=>{}); }};
const mult=()=>(1+Math.min(4,Math.floor(G.combo/8)))*(G.x2>0?2:1);
function addScore(n){ G.score+=Math.round(n); }
function popup(text,x,y,style='hud',px=null,dur=0.9,z=0){ G.popups.push({text,x,y,z,style,px,t:0,dur}); }
function banner(text,sub,dur=1.7,style='gold'){ G.banner={text,sub,t:0,dur,style}; }
function say(text,force){ if(!force&&G.sayCd>0) return; G.bubble={text,t:0,dur:1.7}; G.sayCd=1.3; if(GAME.onSay) GAME.onSay(); (AudioKit[GAME.meta.voice]||AudioKit.squawk).call(AudioKit); }
function scoreHit(base,perfect){ G.hits++; G.combo++; G.maxCombo=Math.max(G.maxCombo,G.combo); const m=mult(); let pts=base*m; if(perfect){ pts+=15*m; G.perfects++; } addScore(pts); G.hint=false; return pts; }
function breakCombo(){ G.combo=0; }
function loseLife(){
  if(G.state!=='play') return; if(G.grace>0) return; G.grace=0.9;
  G.lives--; G.flash=1; G.lifeLostT=0.7; G.shake=REDUCED?0:0.35; AudioKit.hurt(); try{ if(navigator.vibrate) navigator.vibrate(60); }catch(e){}
  if(GAME.onLifeLost) GAME.onLifeLost();
  if(G.lives<=0) gameOver(); else if(G.lives===1) say(GAME.lines.last,true); else say(pick(GAME.lines.hurt),true);
}
function gainLife(){ if(G.lives<MAX_LIVES){ G.lives++; return true; } return false; }
function gameOver(){ G.state='dying'; G.dieT=0; G.timeScale=0.35; AudioKit.over(); say(GAME.lines.over,true); }
function finishGameOver(){
  G.state='over'; G.timeScale=1; if(G.score>G.best){ G.best=G.score; G.newBest=true; Store.set(GAME.key('best'),G.best); }
  G.newTop=Top.known&&G.score>0&&G.score>Top.v; if(G.score>Top.v) Top.v=G.score;
  Tint.target=1; AudioKit.intensity=0; G.x2=0; GAME.onOver();
  Track.ev('game_over',{game_id:GAME.meta.id,score:G.score,wave:G.wave,new_best:G.newBest?1:0,duration_sec:Math.round(G.t-G.startT)});
  Track.score(GAME.meta.id,G.score,G.t-G.startT);   // global all-time best (server keeps the max)
}
function resetCommon(){ G.popups=[]; G.banner=null; G.score=0; G.lives=3; G.combo=0; G.maxCombo=0; G.hits=0; G.perfects=0; G.x2=0; G.grace=0; G.flash=0; G.timeScale=1; G.newBest=false; G.newTop=false; Tint.target=1; AudioKit.intensity=0; }
function startGame(w){
  resetCommon(); GAME.reset(); G.state='play'; G.startT=G.t; G.runs=(G.runs||0)+1;
  Track.ev('game_start',{game_id:GAME.meta.id,run_number:G.runs}); Track.play(GAME.meta.id); AudioKit.init(); AudioKit.startMusic(); (AudioKit[GAME.meta.startSfx]||AudioKit.whistle).call(AudioKit);
  say(GAME.lines.start,true); GAME.start(w||1);
}
function toTitle(){ resetCommon(); GAME.reset(); G.state='title'; GAME.toTitle(); Top.load(); }
function pause(){ if(G.state!=='play') return; G.prev=G.state; G.state='paused'; AudioKit.suspend(); if(GAME.onPause) GAME.onPause(); }
function resume(){ if(G.state!=='paused') return; G.state=G.prev||'play'; AudioKit.init(); }

/* ==========================================================================
   SHARED SCREENS
   ========================================================================== */
function soundButton(x,y,sz){ button('sound',x,y,sz,sz,{style:'navy',icon:AudioKit.muted?'soundOff':'soundOn',px:Math.max(2,Math.round(sz/12))}); }
function drawTitle(){
  const M=GAME.meta, m=Math.round(12*S), bs=Math.round(42*S), lp=Math.max(3,Math.floor(Math.min(W*0.84/35,H*0.115/7)));
  scrim(SAFE.t+m+bs+lp*31);
  soundButton(W-SAFE.r-m-bs,SAFE.t+m,bs); if(HOME_URL) button('map',SAFE.l+m,SAFE.t+m,bs,bs,{style:'navy',icon:'map'});
  const pp=Math.max(2,Math.round(2.2*S)), pt='WORLD '+M.world, pw=measureText(pt,pp)+pp*8, ph=pp*12, py=SAFE.t+m+Math.round(bs/2-ph/2);
  pill(W/2-pw/2,py,pw,ph,'#0B1F3A'); drawText(uctx,pt,W/2,py+ph/2,pp,M.accent||'aqua');
  const ly=py+ph+lp*6+Math.round(10*S)+Math.sin(G.t*2)*lp*0.35;
  drawText(uctx,M.logo[0],W/2,ly,lp,'title'); drawText(uctx,M.logo[1],W/2,ly+lp*9.6,lp,'title');
  drawText(uctx,M.place,W/2,ly+lp*9.6+lp*6.4,Math.max(2,Math.min(Math.round(lp*0.36),Math.floor(W*0.9/measureText(M.place,1)))),M.accent||'aqua');
  const tx=GAME.titleExtra?GAME.titleExtra():null, nl=(Top.v>0?1:0)+(G.best>0?1:0)+(tx?1:0);
  const bw=Math.min(W*0.62,300*S), bh=Math.round(64*S), by=H-SAFE.b-bh-Math.max(Math.round(H*0.13),Math.round((nl*24+22)*S)), pulse=UI.pressed==='play'?0:Math.round(Math.max(0,Math.sin(G.t*4))*2*S);
  button('play',W/2-bw/2-pulse,by-pulse,bw+pulse*2,bh+pulse*2,{label:'PLAY',style:'gold',px:Math.round(bh/10)});
  let ty=by+bh+Math.round(34*S); const sm=Math.max(2,Math.round(2.6*S));
  if(Top.v>0){ drawText(uctx,'TOP SCORE '+fmt(Top.v),W/2,ty,sm,'gold'); ty+=Math.round(24*S); }
  if(G.best>0){ drawText(uctx,'YOUR BEST '+fmt(G.best),W/2,ty,Math.max(2,Math.round(2.2*S)),'hud'); ty+=Math.round(24*S); }
  if(tx) drawText(uctx,tx,W/2,ty,Math.max(2,Math.round(2.2*S)),M.accent||'aqua');
}
function drawHUD(){
  const M=GAME.meta, m=Math.round(10*S), top=SAFE.t+m, bs=Math.round(42*S), c=uctx;
  scrim(top+bs+Math.round(58*S));
  button('pause',SAFE.l+m,top,bs,bs,{style:'navy',icon:'pause',px:Math.max(2,Math.round(bs/12))});
  const sp=Math.max(3,Math.round(5.2*S)); drawText(c,fmt(G.score),W/2,top+sp*3.6,sp,'hud');
  const wy=top+sp*8+Math.round(4*S), wp=Math.max(2,Math.round(2.2*S)), boss=GAME.bossHUD&&GAME.bossHUD();
  if(boss){ drawText(c,boss.name,W/2,wy,wp,'red'); const n=boss.max, sz=Math.round(13*S), gap=Math.round(4*S), tw=n*sz+(n-1)*gap+sz+gap*2; let x=W/2-tw/2;
    drawSprite(c,boss.icon,x+sz/2,wy+wp*5+sz/2,Math.max(1,Math.round(sz/9))); x+=sz+gap*2;
    for(let i=0;i<n;i++){ const on=i<boss.hp; c.fillStyle=PAL.ink; c.fillRect(Math.round(x-2),Math.round(wy+wp*5-2),sz+4,sz+4);
      c.fillStyle=on?'#E8561F':'#2A3A52'; c.fillRect(Math.round(x),Math.round(wy+wp*5),sz,sz); if(on){c.fillStyle='#FF9A6A';c.fillRect(Math.round(x),Math.round(wy+wp*5),sz,Math.round(sz/3));} x+=sz+gap; } }
  else if(G.state==='play'&&GAME.waveLabel){ drawText(c,GAME.waveLabel(),W/2,wy,wp,M.accent||'aqua'); const bw=Math.round(96*S), pr=GAME.waveProgress();
    bar(W/2-bw/2,wy+wp*5,bw,Math.max(4,Math.round(5*S)),pr,M.accentHex||PAL.aqua); }
  const fp=Math.max(2,Math.round(2.3*S)), fw=SPR[M.lifeIcon].rows[0].length*fp; let lx=W-SAFE.r-m-fw/2;
  for(let i=0;i<Math.max(G.lives,0);i++){ drawSprite(c,M.lifeIcon,lx,top+bs/2,fp); lx-=fw+fp*2; }
  if(G.lifeLostT>0) drawSprite(c,M.lifeIcon,lx+Math.sin(G.t*50)*3,top+bs/2-(0.7-G.lifeLostT)*30*S,fp,{alpha:G.lifeLostT/0.7});
  const by=H-SAFE.b-m;
  if(G.combo>=3){ const mp=Math.max(3,Math.round(4.6*S)), k=mult(); if(k>1) drawText(c,'x'+k,SAFE.l+m+Math.round(4*S),by-mp*9,mp,'gold','left');
    drawText(c,'COMBO '+G.combo,SAFE.l+m+Math.round(4*S),by-mp*2.4,Math.max(2,Math.round(2*S)),'hud','left'); }
  const pw=(GAME.powersHUD?GAME.powersHUD():[]).slice(); if(G.x2>0) pw.push(['star',G.x2/10]);
  let px=W-SAFE.r-m; const ts=Math.round(44*S);
  for(const p of pw){ const x=px-ts, y=by-ts-Math.round(12*S); pill(x,y,ts,ts,'#0B1F3A');
    drawSprite(c,p[0],x+ts/2,y+ts/2,Math.max(2,Math.min(4,Math.floor(ts*0.82/SPR[p[0]].rows[0].length))));
    bar(x,y+ts+Math.round(5*S),ts,Math.max(3,Math.round(4*S)),p[1],PAL.gold);
    if(p[2]) for(let i=0;i<p[2];i++){ c.fillStyle=PAL.aqua; c.fillRect(Math.round(x+ts-8*S-i*8*S),Math.round(y+3*S),Math.round(5*S),Math.round(5*S)); }
    px-=ts+Math.round(12*S); }
  if(G.hint&&G.state==='play'&&!G.banner&&G.t-G.startT<14){ const hy=H-SAFE.b-Math.round(96*S), hp=Math.max(2,Math.round(3.2*S));
    drawText(c,M.hint,W/2,hy-Math.round(44*S),Math.max(2,Math.round(2.8*S)),'hud');
    if(M.hintMotion==='swipe'){ const k=(G.t*0.9)%1, x0=W/2-80*S, x1=W/2+80*S, hx=lerp(x0,x1,k), hyy=hy+Math.sin(k*Math.PI)*-30*S;
      c.fillStyle='rgba(255,255,255,0.85)'; for(let i=1;i<9;i++){ const kk=Math.max(0,k-i*0.025), s2=Math.round((9-i)*S*0.9); c.fillRect(Math.round(lerp(x0,x1,kk)-s2/2),Math.round(hy+Math.sin(kk*Math.PI)*-30*S-s2/2),s2,s2); }
      drawSprite(c,'hand',hx+8*S,hyy+14*S,hp); }
    else drawSprite(c,'hand',W/2+Math.sin(G.t*3)*70*S,hy,hp); }
}
function drawPause(){
  uctx.fillStyle='rgba(6,16,32,0.72)'; uctx.fillRect(0,0,W,H);
  const pw=Math.min(W*0.8,330*S), bh=Math.round(56*S), gap=Math.round(20*S), ph=bh*3+gap*4+Math.round(70*S), x=W/2-pw/2, y=H/2-ph/2;
  panel(x,y,pw,ph); drawText(uctx,'PAUSED',W/2,y+Math.round(40*S),Math.max(3,Math.round(5*S)),'gold');
  let by=y+Math.round(78*S); const bw=pw-gap*2;
  button('resume',x+gap,by,bw,bh,{label:'RESUME',style:'gold'}); by+=bh+gap;
  button('restart',x+gap,by,bw,bh,{label:'RESTART',style:'aqua'}); by+=bh+gap;
  button('home',x+gap,by,bw,bh,{label:'HOME',style:'navy'});
  const bs=Math.round(42*S), m=Math.round(10*S); soundButton(W-SAFE.r-m-bs,SAFE.t+m,bs);
}
function drawOver(){
  const M=GAME.meta, pw=Math.min(W*0.88,360*S), inner=pw-Math.round(40*S), c=uctx, extra=GAME.overExtra?GAME.overExtra():null;
  const tp=Math.max(2,Math.min(Math.round(5*S),Math.floor(inner/measureText(M.overTitle,1))));
  const sp=Math.max(3,Math.min(Math.round(7*S),Math.floor(inner/Math.max(1,measureText(fmt(G.score),1)))));
  const bh=Math.round(62*S), sbh=Math.round(48*S), gap=Math.round(16*S), exh=extra?Math.round(26*S):0, toph=(!G.newTop&&Top.v>0)?Math.round(26*S):0;
  const ph=Math.round(tp*7+sp*7+120*S)+bh+sbh+gap*3+exh+toph, x=W/2-pw/2, y=Math.max(SAFE.t+10,H*0.5-ph/2-20*S);
  panel(x,y,pw,ph); let cy=y+Math.round(24*S)+tp*3.5;
  drawText(c,M.overTitle,W/2,cy,tp,'gold'); cy+=tp*4+Math.round(22*S)+sp*3.5; drawText(c,fmt(G.score),W/2,cy,sp,'hud'); cy+=sp*4+Math.round(18*S);
  const sm=Math.max(2,Math.round(2.4*S));
  if(G.newTop){ const t='NEW TOP SCORE!', tw=measureText(t,sm)+sm*8; pill(W/2-tw/2,cy-sm*6,tw,sm*12,PAL.coral); drawText(c,t,W/2,cy,sm,'hud'); }
  else if(G.newBest){ const t='NEW BEST!', tw=measureText(t,sm)+sm*8; pill(W/2-tw/2,cy-sm*6,tw,sm*12,PAL.gold); drawText(c,t,W/2,cy,sm,'ink'); }
  else if(G.best>0) drawText(c,'YOUR BEST '+fmt(G.best),W/2,cy,sm,'aqua');
  if(toph){ cy+=toph; drawText(c,'TOP SCORE '+fmt(Top.v),W/2,cy,sm,'gold'); }
  cy+=Math.round(28*S); drawText(c,GAME.overStats(),W/2,cy,Math.max(2,Math.round(2*S)),'hud');
  if(extra){ cy+=exh; drawText(c,extra,W/2,cy,Math.max(2,Math.round(2*S)),M.accent||'aqua'); }
  cy+=Math.round(28*S); const bw=pw-gap*2;
  button('again',x+gap,cy,bw,bh,{label:'PLAY AGAIN',style:'gold',px:Math.round(bh/12)}); cy+=bh+gap;
  button('home',x+gap,cy,bw,sbh,{label:'HOME',style:'navy'});
}
function drawBanner(){
  const b=G.banner; if(!b) return; const k=b.t<0.28?easeOutBack(b.t/0.28):1, a=b.t>b.dur-0.3?(b.dur-b.t)/0.3:1;
  const bp=Math.max(3,Math.min(Math.round(7*S),Math.floor(W*0.86/Math.max(1,measureText(b.text,1))))), y=H*0.36;
  drawText(uctx,b.text,W/2,y,bp,b.style,'center',a,Math.max(0.01,k));
  if(b.sub){ const sp=Math.max(2,Math.min(Math.round(bp*0.45),Math.floor(W*0.9/Math.max(1,measureText(b.sub,1))))); drawText(uctx,b.sub,W/2,y+bp*6.5,sp,'hud','center',a*Math.min(1,b.t*4)); }
}
function drawBubble(){
  const B=G.bubble; if(!B||!GAME.commentator) return; const a0=GAME.commentator(), p=toScreen(a0.x,a0.y,a0.z);
  const tp=Math.max(2,Math.round(2.3*S)), tw=measureText(B.text,tp), pad=Math.round(8*S), w=tw+pad*2, h=tp*7+pad*2;
  const k=B.t<0.15?easeOutBack(B.t/0.15):1, a=B.t>B.dur-0.25?(B.dur-B.t)/0.25:1; if(a<=0) return;
  let x=p.x-w-Math.round(6*S), y=p.y-h-Math.round(6*S); x=clamp(x,SAFE.l+6,W-SAFE.r-w-6); y=clamp(y,SAFE.t+Math.round(60*S),H-h-6);
  const c=uctx, bw=Math.max(2,Math.round(2*S)); c.globalAlpha=a; c.save(); c.translate(x+w,y+h); c.scale(k,k); c.translate(-(x+w),-(y+h));
  c.fillStyle=PAL.ink; c.fillRect(Math.round(x-bw),Math.round(y-bw),w+bw*2,h+bw*2);
  const tx=clamp(p.x,x+w*0.5,x+w-bw*3); for(let i=0;i<3;i++) c.fillRect(Math.round(tx-(3-i)*bw*1.5),Math.round(y+h+i*bw*1.4),Math.round((3-i)*bw*1.5)+bw,Math.round(bw*1.6));
  c.fillStyle='#FFFFFF'; c.fillRect(Math.round(x),Math.round(y),w,h); c.fillStyle='#DDEBF1'; c.fillRect(Math.round(x),Math.round(y+h-bw),w,bw);
  c.restore(); c.globalAlpha=1; drawText(c,B.text,x+w/2,y+h/2,tp,'ink','center',a);
}
function drawPopups(){ for(const p of G.popups){ const s=toScreen(p.x,p.y+p.t*1.4,p.z), px=p.px||Math.max(2,Math.round((p.style==='gold'?2.8:2.4)*S)), k=p.t<0.12?easeOutBack(p.t/0.12):1;
  const hw=measureText(p.text,px)/2+px*2, x=clamp(s.x,SAFE.l+hw,W-SAFE.r-hw), y=clamp(s.y,SAFE.t+110*S,H-SAFE.b-20*S);
  drawText(uctx,p.text,x,y,px,p.style,'center',p.t>p.dur-0.25?(p.dur-p.t)/0.25:1,Math.max(0.01,k)); } }
function drawFlash(){ if(G.flash<=0) return; const c=uctx,t=Math.round(16*S); c.fillStyle='rgba(224,56,59,'+(G.flash*0.55).toFixed(3)+')'; c.fillRect(0,0,W,t); c.fillRect(0,H-t,W,t); c.fillRect(0,0,t,H); c.fillRect(W-t,0,t,H); }
function drawUI(){
  UI.buttons.length=0; uctx.clearRect(0,0,W,H);
  if(GAME.drawOverlay) GAME.drawOverlay(); drawPopups(); drawBubble();
  if(G.state==='title') drawTitle(); else if(G.state==='play'||G.state==='dying'||G.state==='paused') drawHUD();
  if(G.state==='over') drawOver(); drawBanner(); drawFlash(); if(G.state==='paused') drawPause();
}

/* ==========================================================================
   SHARED INPUT & LOOP
   ========================================================================== */
const Input={left:false,right:false,keys:0};
function onButton(id){
  AudioKit.click();
  if(id==='play'||id==='again') startGame(PARAMS.has('wave')?Math.max(1,parseInt(PARAMS.get('wave'))||1):1);
  else if(id==='pause') pause(); else if(id==='resume') resume(); else if(id==='restart'){ resume(); startGame(1); }
  else if(id==='home'){ if(G.state==='paused') resume(); toTitle(); }
  else if(id==='map'&&HOME_URL) location.href=HOME_URL;
  else if(id==='sound'){ AudioKit.init(); AudioKit.setMuted(!AudioKit.muted); if(!AudioKit.muted) AudioKit.startMusic(); }
}
function resize(){
  W=innerWidth; H=innerHeight; DPR=Math.min(window.devicePixelRatio||1,2); readSafe();
  ui.width=Math.round(W*DPR); ui.height=Math.round(H*DPR); uctx.setTransform(DPR,0,0,DPR,0,0); uctx.imageSmoothingEnabled=false;
  renderer.setPixelRatio(DPR); renderer.setSize(W,H,false); S=clamp(Math.min(W,H)/380,0.8,1.7); GAME.layout();
}
/* ==========================================================================
   SHARED GAMEPLAY HELPERS
   Anything two games need goes HERE, not copy-pasted between game files.
   (tests/test_design.py fails if a helper name is defined in two game files.)
   ========================================================================== */
// weighted random choice: pickWeighted({a:2,b:1}) -> 'a' about two thirds of the time
function pickWeighted(w){ let tot=0; for(const k in w) tot+=w[k]; let r=Math.random()*tot; for(const k in w){ r-=w[k]; if(r<=0) return k; } return Object.keys(w)[0]; }
// finger X on screen -> world X on the plane z=Z, measured at the height of a reference point (the thing being dragged)
const _sp={ray:new THREE.Raycaster(),ndc:new THREE.Vector2(),plane:new THREE.Plane(new THREE.Vector3(0,0,1),0),hit:new THREE.Vector3(),v:new THREE.Vector3()};
function screenToPlaneX(sx,refX,refY,z,fallback){ _sp.v.set(refX,refY,z).project(camera); _sp.ndc.set((sx/W)*2-1,_sp.v.y); _sp.ray.setFromCamera(_sp.ndc,camera);
  _sp.plane.constant=-z; return _sp.ray.ray.intersectPlane(_sp.plane,_sp.hit)?_sp.hit.x:fallback; }
// a load hanging from a trolley that chases tx: pendulum swing + damping + wind (Shine Crew gondola, Frame Builder hook)
function makeSwing(o){ return Object.assign({ax:0,vx:0,tx:0,th:0,om:0,x:0,y:0,L:8,anchorY:10,wind:0,damp:2.3,lim:6,maxV:15,maxA:45,couple:0.5,thMax:0.45},o); }
function stepSwing(s,gdt){ s.tx=clamp(s.tx,-s.lim,s.lim);
  const want=clamp((s.tx-s.ax)*5,-s.maxV,s.maxV), nv=s.vx+clamp(want-s.vx,-s.maxA*gdt,s.maxA*gdt), acc=gdt>0?(nv-s.vx)/gdt:0;
  s.vx=nv; s.ax=clamp(s.ax+s.vx*gdt,-s.lim,s.lim);
  const L=Math.max(0.5,s.L), a=-(9.8/L)*Math.sin(s.th)-s.damp*s.om-(acc/L)*Math.cos(s.th)*s.couple+s.wind/L;
  s.om+=a*gdt; s.th+=s.om*gdt; if(Math.abs(s.th)>s.thMax){ s.th=Math.sign(s.th)*s.thMax; s.om*=-0.3; }
  s.x=s.ax+L*Math.sin(s.th); s.y=s.anchorY-L*Math.cos(s.th); }
// telegraphed wind gusts: 0.9 s warning (streaks + onWarn), then a 1.4 s sine-shaped push. Returns the wind force.
function makeGusts(o){ return Object.assign({t:6,warn:0,gust:0,dir:1},o); }
function stepGusts(g,gdt,live,o){   // o: {every, strength, scale, onWarn(dir), streak(dir,n)}
  if(live&&g.gust<=0&&g.warn<=0){ g.t-=gdt; if(g.t<=0){ g.warn=0.9; g.dir=Math.random()<0.5?-1:1; if(o.onWarn) o.onWarn(g.dir); } }
  if(g.warn>0){ g.warn-=gdt; if(gdt>0&&o.streak) o.streak(g.dir,1); if(g.warn<=0){ g.gust=1.4; g.t=o.every+rand(-1,1.5); AudioKit.swish(); } }
  if(g.gust>0){ g.gust-=gdt; if(gdt>0&&o.streak) o.streak(g.dir,2); return g.dir*o.strength*o.scale*Math.sin(Math.PI*clamp(1-g.gust/1.4,0,1)); }
  return 0; }
// white wind streaks racing across the screen (fx = the world's Particles)
function windStreaks(fx,dir,n,halfW,y0,halfH,colors){ for(let i=0;i<n;i++) fx.emit(-dir*(halfW+1),y0+rand(-halfH,halfH),3.5,{count:1,colors:colors||['#FFFFFF','#DDF3FB'],speed:0.2,up:0,upRand:0,vx:dir*25,size:0.09,life:0.9,grav:0,drag:0}); }

const Kit={
  run(game){
    GAME=game; AudioKit.song=game.music; renderer.setClearColor(game.meta.clear,1);
    game.key=k=>'game-in-dubai:'+game.meta.id+':'+k;
    const stage=document.getElementById('stage');
    const ptrs=new Set();
    const releaseAll=()=>{ UI.pressed=null; for(const id of ptrs){ try{ if(GAME.pointerUp) GAME.pointerUp(-1,-1,id); }catch(e){} } ptrs.clear(); };
    stage.addEventListener('pointerdown',e=>{ e.preventDefault(); Loop.kick();
      const b=hitButton(e.clientX,e.clientY);
      try{ AudioKit.init(); if(!AudioKit.muted) AudioKit.startMusic(); }catch(err){}
      if(b){ UI.pressed=b.id; Loop.nudge(); return; }
      ptrs.add(e.pointerId); if(G.state==='play'&&GAME.pointerDown) GAME.pointerDown(e.clientX,e.clientY,e.pointerId); },{passive:false});
    stage.addEventListener('pointermove',e=>{ if(G.state==='play'&&GAME.pointerMove) GAME.pointerMove(e.clientX,e.clientY,e.pointerId); },{passive:true});
    const end=e=>{ ptrs.delete(e.pointerId); if(UI.pressed){ const b=hitButton(e.clientX,e.clientY), id=UI.pressed; UI.pressed=null; if(b&&b.id===id){ onButton(id); Loop.nudge(); } }
      if(GAME.pointerUp) GAME.pointerUp(e.clientX,e.clientY,e.pointerId); };
    stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',e=>{ ptrs.delete(e.pointerId); UI.pressed=null; if(GAME.pointerUp) GAME.pointerUp(e.clientX,e.clientY,e.pointerId); });
    stage.addEventListener('contextmenu',e=>e.preventDefault()); document.addEventListener('gesturestart',e=>e.preventDefault());
    addEventListener('keydown',e=>{ if(e.repeat) return; const k=e.key;
      if(k==='ArrowLeft'||k==='a'||k==='A') Input.left=true; if(k==='ArrowRight'||k==='d'||k==='D') Input.right=true;
      if(k===' '||k==='Enter'){ AudioKit.init(); if(G.state==='title') onButton('play'); else if(G.state==='over') onButton('again'); else if(G.state==='paused') onButton('resume'); }
      if(k==='p'||k==='P'||k==='Escape'){ if(G.state==='play') pause(); else if(G.state==='paused') resume(); }
      if(k==='m'||k==='M') onButton('sound'); Input.keys=(Input.right?1:0)-(Input.left?1:0); });
    addEventListener('keyup',e=>{ const k=e.key; if(k==='ArrowLeft'||k==='a'||k==='A') Input.left=false; if(k==='ArrowRight'||k==='d'||k==='D') Input.right=false; Input.keys=(Input.right?1:0)-(Input.left?1:0); });
    // app lifecycle (phones, installed app): pause + let go of fingers when hidden, restart the frame loop when back
    const away=()=>{ releaseAll(); if(G.state==='play') pause(); else AudioKit.suspend(); };
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) away(); else Loop.back(); });
    addEventListener('pagehide',away); addEventListener('pageshow',()=>{ releaseAll(); Loop.back(); });
    addEventListener('blur',releaseAll); addEventListener('focus',()=>Loop.kick());
    // phones may drop the 3D context while the app is in the background: recover by reloading (scores are saved)
    glCanvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); Loop.glLost=true; Loop.glLostAt=performance.now(); if(G.state==='play') pause(); },false);
    glCanvas.addEventListener('webglcontextrestored',()=>location.reload(),false);
    game.build(); addEventListener('resize',resize); addEventListener('orientationchange',()=>setTimeout(resize,150)); resize(); toTitle();
    const bootEl=document.getElementById('boot'); if(bootEl) bootEl.remove();
    try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){} // ask the browser to keep best scores
    Store.get(game.key('best')).then(v=>{ G.best=parseInt(v)||0; }); if(game.load) game.load(); Top.load();
    const PROF=DEBUG?{n:0,logic:0,render:0,ui:0}:null, DTMAX=DEBUG?0.1:0.05; let last=performance.now();
    if(DEBUG) window.__game=Object.assign({G,GAME,startGame,loseLife,pause,PROF,Tint,Top,Loop},game.debug||{});
    let errN=0, fails=0; const seen=new Set();
    const report=err=>{ if(errN++<3) console.error(err); const d=String((err&&err.message)||err).slice(0,120);
      if(!seen.has(d)){ seen.add(d); Track.ev('exception',{description:d,fatal:false,game_id:GAME.meta.id,state:G.state}); } };
    function step(now){
      Loop.lastStep=performance.now(); const dt=Math.min(DTMAX,Math.max(0,(now-last)/1000)); last=now; const t0=performance.now(); let t1=t0,t2=t0;
      try{
        G.t+=dt; G.flash=Math.max(0,G.flash-dt*2.2); G.shake=Math.max(0,G.shake-dt); G.lifeLostT=Math.max(0,G.lifeLostT-dt); G.sayCd=Math.max(0,(G.sayCd||0)-dt);
        const paused=G.state==='paused';
        if(!paused){ if(G.banner){ G.banner.t+=dt; if(G.banner.t>G.banner.dur) G.banner=null; }
          for(const p of G.popups) p.t+=dt; G.popups=G.popups.filter(p=>p.t<p.dur);
          if(G.bubble){ G.bubble.t+=dt; if(G.bubble.t>G.bubble.dur) G.bubble=null; }
          if(G.state==='play'){ G.grace=Math.max(0,G.grace-dt*G.timeScale); G.x2=Math.max(0,G.x2-dt); }
          if(G.state==='dying'){ G.dieT+=dt; if(G.dieT>1.3) finishGameOver(); } }
        const gdt=paused?0:dt*G.timeScale; GAME.update(gdt,paused?0:dt);
        Tint.v+=(Tint.target-Tint.v)*Math.min(1,dt*3); for(const w of WORLD_MATS) w.m.color.setScalar(w.base*Tint.v);
        GAME.animate(gdt,paused?0:dt); fails=0;
      }catch(err){ report(err);
        if(++fails>=30&&(G.state==='play'||G.state==='dying')){ fails=0;   // logic keeps failing: end the run cleanly instead of freezing
          Track.ev('exception',{description:'run ended after repeated errors',fatal:true,game_id:GAME.meta.id});
          try{ G.lives=0; finishGameOver(); }catch(e2){ try{ GAME.reset(); }catch(e3){} G.state='over'; } } }
      t1=performance.now();
      if(!Loop.glLost){ try{ if(G.shake>0) camera.position.set(CamBase.x+rand(-1,1)*G.shake*0.5,CamBase.y+rand(-1,1)*G.shake*0.4,CamBase.z); else camera.position.copy(CamBase);
        renderer.render(scene,camera); }catch(err){ report(err); } }
      t2=performance.now();
      try{ drawUI(); }catch(err){ report(err); }
      try{ AudioKit.pumpMusic(); }catch(err){}
      if(PROF){ PROF.n++; PROF.logic+=t1-t0; PROF.render+=t2-t1; PROF.ui+=performance.now()-t2; }
    }
    function loop(now){ Loop.id=requestAnimationFrame(loop); Loop.rafAt=performance.now(); step(now); }
    Object.assign(Loop,{
      kick(){ if(document.hidden) return; if(performance.now()-Loop.rafAt>300){ cancelAnimationFrame(Loop.id); Loop.id=requestAnimationFrame(loop); if(!Loop.fb) Loop.fb=setTimeout(fbTick,16); } },
      nudge(){ if(performance.now()-Loop.lastStep>60) step(performance.now()); },       // redraw right away if frames are late
      back(){ Loop.kick(); if(Loop.glLost) Loop.glLostAt=performance.now(); } });
    function fbTick(){ Loop.fb=0; if(document.hidden||performance.now()-Loop.rafAt<200) return; step(performance.now()); Loop.fb=setTimeout(fbTick,16); }
    setInterval(()=>{ if(document.hidden) return; if(performance.now()-Loop.rafAt>600) Loop.kick();
      if(Loop.glLost&&performance.now()-Loop.glLostAt>2000) location.reload(); },400);   // 3D context gone for good: reload (scores are saved)   // watchdog: rAF can stall after resume on iOS home-screen apps
    Loop.id=requestAnimationFrame(loop);
  }
};
