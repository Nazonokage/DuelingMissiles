import { createHeldInput, bindHoldButton } from './game/input.js';
import { ImpactCamera } from './camera/impact-camera.js';
import { FixedStepper, seededRandom } from './game/simulation.js';
import { COUNTRIES, country, flagCanvas } from './cosmetics/countries.js';
import { PRESETS } from './field/quality.js';
import { driftRate, driftLauncher } from './game/missile-drift.js';
import * as THREE from 'three';
import { MusicManager } from './audio/music-manager.js';
import { createCameraControls, CAMERA_DEFAULTS } from './camera/touch-look.js';

const THEMES={
 paper:{bg:0xefe4c8,ground:0xf3ead2,grid:0xd9cba6,ink:0x2b2118,wall:0xb08d57,team:[0x3b5b8c,0x9c3b2e],css:['#efe4c8','#2b2118']},
 blueprint:{bg:0x1c3d6e,ground:0x234a82,grid:0x3a66a8,ink:0xdfeaff,wall:0x2f5d9e,team:[0xffd54a,0xff7a7a],css:['#1c3d6e','#dfeaff']},
 night:{bg:0x0d0f1a,ground:0x151828,grid:0x24294a,ink:0xe8f0ff,wall:0x2a2f55,team:[0x36e0c2,0xff4fa3],css:['#0d0f1a','#e8f0ff']}};
const FACTION_THEMES={
  'panzer-vor':{label:'Panzer Vor',url:'/music/Girls und panzer ost Panzer Vor.mp3',context:'Girls und Panzer OST'},
  'erika':{label:'Erika',url:'/music/Girls Und Panzer OST_ Erika.mp3',context:'Girls und Panzer OST'},
  'funiculi':{label:'Funiculi Funicula',url:'/music/Girls Und Panzer OST_ Funiculi Funicula.mp3',context:'Girls und Panzer OST'},
  'fiamme-nere':{label:'Le Fiamme Nere',url:'/music/Girls Und Panzer OST_ Le Fiamme Nere.mp3',context:'Girls und Panzer OST'},
  'panzerlied':{label:'Panzerlied',url:'/music/Girls Und Panzer OST_ Panzerlied.mp3',context:'Girls und Panzer OST'},
  'republic-sanka':{label:'Republic Sanka',url:'/music/Girls Und Panzer OST_ Republic Sanka.mp3',context:'Girls und Panzer OST'},
  'chanson-oignon':{label:"Chanson de l'Oignon",url:"/music/French March_ Chanson de l'Oignon - Song of the Onion (Instrumental) [C7CPMDo-NO0].mp3",context:'French March'},
  'soviet-march':{label:'Soviet March',url:'/music/Soviet March - 1980\'s Soviet Army [Red Alert 3] [t-VbAZcyZ_U].mp3',context:'Red Alert 3'},
  'polkka':{label:'Säkkijärven Polkka',url:'/music/S\u00e4kkij\u00e4rven Polkka.mp3',context:'Finnish folk march'},
  none:{label:'None',url:'',context:'Music disabled'}
};
const cfg={n:5,hp:2,theme:'paper',p1theme:'panzer-vor',p2theme:'erika',p1country:'italy',p2country:'france',particles:true,shake:true,sfx:true,colorSafe:false,cosmetics:true,quality:'auto'};
document.querySelectorAll('#setup [data-k]').forEach(b=>b.onclick=()=>{
  cfg[b.dataset.k]=isNaN(b.dataset.v)?b.dataset.v:+b.dataset.v;
  b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
  if(b.dataset.k==='theme'){const T=THEMES[cfg.theme].css,s=document.documentElement.style;s.setProperty('--paper',T[0]);s.setProperty('--ink',T[1])}});
document.getElementById('go').onclick=start;

const TCH=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
let RM=matchMedia('(prefers-reduced-motion: reduce)').matches;const pmc={},pm=c=>pmc[c]||(pmc[c]=new THREE.MeshBasicMaterial({color:c}));
// Mobile-first quality defaults: decorative effects give way before controls or readability.
const DEVICE_MEMORY=navigator.deviceMemory||4;
const QUALITY=(TCH||DEVICE_MEMORY<=2)?{pixelRatio:1.25,maxParts:150,antialias:false}:DEVICE_MEMORY<=4?{pixelRatio:1.5,maxParts:220,antialias:true}:{pixelRatio:2,maxParts:280,antialias:true};
const impact=new ImpactCamera(),stepper=new FixedStepper();let gameplayRandom=seededRandom(2026),pendingEnd=false;
const impactLook=new THREE.Vector3();
const cinemaEnabled=()=>!dirOn&&!heatOn;
const MEMES = {
  'DIRECT HIT': ['Ballistics has left the chat!', 'Bullseye!', 'Maximum paper damage!'],
  'HIT': ['Direct impact!', 'Armor dented!'],
  'MISSED': ['Gravity was optional.', 'Terrain recalculated.', 'Nice try!'],
  'CHAIN REACTION': ['Boom goes the paper!', 'Domino effect!'],
  'LAST LAUNCHER': ['Final stand activated!', 'Hold the line!']
};
// css class map per event type → colour accent
const ANN_CLS={'DIRECT HIT':'direct','HIT':'hit','MISSED':'miss','CHAIN REACTION':'chain','LAST LAUNCHER':'last'};
function feed(text){
  // MOBA top-centre announcement
  const ann=document.getElementById('announce');
  const div=document.createElement('div');div.className='ann '+(ANN_CLS[text]||'');
  const memeList=MEMES[text];
  div.textContent=text+(memeList?' — '+memeList[Math.floor(Math.random()*memeList.length)]:'');
  ann.prepend(div);setTimeout(()=>div.remove(),2200);
  // also keep small side log
  const el=document.getElementById('event-feed');const row=document.createElement('div');
  row.textContent=text;row.dataset.until=String(performance.now()+4000);el.prepend(row);while(el.children.length>3)el.lastChild.remove()
}
// Update wind HUD arrow to show wind direction & strength each turn
function updateWindHUD(){
  const ax=document.getElementById('wind-arrow'),lb=document.getElementById('wind-label');if(!ax)return;
  const str=Math.sqrt(wind.x*wind.x+wind.z*wind.z);
  const deg=Math.atan2(wind.x,wind.z)*180/Math.PI; // rotate CSS arrow to point in world direction
  ax.style.transform='rotate('+deg.toFixed(0)+'deg)';
  const lvl=str<0.04?'Calm':str<0.09?'Light':str<0.15?'Moderate':'Strong';
  lb.textContent=lvl.toUpperCase();
  ax.textContent=str<0.02?'·':'↑'; // dot if calm, arrow otherwise
}

const G=18,DARK=new THREE.Color(0x222222);
let T,INK,TEAM,cannons,marker,tg,trail;
const PTS=60,scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,520);
const renderer=new THREE.WebGLRenderer({antialias:QUALITY.antialias,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,QUALITY.pixelRatio));renderer.setSize(innerWidth,innerHeight);
document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x998877,0.9));
const sun=new THREE.DirectionalLight(0xffffff,0.6);sun.position.set(10,20,8);scene.add(sun);

const ink=m=>{m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:INK})));return m};
const FW=50,wallZ=(s,x)=>s*(78-6*(1-(x/FW)**2));   // fort: 50 half-width, 78 away
const stEl=document.getElementById('st'),hintEl=document.getElementById('hint'),pwEl=document.querySelector('#pw i');
function hint(t,ms){hintEl.textContent=t;hintEl.style.opacity=.75;if(ms)setTimeout(()=>hintEl.style.opacity=0,Math.min(ms,3000))}

// state
let turn=0,sel=2,state='aiming',charging=false,t0=0,mx=0,my=.5,timer=0,shake=0,msel=null,first=true,bird=0,bs=1,over=false,ball=null;
let hitstop=0,gMode='auto',gT=3,gLast='';
function toggleGuide(){gMode=gMode==='pinned'||gMode==='auto'&&gT>0?'off':'pinned'}
const K={l:0,r:0},fx=[],camP=new THREE.Vector3(),camL=new THREE.Vector3(),balls=[],parts=[],lastB=new THREE.Vector3(),tmpT=new THREE.Vector3();
// Camera orbit is presentation-only. shotAim remains authoritative for projectile physics.
const cameraRig={...CAMERA_DEFAULTS};
const BIRD_DEFAULTS={yaw:0,pitch:1.3,distance:95,manual:false};
const birdRig={...BIRD_DEFAULTS};
const fwd=()=>turn===0?-1:1,rgt=()=>turn===0?1:-1,mine=()=>cannons[turn],alive=t=>cannons[t].filter(c=>c.hp>0);
const usable=c=>c&&c.hp>0&&!c.locked;

