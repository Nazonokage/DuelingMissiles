import { test, expect } from '@playwright/test';
test('setup, camera, shot, turn switch and sound toggle',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#go')).toBeVisible();
 await page.keyboard.press('Space');await page.keyboard.press('m');

 await page.locator('#go').click();await expect(page.locator('#setup')).toBeHidden();
 await expect(page.locator('#label')).toHaveText('PLAYER 1');
 await page.waitForTimeout(1800);
 await page.screenshot({path:`test-results/${info.project.name}-aiming.png`});
 await page.mouse.move(180,140);await page.mouse.down();await page.mouse.move(230,170,{steps:5});await page.mouse.up();
 await page.locator('#reset-camera').click();await expect(page.locator('#hint')).toHaveText('Camera reset');
 await page.locator('#sbtn').click();await expect(page.locator('#sbtn')).toHaveText('🔇');
 await page.locator('#sbtn').click();await expect(page.locator('#sbtn')).toHaveText('🔊');

 await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');
 await expect(page.locator('#label')).toHaveText('PLAYER 2',{timeout:30000});
 await page.waitForTimeout(2500);
 await page.screenshot({path:`test-results/${info.project.name}.png`});
 expect(errors).toEqual([]);
});

import fs from 'node:fs';
test('real jukebox audio pauses and resumes',async({page})=>{
 // Original test tone, generated here; no third-party recording is distributed.
 const rate=8000,samples=rate*3,wav=Buffer.alloc(44+samples*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*220/rate)*1000),44+i*2);
 await page.route('**/test-tone.wav',r=>r.fulfill({contentType:'audio/wav',body:wav}));
 await page.route('**/test-music.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/audio/music-manager.js','utf8')}));
 await page.goto('/');await page.locator('#go').click();
 await page.evaluate(async()=>{const {MusicManager}=await import('/test-music.js');window.testMusic=new MusicManager({test:{url:'/test-tone.wav'}},()=>['test','test']);window.testMusic.refresh();window.testMusic.setTurn(0)});
 await expect.poll(()=>page.evaluate(()=>testMusic.audio.currentTime)).toBeGreaterThan(.15);
 const position=await page.evaluate(()=>{testMusic.setTurn(1);return testMusic.audio.currentTime});
 await expect.poll(()=>page.evaluate(()=>testMusic.audio.currentTime)).toBeGreaterThan(.15);
 expect(await page.evaluate(()=>testMusic.audio.paused)).toBe(false);
 await page.evaluate(()=>testMusic.setTurn(0));await expect.poll(()=>page.evaluate(()=>testMusic.audio.currentTime)).toBeGreaterThan(position);
 await page.evaluate(()=>testMusic.setMuted(true));expect(await page.evaluate(()=>testMusic.audio.paused)).toBe(true);
 await page.evaluate(()=>{testMusic.setMuted(false);testMusic.setHidden(true)});expect(await page.evaluate(()=>testMusic.audio.paused)).toBe(true);
 await page.evaluate(()=>testMusic.setHidden(false));await expect.poll(()=>page.evaluate(()=>testMusic.audio.paused)).toBe(false);
 await page.evaluate(()=>testMusic.stop());expect(await page.evaluate(()=>testMusic.audio.paused)).toBe(true);
});

test('spent missile camera can orbit, zoom and reset before recast launch and boost',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#go').click();
 for(const player of [2,1]){
   await page.waitForTimeout(1800);await page.keyboard.down('Space');await page.waitForTimeout(250);await page.keyboard.up('Space');
   await expect(page.locator('#label')).toHaveText(`PLAYER ${player}`,{timeout:30000});
 }
 await page.waitForTimeout(1800);await page.keyboard.press('m');
 await expect(page.locator('#st')).toContainText('take over');
 await page.mouse.move(180,130);await page.mouse.down();await page.mouse.move(210,150,{steps:5});await page.mouse.up();await page.mouse.wheel(0,-700);
 await page.keyboard.press('Space');await expect(page.locator('#st')).toContainText('FIRE to launch');
 await page.mouse.move(170,140);await page.mouse.down();await page.mouse.move(195,155,{steps:5});await page.mouse.up();await page.mouse.wheel(0,-300);
 await page.locator('#reset-camera').click();await page.waitForTimeout(700);
 await page.screenshot({path:`test-results/${info.project.name}-missile-view.png`});
 await page.keyboard.press('Space');await expect(page.locator('#st')).toContainText('FIRE = boost');
 await page.keyboard.press('Space');await expect(page.locator('#st')).toContainText('boost used');
 expect(errors).toEqual([]);
});

test('screen holds capture drags, cancel safely, and keyboard works after launcher clicks',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('#go').click();await page.waitForTimeout(1600);
 if(!await page.locator('#fire').isVisible())await page.locator('#kb').click();
 await page.locator('#chips button').first().click();
 await page.keyboard.press('e');await expect(page.locator('#chips button.sel')).toHaveText('2');
 await page.keyboard.down('a');await page.waitForTimeout(150);await page.keyboard.up('a');
 await expect(page.locator('#st')).toContainText('angle locked');
 const fire=page.locator('#fire'),box=await fire.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect.poll(()=>page.locator('#pw i').evaluate(el=>parseFloat(el.style.width))).toBeGreaterThan(3);
 await page.mouse.move(10,10);await page.waitForTimeout(100);
 await expect.poll(()=>page.locator('#pw i').evaluate(el=>parseFloat(el.style.width))).toBeGreaterThan(8);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();
 await expect(page.locator('#pw i')).toHaveCSS('width','0px');await expect(page.locator('#label')).toHaveText('PLAYER 1');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 if(info.project.name.startsWith('touch')){
   const cdp=await page.context().newCDPSession(page);
   const point={x:Math.round(box.x+box.width/2),y:Math.round(box.y+box.height/2),id:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(200);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   await expect(page.locator('#pw i')).toHaveCSS('width','0px');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(250);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();
 }
 await expect(page.locator('#label')).toHaveText('PLAYER 2',{timeout:30000});expect(errors).toEqual([]);
});
