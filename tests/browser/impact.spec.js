import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

// Serve the real modules with a test-only collision fixture; production has no debug hooks.
async function fixture(page) {
 await page.route('**/test-three.js',async route=>route.fulfill({contentType:'text/javascript',body:await fs.readFile('node_modules/three/build/three.module.js','utf8')}));
 await page.route('**/src/**',async route=>{
  const path=new URL(route.request().url()).pathname.slice(1);
  let body=await fs.readFile(path,'utf8');
  body=body.replaceAll("from 'three'","from '/test-three.js'");
  if(path==='src/main.js')body+=`\nwindow.impactFixture={
   windFlight(strength){
    const launchers=cannons.flat().map(c=>c.hp);cannons.flat().forEach(c=>c.hp=0);
    cfg.wobble=false;wind.set(strength,0,0);state='flying';
    const m=mkMissile(turn);m.position.set(0,40,0);ball={m,v:new THREE.Vector3(0,25,-20),t:0,seed:2,apexTime:25/18};
    const guide=sim(m.position,ball.v.clone().normalize(),ball.v.length())[50].toArray();
    for(let i=0;i<360;i++)stepGameplay(1/120);
    const result={p:ball.m.position.toArray(),guide};scene.remove(ball.m);ball=null;state='aiming';
    cannons.flat().forEach((c,i)=>c.hp=launchers[i]);return result;
   },
   physics(hz){
    cfg.wobble=false;wind.set(.1,0,-.08);state='flying';
    const m=mkMissile(turn);m.position.set(0,40,0);ball={m,v:new THREE.Vector3(0,8,-20),t:0,seed:2,apexTime:0};
    for(let i=0;i<hz;i++)stepGameplay(1/hz);
    const p=ball.m.position.toArray();scene.remove(ball.m);ball=null;state='aiming';return p;
   },
   trails(){return trajectories.paths.map(p=>({owner:p.owner,count:p.count,visible:p.line.visible,points:Array.from(p.line.geometry.attributes.position.array.slice(0,p.count*3))}))},
   analyticsCamera(){return {...heatRig}},
   testShot(){fire(.65)},
   missiles(){const c=mine()[sel];for(const x of [-4,4]){const m=mkMissile(turn);m.position.set(c.x+x,.3,c.z-10);balls.push(m)}},
   screenMissile(i){const p=balls[i].position.clone().project(cam);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}},
   selection(){return {index:balls.indexOf(msel),yaw:birdRig.yaw,wobble:cfg.wobble}},
   analytics(){return {outlines:heatOutlines.children.filter(l=>l.visible).length,corners:[[-HX,-HZ],[HX,HZ]].map(([x,z])=>new THREE.Vector3(x,0,z).project(cam).toArray())}},
   windCheck(){wind.set(.1,0,0);return cannons[0][0].flag.rotation.y},
   prepareLaunchers(team,count,cool,spent=false){
    turn=team;sel=0;
    cannons[team].forEach((c,i)=>{c.hp=i>0&&i<=count?cfg.hp:0;c.g.visible=c.hp>0;c.cool=cool;c.locked=true});
    if(spent){const m=mkMissile(team);m.position.set(20,.3,0);balls.push(m)}
    startTurn();
   },
   endMiss(){ball.m.position.set(30,.3,0);ball.v.set(0,-1,0);stepGameplay(1/120)},
   nextTurn(){turn=1-turn;startTurn()},
   inspect(mode){if(dirOn!==(mode==='director'))toggleDir();if(heatOn!==(mode==='heat'))toggleHeat()},
   gridCount(){return scene.children.filter(c=>c.type==='GridHelper').length},
   gameplay(){return {turn,state,sel,shot:!!ball,cool:mine()[sel].cool,locked:mine()[sel].locked,usable:usable(mine()[sel]),position:cam.position.toArray(),look:impactLook.toArray(),fov:cam.fov,miss:missedView?.target.toArray(),spent:balls.map(b=>b.position.toArray())}},
   collide(kind){
    if(kind==='recast'){const m=mkMissile(turn);m.position.copy(cannons[turn][sel].hit);balls.push(m);scene.remove(ball.m);takeover(m);ball.armed=true;ball.t=1;stepGameplay(1/120);return}
    if(kind==='cannon'){ball.m.position.copy(cannons[1-turn][sel].hit)}
    else {ball.m.position.set(0,4,0);const resting=mkMissile(turn);resting.position.copy(ball.m.position);balls.push(resting)}
    ball.v.set(0,0,0);stepGameplay(1/120);
   },
   explode(){blast(new THREE.Vector3(2,4,0),2.4)},
   snapshot(){const p=impact.target.clone().project(cam);return {position:cam.position.toArray(),fov:cam.fov,active:impact.active,age:impact.age,scale:impact.timeScale,effectAge:fx[0]?.t,screen:[p.x,p.y],distance:cam.position.distanceTo(impact.target)}}
  };`;
  await route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body});
 });
 await page.route('http://127.0.0.1:4173/',async route=>route.fulfill({contentType:'text/html',body:await fs.readFile('index.html','utf8')}));
 await page.goto('/');
}
for(const team of [0,1])test(`player ${team+1}'s final launcher fires every turn even with an old reload lock`,async({page})=>{
 await fixture(page);await page.locator('#go').click();
 await page.evaluate(team=>impactFixture.prepareLaunchers(team,1,1,true),team);
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 expect(await page.evaluate(()=>impactFixture.gameplay())).toMatchObject({sel:1,cool:0,locked:false,usable:true});
 await page.keyboard.press('Space');
 expect(await page.evaluate(()=>impactFixture.gameplay())).toMatchObject({shot:true,cool:0});
 await page.evaluate(()=>impactFixture.endMiss());
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().turn)).toBe(1-team);
 await page.evaluate(()=>impactFixture.nextTurn());
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 await page.keyboard.press('Space');
 expect(await page.evaluate(()=>impactFixture.gameplay())).toMatchObject({turn:team,shot:true,cool:0,locked:false});
});