function start(){
  RM=document.getElementById('reduced-motion').checked;
  for(const key of ['particles','shake','sfx','cosmetics'])cfg[key]=document.getElementById(key).checked;
  cfg.colorSafe=document.getElementById('color-safe').checked;cfg.quality=document.getElementById('quality').value;
  if(PRESETS[cfg.quality])Object.assign(QUALITY,PRESETS[cfg.quality]);
  renderer.setPixelRatio(pr=Math.min(devicePixelRatio,QUALITY.pixelRatio));
  gameplayRandom=seededRandom(Number(document.getElementById('seed').value)||0);stepper.reset();
  music.refresh();
  T=THEMES[cfg.theme];INK=T.ink;TEAM=cfg.colorSafe?[0x0072b2,0xe69f00]:cfg.cosmetics?[country(cfg.p1country).color,country(cfg.p2country).color]:T.team;
  scene.background=new THREE.Color(T.bg);scene.fog=new THREE.Fog(T.bg,240,480);
  const gr=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshLambertMaterial({color:T.ground}));
  gr.rotation.x=-Math.PI/2;scene.add(gr);
  const gd=new THREE.GridHelper(500,250,T.grid,T.grid);gd.position.y=.02;scene.add(gd);
  // WW1/WW2 Historical Fortification Wall System
  const sandbagMat = new THREE.MeshLambertMaterial({color: 0xc8b28a});
  const woodMat = new THREE.MeshLambertMaterial({color: 0x4a3728});
  const steelMat = new THREE.MeshLambertMaterial({color: 0x444855});
  for(const s of [1,-1])for(let x=-FW;x<FW;x+=4){
    const x1=Math.min(x+4,FW),z0=wallZ(s,x),z1=wallZ(s,x1),dx=x1-x,dz=z1-z0,len=Math.hypot(dx,dz);
    const angle=Math.atan2(-dz,dx), midX=(x+x1)/2, midZ=(z0+z1)/2;
    // Base concrete/stone trench wall block
    const m=ink(new THREE.Mesh(new THREE.BoxGeometry(len+.1,1.2,1),new THREE.MeshLambertMaterial({color:T.wall})));
    m.position.set(midX,.6,midZ);m.rotation.y=angle;scene.add(m);
    // Trench crenellation embrasures along top
    for(const k of [-0.3, 0.3]){
      const cren=ink(new THREE.Mesh(new THREE.BoxGeometry(len*.28,.35,.9),new THREE.MeshLambertMaterial({color:T.wall})));
      cren.position.set(midX + Math.cos(angle)*k*len, 1.35, midZ - Math.sin(angle)*k*len);
      cren.rotation.y=angle;scene.add(cren);
    }
    // Sandbag parapets along upper rim
    for(let sb=-0.4;sb<=0.4;sb+=0.38){
      const sandbag=ink(new THREE.Mesh(new THREE.BoxGeometry(len*.32,.22,.45),sandbagMat));
      sandbag.position.set(midX+Math.cos(angle)*sb*len, 1.25, midZ-Math.sin(angle)*sb*len + s*.35);
      sandbag.rotation.y=angle+(sb*0.2);scene.add(sandbag);
    }
    // Wooden trench support posts
    for(let wp=-0.35;wp<=0.35;wp+=0.7){
      const post=ink(new THREE.Mesh(new THREE.BoxGeometry(.18,1.4,.18),woodMat));
      post.position.set(midX+Math.cos(angle)*wp*len, .7, midZ-Math.sin(angle)*wp*len - s*.52);
      post.rotation.y=angle;scene.add(post);
    }
    // Czech Hedgehogs (WW2 anti-tank steel cross obstacles)
    if(Math.abs(x) < 8 || Math.abs(x) > FW - 8){
      const hhGroup = new THREE.Group();
      for(let b=0;b<3;b++){
        const beam = ink(new THREE.Mesh(new THREE.BoxGeometry(.14,.14,1.6),steelMat));
        beam.rotation.set(b===0?.78:0, b===1?.78:0, b===2?.78:.78);
        hhGroup.add(beam);
      }
      hhGroup.position.set(midX, .6, midZ + s * 3.5);
      hhGroup.scale.setScalar(0.9);
      scene.add(hhGroup);
    }
  }
  cannons=[[],[]];sel=cfg.n>>1;
  for(let i=0;i<cfg.n;i++){const x=-(FW-5)+2*(FW-5)*i/(cfg.n-1);
    for(const t of [0,1]){
      const s=t?-1:1,z=wallZ(s,x),col=TEAM[t],g=new THREE.Group();g.position.set(x,1.2,z);g.scale.setScalar(1.3);
      const base=ink(new THREE.Mesh(new THREE.BoxGeometry(1.8,.8,1.6),new THREE.MeshLambertMaterial({color:col})));base.position.y=.4;g.add(base);
      const pivot=new THREE.Group();pivot.position.y=1;pivot.rotation.order='YXZ';g.add(pivot);
      const bg=new THREE.CylinderGeometry(.28,.38,2.2,12);bg.rotateX(-Math.PI/2);bg.translate(0,0,-1.1);
      const barrel=ink(new THREE.Mesh(bg,new THREE.MeshLambertMaterial({color:col})));pivot.add(barrel);
      pivot.rotation.y=t?Math.PI:0;pivot.rotation.x=.25;scene.add(g);
      
      // Team military helmet on launcher piece (toaddup.md item 2)
      const pieceHelmetMat = new THREE.MeshLambertMaterial({color:col});
      const pieceHelmetGroup = new THREE.Group();
      const pieceDome = ink(new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 8, 0, Math.PI*2, 0, Math.PI*.58), pieceHelmetMat));
      pieceDome.position.y = .18;
      const pieceBrim = ink(new THREE.Mesh(new THREE.CylinderGeometry(.46, .4, .07, 12), pieceHelmetMat));
      pieceBrim.position.y = .14;
      const pieceBand = ink(new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .04, 12), new THREE.MeshLambertMaterial({color: INK})));
      pieceBand.position.y = .18;
      pieceHelmetGroup.add(pieceDome, pieceBrim, pieceBand);
      pieceHelmetGroup.position.set(.45, .82, .3);
      base.add(pieceHelmetGroup);

      cannons[t].push({t,g,pivot,barrel,mats:[base.material,barrel.material,pieceHelmetMat],base:col,hp:cfg.hp,recoil:0,cool:0,locked:false,x,z,hit:new THREE.Vector3(x,2.6,z)})}}
  marker=new THREE.Mesh(new THREE.ConeGeometry(.4,.9,4),new THREE.MeshBasicMaterial({color:INK}));marker.rotation.x=Math.PI;scene.add(marker);
  tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PTS*3),3));
  trail=new THREE.Line(tg,new THREE.LineDashedMaterial({color:INK,dashSize:.5,gapSize:.35}));trail.frustumCulled=false;scene.add(trail);
  cannons.flat().forEach(c=>{const d=document.createElement('div');d.className='bar';d.innerHTML='<div class="hr"><span class="pips"></span><span class="rl"><i></i></span></div>';
    document.getElementById('bars').appendChild(d);c.bar=d;c.pips=d.querySelector('.pips');for(let k=0;k<2;k++)c.pips.appendChild(document.createElement('span'));d.style.setProperty('--pc','#'+c.base.toString(16).padStart(6,'0'));c.cdi=d.querySelector('.rl i')});
  scenery();
  document.getElementById('setup').style.display='none';document.body.classList.remove('intro');
  startTurn();hint('Keys: ◀▶ / A D angle (one side, one hold) · hold Space to charge, release to fire · 1-9 / Q / E pick cannon · M take over a missile · F2 director · RED = locked',12000);
  loop();
}

function paint(c){const k=(cfg.hp-c.hp)/cfg.hp*.7;
  c.mats.forEach(m=>{m.color.setHex(c.base).lerp(DARK,k);m.transparent=true;m.opacity=(c.locked||c.cool>0)?.4:1})}
