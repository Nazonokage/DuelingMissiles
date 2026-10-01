import fs from 'node:fs';
let page=fs.readFileSync('index.html','utf8').replace('Dueling Missiles – Prototype 0.5','Dueling Missiles');
page=page.replace('<div id="label">','<button id="cinematic-toggle" title="Toggle explosion camera">Cinema: on</button>\n<div id="event-feed" aria-live="polite"></div>\n<div id="label">');
page=page.replace('  <div class="row"><label for="p1music">',`  <div class="row"><label for="p1country">Player 1 country</label><select id="p1country"></select><span id="p1preview"></span></div>
  <div class="row"><label for="p2country">Player 2 country</label><select id="p2country"></select><span id="p2preview"></span></div>
  <div style="font-size:13px">Country flags and colors are cosmetic. Original music only; no historical recordings.</div>
  <details><summary>Camera, effects &amp; quality</summary>
    <div class="row"><label><input id="cinematics" type="checkbox" checked> Explosion camera</label><label><input id="reduced-motion" type="checkbox"> Reduced motion</label></div>
    <div class="row"><label><input id="particles" type="checkbox" checked> Particles</label><label><input id="shake" type="checkbox" checked> Camera shake</label><label><input id="sfx" type="checkbox" checked> Sound effects</label></div>
    <div class="row"><label><input id="color-safe" type="checkbox"> Color-safe teams</label><label><input id="cosmetics" type="checkbox" checked> Country cosmetics</label></div>
    <div class="row"><label for="quality">Quality</label><select id="quality"><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
    <div class="row"><label for="seed">Match seed</label><input id="seed" type="number" min="0" max="4294967295" value="2026"></div>
  </details>
  <div class="row"><label for="p1music">`);
page=page.replace('Music tracks are not supplied yet. Sound effects are available.','Original synthesized loops. Choose None for silence.');fs.writeFileSync('index.html',page);
fs.appendFileSync('src/game.css',`\n#cinematic-toggle{position:fixed;left:12px;top:calc(env(safe-area-inset-top,0px) + 66px);z-index:5;background:var(--paper);padding:6px;font-size:14px;min-height:38px}body.intro #cinematic-toggle{display:none}
#event-feed{position:fixed;top:calc(env(safe-area-inset-top,0px) + 110px);left:12px;z-index:4;pointer-events:none;font-size:14px;background:var(--paper);max-width:210px}#event-feed:empty{display:none}#event-feed div{padding:3px 7px}
body.cinematic #hud,body.cinematic #pad,body.cinematic #bars{visibility:hidden}body.cinematic #event-feed{top:calc(env(safe-area-inset-top,0px) + 12px);left:50%;transform:translateX(-50%)}
#setup details{font-size:15px;max-width:620px}#setup .row span[id$=preview]{font-size:15px;min-width:0}#setup .row{flex-shrink:0}#setup h1{flex-shrink:0}#setup{gap:9px}#seed{width:130px}
`);
let s=fs.readFileSync('src/main.js','utf8');s=`import { ImpactCamera } from './camera/impact-camera.js';
import { FixedStepper, seededRandom } from './game/simulation.js';
import { COUNTRIES, country, flagCanvas } from './cosmetics/countries.js';
import { PRESETS } from './field/quality.js';
`+s;
s=s.replace("p2theme:'signal-waltz'}", "p2theme:'signal-waltz',p1country:'italy',p2country:'france',cinematics:true,particles:true,shake:true,sfx:true,colorSafe:false,cosmetics:true,quality:'auto'}");
s=s.replace("const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,pmc={}","let RM=matchMedia('(prefers-reduced-motion: reduce)').matches;const pmc={}");
s=s.replace('const G=18,',`const impact=new ImpactCamera(),stepper=new FixedStepper();let gameplayRandom=seededRandom(2026),pendingEnd=false;
const impactLook=new THREE.Vector3();
const cinemaEnabled=()=>cfg.cinematics&&!RM&&!dirOn&&!heatOn;
function feed(text){const el=document.getElementById('event-feed');const row=document.createElement('div');row.textContent=text;row.dataset.until=String(performance.now()+4000);el.prepend(row);while(el.children.length>3)el.lastChild.remove()}
const G=18,`);
s=s.replace('function start(){\n  music.refresh();',`function start(){
  RM=document.getElementById('reduced-motion').checked;
  for(const key of ['cinematics','particles','shake','sfx','cosmetics'])cfg[key]=document.getElementById(key).checked;
  cfg.colorSafe=document.getElementById('color-safe').checked;cfg.quality=document.getElementById('quality').value;
  if(PRESETS[cfg.quality])Object.assign(QUALITY,PRESETS[cfg.quality]);
  renderer.setPixelRatio(pr=Math.min(devicePixelRatio,QUALITY.pixelRatio));
  gameplayRandom=seededRandom(Number(document.getElementById('seed').value)||0);stepper.reset();
  music.refresh();`);