test('inspection angles blend from the current camera and return smoothly',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await fixture(page);await page.locator('#setup summary').click();await page.locator('#reduced-motion').uncheck();
 await page.locator('#go').click();await page.waitForTimeout(1600);
 expect(await page.evaluate(()=>impactFixture.gridCount())).toBe(0);
 for(const mode of ['director','heat','play']){
  const samples=await page.evaluate(async mode=>{
   const positions=[impactFixture.gameplay().position];impactFixture.inspect(mode);
   const until=performance.now()+1000;
   while(performance.now()<until){await new Promise(requestAnimationFrame);positions.push(impactFixture.gameplay().position)}
   return positions;
  },mode);
  const steps=samples.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-samples[i][j])));
  expect(Math.max(...steps)).toBeLessThan(40);
  if(mode!=='play'){const expected=mode==='heat'?await page.evaluate(()=>Math.max(120,110/(innerWidth/innerHeight))*1.1/Math.tan(impactFixture.gameplay().fov*Math.PI/360)):270;expect(samples.at(-1)[1]).toBeCloseTo(expected,1);}
  else expect(samples.at(-1)[1]).toBeLessThan(40);
 }
 expect(errors).toEqual([]);
});

test('explosion recovery targets the incoming player without a second turn handoff',async({page})=>{
 await fixture(page);await page.locator('#go').click();await page.waitForTimeout(1600);
 await page.keyboard.press('Space');await page.evaluate(()=>impactFixture.collide('cannon'));
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().turn),{intervals:[50]}).toBe(1);
 expect((await page.evaluate(()=>impactFixture.snapshot())).active).toBe(true);
 await expect(page.locator('body')).not.toHaveClass(/cinematic/);
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 expect((await page.evaluate(()=>impactFixture.gameplay())).turn).toBe(1);
});

test('multiple surviving launchers still reload and recover on the following turn',async({page})=>{
 await fixture(page);await page.locator('#go').click();
 await page.evaluate(()=>impactFixture.prepareLaunchers(0,2,1));
 await expect(page.locator('#label')).toContainText('reloading');
 expect(await page.evaluate(()=>impactFixture.gameplay().state)).toBe('wait');
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().turn)).toBe(1);
 await page.evaluate(()=>impactFixture.nextTurn());
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 await page.keyboard.press('Space');
 expect(await page.evaluate(()=>impactFixture.gameplay())).toMatchObject({shot:true,cool:1});
});