function mkMissile(o){const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1.2,8).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:TEAM[o]})),
        new THREE.Mesh(new THREE.ConeGeometry(.22,.5,8).rotateX(Math.PI/2).translate(0,0,.85),new THREE.MeshLambertMaterial({color:INK})));
  g.scale.setScalar(1.6);g.userData.o=o;scene.add(g);return g}

const aimDir=()=>{const a=A.yaw,p=A.pitch,cp=Math.cos(p);return new THREE.Vector3(rgt()*Math.sin(a)*cp,Math.sin(p),fwd()*Math.cos(a)*cp)};
const speed=pw=>22+pw*44;   // reaches the farther fort
function sim(start,dir,v){const pts=[],p=start.clone(),vel=dir.clone().multiplyScalar(v);
  for(let i=0;i<100;i++){pts.push(p.clone());vel.y-=G*.06;p.addScaledVector(vel,.06);if(p.y<.3)break}return pts}
const muzzle=(c,dir)=>c.g.position.clone().add(new THREE.Vector3(0,1.3,0)).addScaledVector(dir,2.9);

function puff(pos,n,col,spd,up=3,life=.9){
  if(!cfg.particles)return;
  n=Math.min(n,Math.max(0,QUALITY.maxParts-parts.length));
  for(let i=0;i<n;i++){const m=new THREE.Mesh(puff.g||(puff.g=new THREE.SphereGeometry(.2,6,6)),pm(col));
    m.position.copy(pos);scene.add(m);
    parts.push({m,v:new THREE.Vector3((Math.random()-.5)*spd,Math.random()*spd*.6+up*.3,(Math.random()-.5)*spd),life:life*(.6+Math.random()*.6),max:life})}}

function startTurn(){held.clear();cameraControls.reset();birdControls.reset();sfx.turn();music.setTurn(turn);wind.set((Math.random()-0.5)*0.2,0,(Math.random()-0.5)*0.2);updateWindHUD(); // random gentle wind each turn
  const L=mine();L.forEach(c=>{c.locked=c.cool>0;c.cool=Math.max(0,c.cool-1);paint(c)});
  if(!usable(L[sel])){const u=L.findIndex(usable);if(u>=0)sel=u}
  L.forEach(c=>{if(c.aim)c.aim.yd=c.aim.pd=0});resetAim();buildChips();state='moving';timer=1.4;
  const l=document.getElementById('label');l.textContent='PLAYER '+(turn+1);l.style.color='#'+TEAM[turn].toString(16).padStart(6,'0');l.style.opacity=1;
  setTimeout(()=>l.style.opacity=0,1800);
  if(!L.some(usable)&&!balls.some(b=>b.userData.o===turn)){state='wait';timer=1.6;l.textContent+=' – reloading'}
}
function cycle(d){if(!cannons)return;saveAim();const L=mine();let i=sel;
  for(let k=0;k<L.length;k++){i=(i+d*rgt()+L.length)%L.length;if(usable(L[i])){sel=i;break}}}
function fire(pw){const c=mine()[sel];if(!usable(c))return;saveAim();stats.shots[turn]++;sfx.fire();
  const dir=aimDir(),pos=muzzle(c,dir),m=mkMissile(turn);m.position.copy(pos);
  c.recoil=1;c.cool=1;paint(c);
  ball={m,v:dir.multiplyScalar(speed(pw)),ctl:false,t:0,seed:gameplayRandom()*10,wobblePhase:Math.random()*Math.PI*2,wobbleFreq:5+Math.random()*3,wobbleAmp:0.06};ball.apexTime=Math.max(0,ball.v.y/G);state='flying';
  puff(pos,10,0x8a8a8a,4,2,.7);hintEl.style.opacity=0}
function takeover(b){msel=null;balls.splice(balls.indexOf(b),1);b.position.y=1.4;
  ball={m:b,ctl:true,psi:0,om:0,son:0,sdone:0,t:0,seed:Math.random()*10,wobblePhase:Math.random()*Math.PI*2,wobbleFreq:5+Math.random()*3,wobbleAmp:0.06,armed:false,boost:0,boosted:false};state='control';bs=fwd();lastB.copy(b.position);
  hint('Drag field to orbit · pinch/wheel to zoom · Aim: the first side you press is your only side, one hold · then FIRE to launch',6000)}

function damage(c,n=1){feed(n>1?'DIRECT HIT':'HIT');stats.hits[1-c.t]++;c.hp=Math.max(0,c.hp-n);if(n>1){sfx.hit();hint('DIRECT HIT · DOUBLE DAMAGE',1800);shake=Math.max(shake,RM?.2:1)}c.flash=1;hitstop=0;blast(c.hit,2.2);puff(c.hit,14,0xd9772b,7,4,.6);puff(c.hit,8,0x5a4126,9,5,1);
  if(c.hp<=0){c.g.visible=false;puff(c.hit,24,0x6b4b2a,10,6,1.2);
    const xm=new THREE.Group();
    for(const r of [.78,-.78]){const b=new THREE.Mesh(new THREE.BoxGeometry(3,.25,.4),new THREE.MeshBasicMaterial({color:0xe0452b}));b.rotation.z=r;xm.add(b)}
    xm.position.set(c.x,2.6,c.z);xm.rotation.y=c.t?Math.PI:0;scene.add(xm)}
  if(alive(c.t).length===1)feed('LAST LAUNCHER · P'+(c.t+1));
  paint(c)}
function blast(pos,r){sfx.boom();
  if(impact.trigger(pos,cam,impactLook,turn?-1:1,cinemaEnabled(),RM)){cameraControls.clear();birdControls.clear();held.clear();}   // expanding fireball + ground shockwave ring + camera shake
  const fb=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:.9}));
  fb.position.copy(pos);scene.add(fb);fx.push({m:fb,t:0,d:1.1,r});
  const rg=new THREE.Mesh(new THREE.RingGeometry(.85,1,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff8a3d,transparent:true,opacity:.8,side:THREE.DoubleSide}));
  rg.position.set(pos.x,.35,pos.z);scene.add(rg);fx.push({m:rg,t:0,d:1.35,r:r*1.5,ring:1});
  shake=Math.max(shake,Math.min(1,r/3.6)*(RM?.2:.9))}
function popMissile(m){feed('CHAIN REACTION');sfx.pop();const q=m.position.clone();heatAdd(q.x,q.z,turn,1.5);stats.pops++;scene.remove(m);const i=balls.indexOf(m);if(i>=0)balls.splice(i,1);
  blast(q,2.4);puff(q,16,0xd9772b,8,4,.7);puff(q,8,0x555555,5,4,1.1)}   // any resting missile (ally or enemy) explodes when touched
function boom(p,dc){blast(p,3.6);for(const m of balls.slice())if(m.position.distanceTo(p)<4)popMissile(m);   // chain reaction
 puff(p,30,0xd9772b,12,6,.8);puff(p,14,0x555555,6,5,1.4);
  for(const c of cannons.flat())if(c.hp>0&&Math.hypot(c.x-p.x,c.z-p.z)<3.6)damage(c,1)}   // recast missile: single damage (direct launcher shot = 2)
function land(hit){
  const b=ball,p=b.m.position;ball=null;heatAdd(p.x,p.z,turn,hit||b.ctl?2:1);
  if(b.ctl){boom(p,b.direct);scene.remove(b.m)}
  else if(hit){puff(p,10,0xd9772b,6,3,.6);scene.remove(b.m)}
  else{feed('MISSED');sfx.thud();puff(p,8,0x998866,3,2,.6);p.y=.3;b.m.lookAt(p.x+b.v.x,.3,p.z+b.v.z);b.m.children[0].material.emissive.setHex(TEAM[b.m.userData.o]);balls.push(b.m)}
  const d0=!alive(0).length,d1=!alive(1).length;
  if(d0||d1){over=true;state='over';held.clear();music.stop();cameraControls.clear();birdControls.clear();sfx.win();document.getElementById('endt').textContent=d0&&d1?'DRAW':'PLAYER '+(d1?1:2)+' WINS';
    pendingEnd=true;if(!impact.active){document.getElementById('end').style.display='flex';pendingEnd=false}return}
  state='wait';timer=1.6;
}
const dirOf=psi=>new THREE.Vector3(rgt()*Math.sin(psi),0,fwd()*Math.cos(psi));
function go(){ // SPACE/ENTER: first press launches, second press boosts straight (once)
  if(state!=='control'||!ball)return;const b=ball;
  if(!b.armed){sfx.whoosh();b.armed=true;b.rel=false;hint('TOUCH-MOVE: first side you press is your ONLY side · one hold to steer, release = steering locked; drift continues · FIRE again: boost',5000)}
  else if(!b.boosted){sfx.whoosh();b.boosted=true;b.boost=.9}}
