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