test('a miss holds the landing view then travels directly to the next player',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await fixture(page);await page.locator('#go').click();
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 await page.keyboard.down('Space');await page.waitForTimeout(600);await page.keyboard.up('Space');
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state),{timeout:15000}).toBe('wait');
 const landed=await page.evaluate(()=>impactFixture.gameplay());expect(landed.miss).toBeTruthy();
 await page.waitForTimeout(700);
 const held=await page.evaluate(()=>impactFixture.gameplay());
 expect(held.turn).toBe(0);expect(held.position).toEqual(landed.position);expect(held.fov).toBe(landed.fov);
 expect(Math.hypot(...held.look.map((v,i)=>v-held.miss[i]))).toBeLessThan(2);
 expect(held.spent).toContainEqual(held.miss);
 await page.screenshot({path:`test-results/${info.project.name}-miss-hold.png`});
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().turn)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 const next=await page.evaluate(()=>impactFixture.gameplay());
 expect(next.miss).toBeUndefined();expect(next.position[2]).toBeLessThan(0);expect(errors).toEqual([]);
});

for(const kind of ['cannon','missile','recast'])test(`${kind} collision focuses the slow-motion explosion and returns to play`,async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
 
 await page.locator('#go').click();await page.waitForTimeout(1600);
 await page.keyboard.down('Space');await page.waitForTimeout(150);await page.keyboard.up('Space');
 await page.evaluate(kind=>impactFixture.collide(kind),kind);
 await expect(page.locator('#cinematic-toggle')).toHaveCount(0);
 await expect(page.locator('body')).toHaveClass(/cinematic/);await page.waitForTimeout(350);
 const shot=await page.evaluate(()=>impactFixture.snapshot());
 expect(shot.scale).toBe(.12);expect(shot.effectAge).toBeLessThan(.2);
 expect(Math.abs(shot.screen[0])).toBeLessThan(.01);expect(Math.abs(shot.screen[1])).toBeLessThan(.01);expect(shot.distance).toBeLessThan(10);
 await page.waitForTimeout(350);
 const parked=await page.evaluate(()=>impactFixture.snapshot());expect(parked.position).toEqual(shot.position);expect(parked.fov).toBe(shot.fov);
 await page.screenshot({path:`test-results/${info.project.name}-${kind}-cinematic.png`});
 await expect(page.locator('body')).not.toHaveClass(/cinematic/,{timeout:6000});
 await expect(page.locator('#label')).toHaveText('PLAYER 2',{timeout:10000});
 expect((await page.evaluate(()=>impactFixture.snapshot())).scale).toBe(1);expect(errors).toEqual([]);
});
test('reduced motion keeps explosion focus and slow motion without camera travel',async({page})=>{
 await fixture(page);await page.locator('#setup summary').click();await page.locator('#reduced-motion').check();
 await page.locator('#go').click();await page.waitForTimeout(1600);
 await page.keyboard.press('Space');await page.evaluate(()=>impactFixture.collide('cannon'));
 await expect(page.locator('body')).toHaveClass(/cinematic/);
 await page.waitForTimeout(100);const shot=await page.evaluate(()=>impactFixture.snapshot());
 expect(shot.scale).toBe(.12);expect(shot.distance).toBeLessThan(10);
 await page.waitForTimeout(350);expect((await page.evaluate(()=>impactFixture.snapshot())).position).toEqual(shot.position);
 await expect(page.locator('#label')).toHaveText('PLAYER 2',{timeout:10000});
});

test('another explosion renews slow motion during the return to gameplay',async({page})=>{
 await fixture(page);await page.locator('#setup summary').click();await page.locator('#reduced-motion').uncheck();
 await page.locator('#go').click();await page.waitForTimeout(1600);
 await page.evaluate(()=>impactFixture.explode());await page.waitForTimeout(2400);
 expect((await page.evaluate(()=>impactFixture.snapshot())).scale).toBeGreaterThan(.12);
 await page.evaluate(()=>impactFixture.explode());await page.waitForTimeout(350);
 const shot=await page.evaluate(()=>impactFixture.snapshot());expect(shot.scale).toBe(.12);expect(shot.age).toBeLessThan(.5);expect(shot.distance).toBeLessThan(10);
 await expect(page.locator('body')).not.toHaveClass(/cinematic/,{timeout:6000});
});