function ctlStep(dt){
  const b=ball,p=b.m.position;lastB.copy(p);
  if(!b.armed){let ii=0;if(!b.pdn){if(!b.ps){if(K.r&&!K.l)b.ps=1;else if(K.l&&!K.r)b.ps=-1}
    ii=b.ps===1?K.r:b.ps===-1?-K.l:0;if(ii)b.pon=1;else if(b.pon){b.pdn=1;sfx.lock();hint('Aim locked · FIRE to launch',1500)}}   // touch-move: one side, one hold
    b.psi=Math.max(-1.2,Math.min(1.2,b.psi+ii*1.6*dt));const d=dirOf(b.psi);b.m.lookAt(p.x+d.x,p.y,p.z+d.z);return}
  b.t+=dt;const bo=b.boost>0;if(bo)b.boost-=dt;
  // touch-move: the first side you hold is the ONLY side allowed; hold = steer, release = locked straight
  if(!b.rel&&!K.l&&!K.r)b.rel=true;   // keys held while launching don't count
  if(b.rel&&!b.side){if(K.r&&!K.l){b.side=1;hint('Locked to RIGHT only',1500)}else if(K.l&&!K.r){b.side=-1;hint('Locked to LEFT only',1500)}}
  let inp=!b.rel?0:b.side===1?K.r:b.side===-1?-K.l:0;
  if(b.sdone||bo)inp=0;else if(inp)b.son=1;else if(b.son)b.sdone=1;
  b.om+=(inp*1.8-b.om)*(1-Math.exp(-dt*3));   // sluggish steering with inertia
  b.psi+=((bo?0:b.om)+(bo?0:driftRate(b.t,b.seed)))*dt;   // steering + drift that grows late
  const e=Math.min(b.t/1.6,1),sp0=5+17*e*e*(3-2*e),sp=bo?Math.max(sp0,16)*1.8:sp0;
  // wobble adds a small sinusoidal yaw offset
  const wob=Math.sin(b.wobblePhase + b.t * b.wobbleFreq) * b.wobbleAmp;
  const d=dirOf(b.psi + wob);
  // apply forward motion
  p.addScaledVector(d,sp*dt);
  // apply wind influence
  p.addScaledVector(wind,dt);
  b.m.lookAt(p.x+d.x,p.y,p.z+d.z);lastB.copy(p);
  if(Math.random()<dt*(bo?60:30))puff(p,1,bo?0xd9772b:0xaaaaaa,.4,.3,.5);
  let x=b.t>5.5||Math.abs(p.x)>108||Math.abs(p.z)>118;
  if(b.t>.5){
    const dc=cannons.flat().find(c=>c.hp>0&&Math.hypot(c.x-p.x,c.z-p.z)<1.9);if(dc)b.direct=dc;x=x||!!dc;
    const nb=balls.find(s=>s.position.distanceTo(p)<2);
    if(nb){popMissile(nb);hint('INTERCEPTED · BOOM',1500);x=true}}
  if(x)land(false);
}

// input: keyboard + on-screen keys only (no mouse)
const A={yaw:0,pitch:.5,yd:0,pd:0,yo:0,po:0};
function saveAim(){const c=cannons&&mine()[sel];if(c)c.aim={yaw:A.yaw,pitch:A.pitch,yd:A.yd,pd:A.pd}}   // each cannon remembers its own angle + lock
function resetAim(){if(!cannons)return;const a=mine()[sel].aim||{yaw:0,pitch:.5,yd:0,pd:0};A.yaw=a.yaw;A.pitch=a.pitch;A.yd=a.yd;A.pd=a.pd;A.yo=A.po=A.ys=A.ps=0;msel=null}
const myMs=()=>balls.filter(b=>b.userData.o===turn);
function cycleMsl(){if(!canCycle())return;const L=myMs();if(!L.length)return hint('No spent missile of yours on the field yet',2500);const i=L.indexOf(msel)+1;msel=i<L.length?L[i]:null;hint(msel?'Bird’s-eye: FIRE takes over the marked missile · M = next · after the last = back to cannons':'',msel?4500:1)}
const canCycle=()=>!!cannons&&!over&&!impact.active&&(state==='aiming'||state==='moving');
const KEYS={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r'};
function fireDown(){
  if(!cannons||over||impact.active)return;
  if(state==='control')return go();
  if(state!=='aiming'||charging)return;
  if(msel)return takeover(msel);
  if(usable(mine()[sel])){charging=true;t0=performance.now();chargeOn()}}
function fireUp(){chargeOff();if(charging&&state==='aiming'){charging=false;fire(Math.max(.05,Math.min(1,(performance.now()-t0)/1500)));pwEl.style.width='0'}charging=false}
addEventListener('keydown',e=>{
  if(!cannons||over||e.target.closest?.('input,select,textarea,[contenteditable]'))return;
  const kk=e.key.length===1?e.key.toLowerCase():e.key;
  if(e.code==='Space'||e.key==='Enter'){e.preventDefault();if(!e.repeat)held.press('fire',e.code||e.key);return}
  const k=KEYS[kk];if(k){e.preventDefault();held.press(k,e.code||e.key)}
  if(e.repeat)return;
  if(kk==='q'&&canCycle()){cycle(-1);resetAim();sfx.click()}
  if(kk==='e'&&canCycle()){cycle(1);resetAim();sfx.click()}
  if(/^[1-9]$/.test(e.key))pick(+e.key-1);
  if(kk==='m')cycleMsl();
  if(e.key==='F1'){e.preventDefault();toggleGuide()}
  if(kk==='h')toggleHeat();
  if(kk==='x')toggleSnd();
  if(e.key==='F2'){e.preventDefault();toggleDir()}});
addEventListener('keyup',e=>{
  const kk=e.key.length===1?e.key.toLowerCase():e.key;
  if(e.code==='Space'||e.key==='Enter'){held.release('fire',e.code||e.key);return}
  const k=KEYS[kk];if(k)held.release(k,e.code||e.key)});
function cancelCharge(){charging=false;chargeOff();pwEl.style.width='0'}
const held=createHeldInput(K,fireDown,fireUp,cancelCharge);
document.querySelectorAll('#pad [data-k]').forEach(b=>bindHoldButton(b,b.dataset.k,held));
document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;sfx.click();
  if(a==='msl')cycleMsl();else if(canCycle()){cycle(a==='next'?1:-1);resetAim()}});
const PB=[...document.querySelectorAll('#pad button')],chipsEl=document.getElementById('chips');let chipIdx=[];
function pick(k){if(!canCycle())return;const i=turn===0?k:cfg.n-1-k;if(cannons&&usable(mine()[i])){saveAim();sel=i;resetAim();sfx.click()}}
function buildChips(){chipsEl.innerHTML='';chipIdx=[];for(let k=0;k<cfg.n;k++){chipIdx.push(turn===0?k:cfg.n-1-k);const b=document.createElement('button');b.textContent=k+1;b.onclick=()=>pick(k);chipsEl.appendChild(b)}}
function toggleDir(){dirOn=!dirOn;document.getElementById('dir').style.display=dirOn?'block':'none'}
document.getElementById('dbtn').onclick=toggleDir;document.getElementById('hbtn').onclick=toggleGuide;
function layoutDoc(){return{schema:'missile-duel.layout',version:1,savedAt:new Date().toISOString(),launchers:cannons.flat().map(c=>({id:c.id,sourceId:'generated:launcher-row',kind:'launcher',team:c.t,position:{x:+c.x.toFixed(2),y:0,z:+c.z.toFixed(2)},facing:c.t?180:0,settings:{hp:cfg.hp}}))}}
document.getElementById('cp').onclick=()=>{try{navigator.clipboard.writeText(JSON.stringify(layoutDoc(),null,1))}catch(e){}hint('Layout JSON copied – a proposal, not applied to gameplay',3500)};
const fb=document.getElementById('fire');bindHoldButton(fb,'fire',held);
document.getElementById('kb').onclick=()=>{held.clear();document.getElementById('pad').classList.toggle('hide')};
if(!('ontouchstart' in window))document.getElementById('pad').classList.add('hide');
document.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const cameraControls=createCameraControls(renderer.domElement,cameraRig,()=>!!cannons&&!over&&!impact.active&&!msel&&!dirOn&&!heatOn&&bird<.002&&(state==='aiming'||state==='moving'),()=>innerHeight);
const birdControls=createCameraControls(renderer.domElement,birdRig,()=>!!cannons&&!over&&!impact.active&&!dirOn&&!heatOn&&(state==='control'||!!msel),()=>innerHeight,{defaults:BIRD_DEFAULTS,distance:[35,240],pitch:[.55,1.48]});
function resetCamera(){if(state==='control'||msel)birdControls.reset();else cameraControls.reset();hint('Camera reset',1200)}
document.getElementById('reset-camera').onclick=resetCamera;
addEventListener('keydown',e=>{if(cannons&&!over&&e.key.toLowerCase()==='c'&&!e.target.closest?.('input,select,textarea,[contenteditable]')){e.preventDefault();resetCamera()}});
addEventListener('blur',()=>{cameraControls.clear();birdControls.clear();held.clear();music.setHidden(true)});
addEventListener('focus',()=>music.setHidden(document.hidden));
document.addEventListener('visibilitychange',()=>{music.setHidden(document.hidden);if(document.hidden){cameraControls.clear();birdControls.clear();held.clear()}});

