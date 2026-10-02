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
  if(mode!=='play')expect(samples.at(-1)[1]).toBeCloseTo(mode==='heat'?320:270,1);
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