s=s.replace('T=THEMES[cfg.theme];INK=T.ink;TEAM=T.team;','T=THEMES[cfg.theme];INK=T.ink;TEAM=cfg.colorSafe?[0x0072b2,0xe69f00]:cfg.cosmetics?[country(cfg.p1country).color,country(cfg.p2country).color]:T.team;');
s=s.replace('seed:Math.random()*10','seed:gameplayRandom()*10');
s=s.replace('function puff(pos,n,col,spd,up=3,life=.9){','function puff(pos,n,col,spd,up=3,life=.9){\n  if(!cfg.particles)return;');
s=s.replace("function damage(c,n=1){", "function damage(c,n=1){feed(n>1?'DIRECT HIT':'HIT');");
s=s.replace('hitstop=RM?0:.07;','hitstop=0;');
s=s.replace('  paint(c)}\nfunction blast',"  if(alive(c.t).length===1)feed('LAST LAUNCHER · P'+(c.t+1));\n  paint(c)}\nfunction blast");
s=s.replace('function blast(pos,r){sfx.boom();',`function blast(pos,r){sfx.boom();
  if(impact.trigger(pos,cam,impactLook,turn?-1:1,cinemaEnabled())){cameraControls.clear();birdControls.clear();}`);
s=s.replace('d:.55,r}', 'd:1.1,r}').replace('d:.75,r:r*1.5','d:1.35,r:r*1.5');
s=s.replace('function popMissile(m){sfx.pop();',"function popMissile(m){feed('CHAIN REACTION');sfx.pop();");
s=s.replace("else{sfx.thud();", "else{feed('MISSED');sfx.thud();");
s=s.replace("document.getElementById('end').style.display='flex';return", "pendingEnd=true;if(!impact.active){document.getElementById('end').style.display='flex';pendingEnd=false}return");
s=s.replace('if(!cannons||over)return;','if(!cannons||over||impact.active)return;');
s=s.replace("const canCycle=()=>!!cannons&&!over&&", "const canCycle=()=>!!cannons&&!over&&!impact.active&&");
s=s.replace('()=>!!cannons&&!over&&!msel', '()=>!!cannons&&!over&&!impact.active&&!msel').replace('()=>!!cannons&&!over&&!dirOn', '()=>!!cannons&&!over&&!impact.active&&!dirOn');
s=s.replace('function ac(){if(!AU.on)', 'function ac(){if(!AU.on||!cfg.sfx)');
s=s.replace('N=44,o=', 'N=QUALITY.props||44,o=');
s=s.replace('new THREE.MeshBasicMaterial({color:TEAM[t],side:THREE.DoubleSide})','new THREE.MeshBasicMaterial(cfg.cosmetics?{map:new THREE.CanvasTexture(flagCanvas(cfg[\'p\'+(t+1)+\'country\'])),side:THREE.DoubleSide}:{color:TEAM[t],side:THREE.DoubleSide})');
s=s.replace("const raw=clock.getDelta();let dt=Math.min(raw,.033);", "const raw=clock.getDelta();let dt=Math.min(raw,.05);\n  if(document.hidden){stepper.reset();return}\n  stepper.advance(raw,stepGameplay);");
s=s.replace('  if(hitstop>0){hitstop-=raw;dt=0}', '');
s=s.replace("if(shake>.01){", "if(!cfg.shake||RM)shake=0;\n  if(shake>.01){");
s=s.replace('  cam.position.copy(P0);cam.lookAt(L0);',`  impact.apply(dt,P0,L0,cinemaEnabled());impactLook.copy(L0);
  document.body.classList.toggle('cinematic',impact.active&&cinemaEnabled());
  if(pendingEnd&&!impact.active){document.getElementById('end').style.display='flex';pendingEnd=false}
  for(const row of document.getElementById('event-feed').children)if(Number(row.dataset.until)<now)row.remove();
  cam.position.copy(P0);cam.lookAt(L0);`);
// Move turn/input and projectile updates to a fixed 120 Hz simulation step.
const a=s.indexOf("  if(state==='moving'){timer-=dt;"),b=s.indexOf('  const gt=',a);let logic=s.slice(a,b).replace('state===\'aiming\'&&!over&&usable(sc)',"state==='aiming'&&!over&&usable(mine()[sel])").replace('if(timer<=0){turn=1-turn;', 'if(timer<=0&&!impact.active){turn=1-turn;');s=s.slice(0,a)+s.slice(b);
const c=s.indexOf('  if(ball&&!ball.ctl)for('),d=s.indexOf('  for(const c of cannons.flat()){\n    c.recoil',c);logic+=s.slice(c,d);s=s.slice(0,c)+s.slice(d);
s+=`\nfunction stepGameplay(dt){\n${logic}\n}\n`;
s+=`
document.getElementById('reduced-motion').checked=RM;
document.getElementById('cinematic-toggle').onclick=()=>{cfg.cinematics=!cfg.cinematics;document.getElementById('cinematic-toggle').textContent='Cinema: '+(cfg.cinematics?'on':'off')};
for(const i of [1,2]){const select=document.getElementById('p'+i+'country');
 for(const [id,c] of Object.entries(COUNTRIES)){const o=document.createElement('option');o.value=id;o.textContent=c.flag+' '+c.name;select.append(o)}
 select.value=cfg['p'+i+'country'];const update=()=>{const c=country(select.value);cfg['p'+i+'country']=select.value;cfg['p'+i+'theme']=c.music;document.getElementById('p'+i+'music').value=c.music;const preview=document.getElementById('p'+i+'preview');preview.textContent=c.flag;preview.style.borderBottom='4px solid #'+c.color.toString(16).padStart(6,'0')};select.onchange=update;update();
}
`;
fs.writeFileSync('src/main.js',s);