let clouds=[],birds=[],paperScraps=[],windsock,ring,dirOn=false;
// Global wind vector affecting missile flight (m/s per second)
let wind = new THREE.Vector3();
const AU={ctx:null,on:true,m:null,nb:null,lb:0,ch:null};
const music=new MusicManager(FACTION_THEMES);
document.getElementById('music-volume').oninput=e=>music.setVolume(Number(e.target.value));


function ac(){if(!AU.on||!cfg.sfx)return null;if(!AU.ctx){try{const C=window.AudioContext||window.webkitAudioContext;AU.ctx=new C();AU.m=AU.ctx.createGain();AU.m.gain.value=1.8;
  const cp=AU.ctx.createDynamicsCompressor();AU.m.connect(cp);cp.connect(AU.ctx.destination);
  const n=AU.ctx.sampleRate,b=AU.ctx.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;AU.nb=b}catch(e){AU.on=false;return null}}
  if(AU.ctx.state==='suspended')AU.ctx.resume();return AU.ctx}
function tone(f,d,type='sine',v=.2,f2,delay=0){const c=ac();if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AU.m);o.start(t);o.stop(t+d+.02)}
function noise(d,v=.3,f=800,f2,delay=0){const c=ac();if(!c)return;const t=c.currentTime+delay,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=AU.nb;s.loop=true;
  fl.type='lowpass';fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  s.connect(fl);fl.connect(g);g.connect(AU.m);s.start(t);s.stop(t+d+.02)}
const sfx={fire:()=>{tone(170,.3,'sawtooth',.4,45);noise(.28,.65,1400,200)},
  boom:()=>{const n=performance.now();if(n-AU.lb<90)return;AU.lb=n;noise(.9,.85,900,80);tone(95,.65,'sine',.75,28)},
  hit:()=>{tone(620,.2,'square',.25,180);tone(310,.32,'sawtooth',.25,90,.02)},
  pop:()=>{noise(.32,.65,3000,300);tone(320,.24,'triangle',.4,80)},
  thud:()=>{tone(130,.32,'sine',.9,38);noise(.42,.75,900,120);noise(.22,.4,3500,600,.03)},click:()=>tone(720,.05,'square',.12),
  lock:()=>{tone(440,.07,'triangle',.2);tone(660,.09,'triangle',.2,0,.06)},
  turn:()=>{tone(330,.1,'sine',.18);tone(495,.14,'sine',.18,0,.08)},
  whoosh:()=>noise(.6,.38,500,3500),
  win:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.28,'triangle',.3,0,i*.14))};
function chargeOn(){const c=ac();if(!c||AU.ch)return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(520,t+1.5);g.gain.value=.1;o.connect(g);g.connect(AU.m);o.start();AU.ch={o,g}}
function chargeOff(){if(!AU.ch)return;const{o,g}=AU.ch,t=AU.ctx.currentTime;g.gain.setTargetAtTime(0,t,.03);o.stop(t+.15);AU.ch=null}
function toggleSnd(){AU.on=!AU.on;music.setMuted(!AU.on);document.getElementById('sbtn').textContent=AU.on?'🔊':'🔇';if(AU.on){ac();sfx.click()}else chargeOff()}
document.getElementById('sbtn').onclick=toggleSnd;['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{ac();music.resume()},{passive:true}));
const HX=110,HZ=120,heat=[],stats={shots:[0,0],hits:[0,0],pops:0};let heatOn=false,heatF=-1,heatN=-1,heatMesh,heatCv,heatTex,pal;
const heatAdd=(x,z,t,w)=>heat.push({x,z,t,w});
function heatInit(){heatCv=document.createElement('canvas');heatCv.width=2*HX;heatCv.height=2*HZ;heatTex=new THREE.CanvasTexture(heatCv);
  heatMesh=new THREE.Mesh(new THREE.PlaneGeometry(2*HX,2*HZ).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:heatTex,transparent:true,depthTest:false,fog:false}));
  heatMesh.position.y=.1;heatMesh.renderOrder=9;heatMesh.visible=false;scene.add(heatMesh);
  const pc=document.createElement('canvas');pc.width=256;pc.height=1;const g=pc.getContext('2d'),gr=g.createLinearGradient(0,0,256,0);
  [[0,'#2b5bd7'],[.3,'#2bd7c8'],[.55,'#8fe03a'],[.78,'#ffd23a'],[1,'#e0332b']].forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,256,1);pal=g.getImageData(0,0,256,1).data;
  document.querySelectorAll('#hf button').forEach(b=>b.onclick=()=>{heatF=+b.dataset.f;document.querySelectorAll('#hf button').forEach(x=>x.classList.toggle('on',x===b));heatDraw()})}
function heatDraw(){const W=2*HX,H=2*HZ,sh=document.createElement('canvas');sh.width=W;sh.height=H;const g=sh.getContext('2d');
  for(const e of heat){if(heatF>=0&&e.t!==heatF)continue;const x=e.x+HX,y=e.z+HZ,r=g.createRadialGradient(x,y,0,x,y,16);
    r.addColorStop(0,'rgba(0,0,0,'+Math.min(.45*e.w,1)+')');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(x-16,y-16,32,32)}
  const im=g.getImageData(0,0,W,H),d=im.data;for(let i=0;i<d.length;i+=4){const a=d[i+3],p=a*4;d[i]=pal[p];d[i+1]=pal[p+1];d[i+2]=pal[p+2];d[i+3]=a?Math.min(255,a*1.5+30):0}
  heatCv.getContext('2d').putImageData(im,0,0);heatTex.needsUpdate=true;heatN=heat.length;
  document.getElementById('hstat').innerHTML='Shots · P1 '+stats.shots[0]+' / P2 '+stats.shots[1]+'<br>Launcher hits · P1 '+stats.hits[0]+' / P2 '+stats.hits[1]+'<br>Intercepts · '+stats.pops+' &nbsp; Impacts · '+heat.length}