test('missile taps select other missiles while swipes only orbit; analytics fits the arena',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
 await page.locator('#setup summary').click();await page.locator('#wobble').uncheck();await page.locator('#go').click();
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 expect(await page.evaluate(()=>impactFixture.selection().wobble)).toBe(false);
 await page.evaluate(()=>impactFixture.missiles());
 const tap=async i=>{const p=await page.evaluate(i=>impactFixture.screenMissile(i),i);if(info.project.name.startsWith('touch'))await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);};
 await tap(0);await expect.poll(()=>page.evaluate(()=>impactFixture.selection().index)).toBe(0);
 await page.waitForTimeout(1500);await tap(1);await expect.poll(()=>page.evaluate(()=>impactFixture.selection().index)).toBe(1);
 const pos=await page.evaluate(()=>impactFixture.screenMissile(1));
 await page.mouse.move(pos.x,pos.y);await page.mouse.down();await page.mouse.move(pos.x+55,pos.y+12,{steps:5});await page.mouse.up();
 expect(await page.evaluate(()=>impactFixture.selection().index)).toBe(1);expect(Math.abs(await page.evaluate(()=>impactFixture.selection().yaw))).toBeGreaterThan(.1);
 await page.locator('#fbtn').click();await page.waitForTimeout(1800);
 const analytics=await page.evaluate(()=>impactFixture.analytics());expect(analytics.outlines).toBe(10);
 for(const p of analytics.corners){expect(Math.abs(p[0])).toBeLessThan(1);expect(Math.abs(p[1])).toBeLessThan(1);expect(p[2]).toBeLessThan(1);}
 const hud=await page.locator('#wind-hud').boundingBox();expect(hud.x).toBeLessThan(20);
 await page.evaluate(()=>impactFixture.windCheck());await page.waitForTimeout(100);
 expect(Math.abs(await page.evaluate(()=>impactFixture.windCheck()))).toBeLessThan(.15);
 await page.screenshot({path:'test-results/'+info.project.name+'-analytics-outlines.png'});expect(errors).toEqual([]);
});

test('local flight with wobble off integrates wind consistently across step sizes',async({page})=>{
 await fixture(page);await page.locator('#go').click();
 const positions=await page.evaluate(()=>[impactFixture.physics(30),impactFixture.physics(120)]);
 for(const p of positions)for(const [i,value] of [.05,39,-20.04].entries())expect(p[i]).toBeCloseTo(value,8);
});

test('analytics records real flight trails and supports pan, wheel, buttons and reset',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);await page.locator('#go').click();
 await expect.poll(()=>page.evaluate(()=>impactFixture.gameplay().state)).toBe('aiming');
 await page.evaluate(()=>impactFixture.testShot());
 await expect.poll(()=>page.evaluate(()=>impactFixture.trails()[0]?.count||0)).toBeGreaterThan(20);
 await page.locator('#fbtn').click();await page.waitForTimeout(1100);
 const paths=await page.evaluate(()=>impactFixture.trails());expect(paths[0].owner).toBe(0);expect(paths[0].visible).toBe(true);
 expect(Math.max(...paths[0].points.filter((_,i)=>i%3===1))).toBeGreaterThan(5);
 await page.locator('#hf [data-f="1"]').click();await expect.poll(()=>page.evaluate(()=>impactFixture.trails()[0].visible)).toBe(false);
 await page.locator('#hf [data-f="-1"]').click();await expect.poll(()=>page.evaluate(()=>impactFixture.trails()[0].visible)).toBe(true);
 await page.locator('#heat-zoom-in').click();expect(await page.evaluate(()=>impactFixture.analyticsCamera().distance)).toBeCloseTo(.8);
 const width=page.viewportSize().width,height=page.viewportSize().height;
 await page.mouse.move(width*.65,height*.65);await page.mouse.down();await page.mouse.move(width*.65+40,height*.65+20,{steps:5});await page.mouse.up();
 expect(Math.abs(await page.evaluate(()=>impactFixture.analyticsCamera().x))).toBeGreaterThan(1);
 await page.mouse.wheel(0,120);await expect.poll(()=>page.evaluate(()=>impactFixture.analyticsCamera().distance)).toBeGreaterThan(.8);
 await page.locator('#heat-reset').click();expect(await page.evaluate(()=>impactFixture.analyticsCamera())).toMatchObject({x:0,z:0,distance:1});
 await page.screenshot({path:'test-results/'+info.project.name+'-analytics-trails.png'});expect(errors).toEqual([]);
});

test('airborne wind visibly shifts a launcher shot and agrees with its aim guide',async({page})=>{
 await fixture(page);await page.locator('#go').click();
 const [calm,windy]=await page.evaluate(()=>[impactFixture.windFlight(0),impactFixture.windFlight(1.2)]);
 expect(windy.p[0]-calm.p[0]).toBeCloseTo(5.4,7);
 expect(windy.p[1]).toBeCloseTo(calm.p[1],7);expect(windy.p[2]).toBeCloseTo(calm.p[2],7);
 for(let i=0;i<3;i++)expect(windy.p[i]).toBeCloseTo(windy.guide[i],7);
});