function toggleHeat(){if(!cannons)return;heatOn=!heatOn;if(heatOn&&!heatMesh)heatInit();heatMesh.visible=heatOn;document.body.classList.toggle('heat',heatOn);document.getElementById('heat').style.display=heatOn?'block':'none';if(heatOn)heatDraw()}
document.getElementById('fbtn').onclick=toggleHeat;
function scenery(){
  let sd=7;const rnd=()=>(sd=sd*16807%2147483647)/2147483647,N=QUALITY.props||44,o=new THREE.Object3D();
  const pine=new THREE.Color(cfg.theme==='paper'?0x6d8b4e:cfg.theme==='blueprint'?0x5fa0d8:0x1f6f5c);
  const tr=new THREE.InstancedMesh(new THREE.ConeGeometry(1.6,4.5,7),new THREE.MeshLambertMaterial({color:0xffffff}),N),
        tk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.25,.3,1.4,6),new THREE.MeshLambertMaterial({color:T.wall}),N),
        rk=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshLambertMaterial({color:T.wall}),26);
  const spot=()=>{for(;;){const x=(rnd()-.5)*260,z=(rnd()-.5)*260;if(Math.abs(x)>68||Math.abs(z)>96)return[x,z]}};
  for(let i=0;i<N;i++){const[x,z]=spot(),k=.8+rnd()*.9;o.rotation.set(0,0,0);o.scale.setScalar(k);
    o.position.set(x,.7*k,z);o.updateMatrix();tk.setMatrixAt(i,o.matrix);o.position.y=3.6*k;o.updateMatrix();tr.setMatrixAt(i,o.matrix);
    tr.setColorAt(i,pine.clone().offsetHSL(0,0,(rnd()-.5)*.12))}
  for(let i=0;i<26;i++){const[x,z]=spot(),k=.4+rnd()*.9;o.scale.set(k*1.3,k*.7,k);o.rotation.y=rnd()*6;o.position.set(x,.2,z);o.updateMatrix();rk.setMatrixAt(i,o.matrix)}
  scene.add(tr,tk,rk);
  const cm=new THREE.MeshBasicMaterial({color:T.ground,transparent:true,opacity:.9,fog:false}),sg=new THREE.SphereGeometry(1,8,6);
  for(let i=0;i<6;i++){const g=new THREE.Group();for(let k=0;k<3;k++){const m=new THREE.Mesh(sg,cm);m.scale.set(4.5-k*.8,1.6,2.6);m.position.set((k-1)*3.5,k%2,0);g.add(m)}
    g.position.set((rnd()-.5)*280,26+rnd()*8,(i%2?1:-1)*(78+rnd()*35));g.userData.s=1.2+rnd();scene.add(g);clouds.push(g)}
  const bm=new THREE.MeshBasicMaterial({color:INK,side:THREE.DoubleSide}),wg=new THREE.PlaneGeometry(1.4,.5).translate(.7,0,0);
  for(let i=0;i<5;i++){const g=new THREE.Group(),a=new THREE.Mesh(wg,bm),b=new THREE.Mesh(wg,bm);b.rotation.y=Math.PI;
    g.add(a,b,new THREE.Mesh(new THREE.SphereGeometry(.3,6,4),bm));g.userData={a,b};scene.add(g);birds.push(g)}
  const pg=new THREE.CylinderGeometry(.04,.04,1.6,5),fg=new THREE.PlaneGeometry(.9,.55).translate(.45,0,0),bg=new THREE.CylinderGeometry(.18,.22,.6,6),hg=new THREE.SphereGeometry(.2,8,6),im=new THREE.MeshBasicMaterial({color:INK});
  cannons.forEach((L,t)=>L.forEach((c,i)=>{c.i=i;c.id='p'+(t+1)+'-l'+i;
    const pole=new THREE.Mesh(pg,im);pole.position.set(-.75,1.6,.6);
    c.flag=new THREE.Mesh(fg,new THREE.MeshBasicMaterial(cfg.cosmetics?{map:new THREE.CanvasTexture(flagCanvas(cfg['p'+(t+1)+'country'])),side:THREE.DoubleSide}:{color:TEAM[t],side:THREE.DoubleSide}));c.flag.position.set(-.75,2.2,.6);
    c.crew=new THREE.Group();const bd=new THREE.Mesh(bg,im),hd=new THREE.Mesh(hg,im);bd.position.y=.3;hd.position.y=.72;c.crew.add(bd,hd);
    
    // Team military helmet on crew soldier (toaddup.md item 3)
    const crewHelmetMat = new THREE.MeshLambertMaterial({color: TEAM[t]});
    const crewDome = ink(new THREE.Mesh(new THREE.SphereGeometry(.23, 10, 8, 0, Math.PI*2, 0, Math.PI*.58), crewHelmetMat));
    crewDome.position.set(0, .86, 0);
    const crewBrim = ink(new THREE.Mesh(new THREE.CylinderGeometry(.32, .26, .04, 10), crewHelmetMat));
    crewBrim.position.set(0, .79, 0);
    c.crew.add(crewDome, crewBrim);
    c.mats.push(crewHelmetMat);
    c.crew.position.set(.7,.8,.5);

    // Supply crate & sandbag revetment near launcher
    const crateMat = new THREE.MeshLambertMaterial({color: 0x6e5238});
    const crate = ink(new THREE.Mesh(new THREE.BoxGeometry(.8, .6, .8), crateMat));
    crate.position.set(-.9, .3, -.6);
    const sbMat = new THREE.MeshLambertMaterial({color: 0xc8b28a});
    for(let sbx=-0.8; sbx<=0.8; sbx+=0.8){
      const sb = ink(new THREE.Mesh(new THREE.BoxGeometry(.7, .25, .35), sbMat));
      sb.position.set(sbx, .12, (t ? 1.2 : -1.2));
      c.g.add(sb);
    }
    c.g.add(pole,c.flag,c.crew,crate);
    c.ncv=document.createElement('canvas');c.ncv.width=c.ncv.height=64;c.nctx=c.ncv.getContext('2d');c.ntex=new THREE.CanvasTexture(c.ncv);
    c.nplane=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({map:c.ntex}));c.nplane.position.set(0,0,t?-.86:.86);c.nplane.rotation.y=t?Math.PI:0;c.g.children[0].add(c.nplane);
    c.tag=document.createElement('div');c.tag.className='tag';c.tag.textContent=c.id;document.getElementById('tags').appendChild(c.tag)}));
  
  // Animated windsock near fortification wall
  const sockGroup = new THREE.Group();
  const sockPole = ink(new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3, 6), new THREE.MeshLambertMaterial({color: T.wall})));
  sockPole.position.y = 1.5;
  const sockCone = ink(new THREE.Mesh(new THREE.CylinderGeometry(.35, .1, 1.8, 8).rotateX(Math.PI/2), new THREE.MeshLambertMaterial({color: 0xe05538})));
  sockCone.position.set(0, 2.7, 0.8);
  sockGroup.add(sockPole, sockCone);
  sockGroup.position.set(-FW + 3, 0, 0);
  scene.add(sockGroup);
  windsock = sockCone;

  // Floating paper scrap motes across the field
  const scrapMat = new THREE.MeshBasicMaterial({color: INK, side: THREE.DoubleSide, transparent: true, opacity: 0.6});
  for(let i=0; i<14; i++){
    const scrap = new THREE.Mesh(new THREE.PlaneGeometry(.4, .5), scrapMat);
    scrap.position.set((Math.random()-.5)*220, 1 + Math.random()*8, (Math.random()-.5)*180);
    scrap.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
    scrap.userData = { speed: .8 + Math.random()*.8, rot: Math.random()*.04 };
    scene.add(scrap);
    paperScraps.push(scrap);
  }

  ring=new THREE.Mesh(new THREE.RingGeometry(2.3,2.7,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:INK,transparent:true,opacity:.75,side:THREE.DoubleSide}));scene.add(ring)}
const padOk=(b,ca,cu,cc)=>{const k=b.dataset.k,a=b.dataset.a;
  if(k==='l'||k==='r')return state==='flying'&&ball&&!ball.ctl&&!ball.fsd&&(!ball.fps||ball.fps===(k==='r'?1:-1))||cu&&!A.yd&&(!A.ys||A.ys===(k==='r'?1:-1))||cc&&(!ball.armed?!ball.pdn&&(!ball.ps||ball.ps===(k==='r'?1:-1)):!ball.sdone&&!(ball.boost>0)&&(!ball.side||ball.side===(k==='r'?1:-1)));
  if(k==='u'||k==='d')return cu&&!A.pd&&(!A.ps||A.ps===(k==='u'?1:-1));
  if(a==='prev'||a==='next')return canCycle();
  if(a==='msl')return canCycle()&&myMs().length>0;
  return ca&&(cu||!!msel)||cc&&(!ball.armed||!ball.boosted)};
function numTex(c,n,cls){const g=c.nctx,no=cls.includes('no'),sl=cls.includes('sel'),P=T.css[0],K=T.css[1];
  g.fillStyle=no?'#e0452b':sl?K:P;g.fillRect(0,0,64,64);g.lineWidth=6;g.strokeStyle=no?'#8a1f10':K;g.strokeRect(3,3,58,58);
  g.fillStyle=no?'#fff':sl?P:K;g.font='bold 42px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,32,35);c.ntex.needsUpdate=true}
function tick(now,dt,sc,ca,cu,cc){
  if(heatOn&&heatN!==heat.length)heatDraw();
  document.body.classList.toggle('msel',!!(msel&&canCycle()));
  for(const b of PB)b.classList.toggle('no',!padOk(b,ca,cu,cc));
  const L=mine(),cs=canCycle();
  chipsEl.childNodes.forEach((b,k)=>{const u=L[chipIdx[k]];b.style.display=usable(u)?'':'none';b.classList.toggle('no',!cs);b.classList.toggle('sel',chipIdx[k]===sel)});
  for(const c of cannons.flat()){
    const nt=c.t===turn?(turn===0?c.i:cfg.n-1-c.i)+1:'',nc=(nt&&c===sc?'sel':'')+(nt&&(!usable(c)||!canCycle())?' no':'');
    c.nplane.visible=!!nt&&c.hp>0;if(nt&&c.nt!==nt+nc){c.nt=nt+nc;numTex(c,nt,nc)}
    c.flag.rotation.y=Math.sin(now/200+c.x)*.5;c.flag.scale.x=.85+Math.sin(now/130+c.x)*.15;
    c.crew.position.y=.8+Math.abs(Math.sin(now/(c===sc&&state==='aiming'?140:420)+c.x))*.18;
    if(dirOn&&c.hp>0){tmpT.set(c.x,1.5,c.z).project(cam);c.tag.style.display='block';c.tag.style.transform='translate('+(tmpT.x+1)/2*innerWidth+'px,'+(1-tmpT.y)/2*innerHeight+'px)'}else c.tag.style.display='none'}
  marker.scale.setScalar(1+bird*2.2);
  for(const c of clouds){c.visible=bird<.3&&!dirOn&&!heatOn&&cam.position.y<c.position.y-5;c.position.x+=dt*c.userData.s;if(c.position.x>150)c.position.x=-150}
  birds.forEach((g,i)=>{const a=now/2800+i*1.26;g.position.set(Math.cos(a)*58,15+Math.sin(i*2)*3,Math.sin(a)*80);g.rotation.y=Math.atan2(-Math.sin(a)*58,Math.cos(a)*80);
    const f=Math.sin(now/90+i)*.7;g.userData.a.rotation.z=f;g.userData.b.rotation.z=-f});
  if(windsock){const wAngle=Math.atan2(wind.x,wind.z);windsock.rotation.y=wAngle+Math.sin(now/340)*0.12;}
  for(const p of paperScraps){
    p.position.x += dt * p.userData.speed;
    p.position.y += Math.sin(now / 400 + p.position.x) * 0.02;
    p.rotation.z += p.userData.rot;
    if(p.position.x > 110) p.position.x = -110;
  }
  const ms=msel&&canCycle();ring.visible=!!ms||sc.hp>0&&(state==='moving'||state==='aiming');ring.position.set(ms?msel.position.x:sc.x,ms?.4:1.3,ms?msel.position.z:sc.z);ring.scale.setScalar((ms?1.5:1)+Math.sin(now/250)*.06);
  ring.material.color.setHex(ms?0xd9772b:usable(sc)?TEAM[turn]:0xe0452b)}
const clock=new THREE.Clock(),P0=new THREE.Vector3(),L0=new THREE.Vector3(),P1=new THREE.Vector3(),L1=new THREE.Vector3();
const BC=new THREE.Vector3(),ORG=new THREE.Vector3(),birdOffset=new THREE.Vector3(0,92,25);let BH=95,fa=.016,pr=Math.min(devicePixelRatio,QUALITY.pixelRatio);
function loop(){
  requestAnimationFrame(loop);
  cameraControls.update();birdControls.update();
  const raw=clock.getDelta();let dt=Math.min(raw,.05);
  if(document.hidden){stepper.reset();return}
  // Camera choreography uses real time; physics and explosion effects use slow motion.
  stepper.advance(raw,h=>stepGameplay(h*(cinemaEnabled()?impact.timeScale:1)));
  const effectDt=dt*(cinemaEnabled()?impact.timeScale:1),now=performance.now();
  fa+=(raw-fa)*.03;if(fa>.026&&pr>1){pr=Math.max(1,pr-.25);renderer.setPixelRatio(pr);renderer.setSize(innerWidth,innerHeight);fa=.016}   // adaptive resolution


  // Elevated overview: frame the space ahead of the launcher, with extra room on phones.
  // Orbit and reset share the same framing so the first drag does not jump closer.
  const sc=mine()[sel],a=A.yaw*.5,hx=rgt()*Math.sin(a),hz=fwd()*Math.cos(a),gp=sc.g.position;
  const yaw=cameraRig.yaw-a+(turn?Math.PI:0);
  const viewDistance=cameraRig.distance*(cam.aspect<.9?1.25:1);
  const focusAhead=innerHeight<500&&cam.aspect>1.5?-3:3.5;
  L0.set(gp.x+hx*focusAhead,2.2,gp.z+hz*focusAhead);
  P0.set(L0.x+Math.sin(yaw)*Math.cos(cameraRig.pitch)*viewDistance,
    L0.y+Math.sin(cameraRig.pitch)*viewDistance,
    L0.z+Math.cos(yaw)*Math.cos(cameraRig.pitch)*viewDistance);
  if(state==='flying'&&ball){
    tmpT.copy(ball.v).normalize();
    L0.copy(ball.m.position).addScaledVector(ball.v,.18);
    P0.copy(ball.m.position).addScaledVector(tmpT,-22);P0.y=Math.max(P0.y+12,8);
  }
  if(first){camP.copy(P0);camL.copy(L0);first=false}
  camP.lerp(P0,1-Math.exp(-dt*(state==='flying'?2:3)));camL.lerp(L0,1-Math.exp(-dt*3.5));
  if(state==='aiming'||state==='moving')bs=fwd();
  const bt=state==='control'?lastB:msel&&canCycle()?msel.position:null;if(bt){BC.lerp(bt,1-Math.exp(-dt*4));BH+=(birdRig.distance-BH)*(1-Math.exp(-dt*4))}
  bird+=((state==='control'||msel&&canCycle()?1:0)-bird)*(1-Math.exp(-dt*3));
  P0.copy(camP);L0.copy(camL);
  if(bird>.002){
    const orbitYaw=birdRig.yaw+(turn?Math.PI:0);
    P1.set(Math.sin(orbitYaw)*Math.cos(birdRig.pitch)*BH,Math.sin(birdRig.pitch)*BH,Math.cos(orbitYaw)*Math.cos(birdRig.pitch)*BH);
    birdOffset.lerp(P1,1-Math.exp(-dt*5));P1.copy(BC).add(birdOffset);L1.copy(BC);
    P0.lerp(P1,bird);L0.lerp(L1,bird);
  }
  cam.up.set(0,1,0);
  if(heatOn){P0.set(0,320,40);L0.set(0,0,0)}else if(dirOn){P0.set(0,270,90);L0.set(0,0,0)}
  if(!cfg.shake||RM)shake=0;
  if(shake>.01){P0.x+=(Math.random()-.5)*shake;P0.y+=(Math.random()-.5)*shake;shake*=Math.exp(-dt*5)}
  impact.apply(dt,P0,L0,cinemaEnabled());impactLook.copy(L0);
  document.body.classList.toggle('cinematic',impact.active&&cinemaEnabled());
  if(pendingEnd&&!impact.active){document.getElementById('end').style.display='flex';pendingEnd=false}
  for(const row of document.getElementById('event-feed').children)if(Number(row.dataset.until)<now)row.remove();
  cam.position.copy(P0);cam.lookAt(L0);
  const tf=impact.active&&impact.age<=impact.hold?impact.fov:(cam.aspect<.9?62:55)+(state==='flying'?9:0)-(state==='control'?6:0)+shake*5;if(Math.abs(cam.fov-tf)>.05){cam.fov+=(tf-cam.fov)*(1-Math.exp(-dt*4));cam.updateProjectionMatrix()}

  const gt=state==='aiming'&&!over?(msel?'FIRE: take over the marked missile · M / 🚀: next':'◀▶ angle '+(A.yd?'locked':A.ys?'one side only':'hold once')+''+' · hold FIRE to charge power'):
    state==='control'&&ball?(!ball.armed?(ball.pdn?'aim locked':'◀▶ aim: pick ONE side, one hold')+' · FIRE to launch':(ball.sdone?'steer used':ball.son?'steering…':'◀▶ steer (one hold)')+(ball.boosted?' · boost used':' · FIRE = boost')):'';
  if(gt!==gLast){gLast=gt;stEl.textContent=gt;gT=3}gT-=dt;   // new guideline shows for 3s, then fades
  {const B=document.body.classList;B.toggle('gfade',gMode==='auto'&&gT<=0);B.toggle('goff',gMode==='off')}
  if(state==='aiming'&&msel){marker.position.set(msel.position.x,2.8+Math.sin(now/200)*.25,msel.position.z);marker.material.color.setHex(0xd9772b)}
  const ok=state==='aiming'&&!over&&usable(sc)&&!msel;
  trail.visible=ok;marker.visible=ok||(state==='aiming'&&!over&&!!msel);      // no aim guide while steering a missile
  if(ok){
    const dir=aimDir();sc.pivot.rotation.y=Math.atan2(-dir.x,-dir.z);sc.pivot.rotation.x=Math.asin(dir.y);
    let pw=.5;if(charging){pw=Math.min(1,(now-t0)/1500);pwEl.style.width=pw*100+'%'}
    const pts=sim(muzzle(sc,dir),dir,speed(pw)),n=Math.max(2,Math.floor(pts.length*.45)),a=tg.attributes.position.array;
    for(let i=0;i<n&&i<PTS;i++){a[i*3]=pts[i].x+Math.sin(i*12.9)*.06;a[i*3+1]=pts[i].y+Math.cos(i*7.3)*.06;a[i*3+2]=pts[i].z}
    tg.setDrawRange(0,Math.min(n,PTS));tg.attributes.position.needsUpdate=true;trail.computeLineDistances();
    marker.position.set(sc.x,5.6+Math.sin(now/200)*.25,sc.z);marker.material.color.setHex(TEAM[turn]);
  }

  for(const c of cannons.flat()){
    c.recoil*=Math.exp(-effectDt*6);c.flash=Math.max(0,(c.flash||0)-effectDt*5);for(const m of c.mats)m.emissive.setRGB(c.flash,c.flash*.9,c.flash*.6);c.barrel.position.z=c.recoil*.5;
    if(c.hp>0&&c.hp<cfg.hp&&Math.random()<(cfg.hp-c.hp)/cfg.hp*dt*6)puff(tmpT.copy(c.hit).setY(2.8),1,0x777777,.6,2,1.3)}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=effectDt;p.v.y-=6*effectDt;p.m.position.addScaledVector(p.v,effectDt);
    p.m.scale.setScalar(Math.max(.01,p.life/p.max));if(p.life<=0){scene.remove(p.m);parts.splice(i,1)}}
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=effectDt;const k=Math.min(1,f.t/f.d),e=1-(1-k)**3;
    f.m.scale.setScalar(f.ring?f.r*e+.1:f.r*(.2+.8*e));f.m.material.opacity=(f.ring?.8:.9)*(1-k);
    if(!f.ring)f.m.material.color.setHex(k<.4?0xffe27a:0xff7a2b);
    if(k>=1){scene.remove(f.m);f.m.geometry.dispose();f.m.material.dispose();fx.splice(i,1)}}
  for(const c of cannons.flat()){   // HP + reload bars
    tmpT.set(c.x,4.8,c.z).project(cam);
    if(c.hp<=0||c.t!==turn||tmpT.z>1){c.bar.style.display='none';continue}
    c.bar.style.display='block';c.bar.style.transform='translate('+(tmpT.x+1)/2*innerWidth+'px,'+(1-tmpT.y)/2*innerHeight+'px) translate(-50%,-100%)';
    const lv=c.cool>0?0:c.locked?1:2;if(c.lv!==lv){c.lv=lv;[...c.pips.children].forEach((p,k)=>p.className=k<lv?'on':'');c.bar.style.setProperty('--pc',lv===2?'#4cc36b':'#e8a33b')}   // || = reload rounds
    c.cdi.style.width=c.hp/cfg.hp*100+'%';c.cdi.style.background=c.hp===1&&cfg.hp>1?'#e0452b':'#'+c.base.toString(16).padStart(6,'0');   // ===== = health
  }
  tick(now,dt,sc,state==='aiming'&&!over,state==='aiming'&&!over&&usable(sc)&&!msel,state==='control'&&!!ball);
  renderer.render(scene,cam);
}

function stepGameplay(dt){
  if(state==='moving'){timer-=dt;if(timer<=0)state='aiming'}
  if(state==='wait'){timer-=dt;if(timer<=0&&!impact.active){turn=1-turn;startTurn()}}

  if(state==='aiming'&&!over&&usable(mine()[sel])&&!msel){   // angle / tilt: one hold each, then locked
    if(!A.yd&&!A.ys){if(K.r&&!K.l)A.ys=1;else if(K.l&&!K.r)A.ys=-1}
    if(!A.pd&&!A.ps){if(K.u&&!K.d)A.ps=1;else if(K.d&&!K.u)A.ps=-1}
    const ix=A.yd?0:A.ys===1?K.r:A.ys===-1?-K.l:0,iy=A.pd?0:A.ps===1?K.u:A.ps===-1?-K.d:0;   // only the first side pressed counts
    if(ix){A.yo=1;A.yaw=Math.max(-.6,Math.min(.6,A.yaw+ix*.7*dt))}else if(A.yo){A.yd=1;A.yo=0;sfx.lock()}
    if(iy){A.po=1;A.pitch=Math.max(.1,Math.min(.9,A.pitch+iy*.55*dt))}else if(A.po){A.pd=1;A.po=0}}
  if(ball&&!ball.ctl)for(let k=0;k<2&&ball;k++){
    const h=dt/2,p=ball.m.position;driftLauncher(ball.v,ball.t,h,ball.seed,ball.apexTime);ball.t+=h;ball.v.y-=G*h;
    // wind nudges the horizontal velocity each sub-step
    ball.v.x+=wind.x*h;ball.v.z+=wind.z*h;
    // wobble: small sinusoidal horizontal offset in velocity
    if(ball.wobblePhase!=null){const wob=Math.sin(ball.wobblePhase+ball.t*ball.wobbleFreq)*ball.wobbleAmp;ball.v.x+=Math.cos(ball.t)*wob;ball.v.z+=Math.sin(ball.t)*wob;}
    // one-side-one-hold yaw steering while flying
    if(!ball.fsd){if(!ball.fps){if(K.r&&!K.l)ball.fps=1;else if(K.l&&!K.r)ball.fps=-1}
      const fi=ball.fps===1?K.r:ball.fps===-1?-K.l:0;
      if(fi&&!ball.fyd){ball.fyo=1;const sp=Math.sqrt(ball.v.x*ball.v.x+ball.v.z*ball.v.z)||1;const ang=fi*1.4*h;const cx=Math.cos(ang),sx=Math.sin(ang),nx=ball.v.x*cx-ball.v.z*sx,nz=ball.v.x*sx+ball.v.z*cx;ball.v.x=nx*sp/((Math.sqrt(nx*nx+nz*nz))||1);ball.v.z=nz*sp/((Math.sqrt(nx*nx+nz*nz))||1);}
      else if(ball.fyo){ball.fyd=1;ball.fyo=0;ball.fsd=true;sfx.lock();hint('Missile steer locked',1200)}}
    p.addScaledVector(ball.v,h);
    ball.m.lookAt(p.x+ball.v.x,p.y+ball.v.y,p.z+ball.v.z);
    const c=cannons[1-turn].find(c=>c.hp>0&&p.distanceTo(c.hit)<1.9);
    if(c){damage(c,2);land(true);break}
    const nb=balls.find(b=>b.position.distanceTo(p)<2);   // hitting ANY resting missile (even your own) explodes both = attack nullified
    if(nb){popMissile(nb);boom(p.clone(),0);hint('INTERCEPTED · BOOM',1500);land(true);break}
    if(p.y<=.3||Math.abs(p.z)>118||Math.abs(p.x)>108){land(false);break}
  }
  if(ball&&!ball.ctl&&Math.random()<dt*45)puff(ball.m.position,1,0xbbbbbb,.3,.2,.6);   // smoke trail
  if(ball&&ball.ctl)ctlStep(dt);


}

document.getElementById('reduced-motion').checked=RM;
for(const i of [1,2]){const select=document.getElementById('p'+i+'country');
 for(const [id,c] of Object.entries(COUNTRIES)){const o=document.createElement('option');o.value=id;o.textContent=c.flag+' '+c.name;select.append(o)}
 select.value=cfg['p'+i+'country'];const update=()=>{const c=country(select.value);cfg['p'+i+'country']=select.value;cfg['p'+i+'theme']=c.music;const preview=document.getElementById('p'+i+'preview');preview.textContent=c.flag;preview.style.borderBottom='4px solid #'+c.color.toString(16).padStart(6,'0')};select.onchange=update;update();
}
