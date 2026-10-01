import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicManager } from '../src/audio/music-manager.js';
import { createCameraControls, CAMERA_DEFAULTS } from '../src/camera/touch-look.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class AudioStub extends EventTarget {
  paused=true; currentTime=0; calls=0;
  play(){this.calls++;this.paused=false;return this.failure?Promise.reject(this.failure):Promise.resolve()}
  pause(){this.paused=true} removeAttribute(){} load(){}
}
const setup=(ids=['song','song'])=>{const m=new MusicManager({song:{url:'/test.wav'},none:{url:''}},()=>ids,()=>new AudioStub());m.refresh();return m};
test('jukebox continues across turns and pauses for mute, background and match end',async()=>{
 const m=setup();await flush();const a=m.audio;a.currentTime=12;
 m.setTurn(1);await flush();assert.equal(m.audio,a);assert.equal(a.currentTime,12);
 m.setMuted(true);assert.equal(a.paused,true);m.setMuted(false);await flush();assert.equal(a.paused,false);
 m.setHidden(true);assert.equal(a.paused,true);m.setHidden(false);await flush();assert.equal(a.paused,false);
 m.stop();m.resume();await flush();assert.equal(a.paused,true);
});
test('empty sources are skipped, autoplay retries and failed tracks exhaust the queue',async()=>{
 const empty=new MusicManager({none:{url:''}},null,()=>new AudioStub());empty.refresh();assert.equal(empty.audio,null);
 const m=setup();await flush();const a=m.audio;a.paused=true;a.failure={name:'NotAllowedError'};
 m.resume();await flush();a.paused=true;a.failure=null;m.resume();await flush();assert.equal(a.calls,3);
 a.onerror();m.resume();await flush();assert.equal(a.calls,3);assert.equal(m.queue.length,0);
});
test('late audio promises cannot resume stopped or backgrounded music',async()=>{
 const m=setup();await flush();let resolve;const a=m.audio;a.paused=true;
 a.play=()=>new Promise(r=>resolve=()=>{a.paused=false;r()});m.resume();await flush();m.stop();resolve();await flush();assert.equal(a.paused,true);
});
class Surface {
 handlers={};captures=new Set();
 addEventListener(k,f){this.handlers[k]=f} removeEventListener(k){delete this.handlers[k]}
 setPointerCapture(id){this.captures.add(id)} hasPointerCapture(id){return this.captures.has(id)} releasePointerCapture(id){this.captures.delete(id)}
 emit(k,id,x,y=100){this.handlers[k]({pointerId:id,clientX:x,clientY:y,button:0})}
}
test('camera tracks pointer IDs, pinches, resets and clears gestures on mode changes',()=>{
 const s=new Surface(),r={...CAMERA_DEFAULTS};let enabled=true;
 const c=createCameraControls(s,r,()=>enabled,()=>1000);
 s.emit('pointerdown',1,100);s.emit('pointermove',99,200);assert.equal(r.manual,false);
 s.emit('pointermove',1,110);assert.equal(r.manual,true);const yaw=r.yaw;
 s.emit('pointerdown',2,210);s.emit('pointermove',2,310);assert.equal(r.distance,40);assert.equal(r.yaw,yaw);
 s.emit('pointerup',2,310);s.emit('pointermove',1,115);assert.ok(Math.abs(r.yaw-yaw)<.1);
 enabled=false;c.update();assert.equal(s.captures.size,0);enabled=true;s.emit('pointermove',1,400);const last=r.yaw;assert.ok(Math.abs(last-yaw)<.1);
 c.reset();assert.equal(r.manual,false);assert.equal(r.distance,CAMERA_DEFAULTS.distance);c.dispose();assert.equal(Object.keys(s.handlers).length,0);
});

import { driftRate, driftLauncher } from '../src/game/missile-drift.js';
test('launcher drift waits for each shot apex, preserves speed and is consistent across step sizes',()=>{
 const initial={x:0,y:12,z:-40};
 for(const apex of [.25,1.2,3]){
   const v={...initial};driftLauncher(v,0,apex,2,apex);assert.deepEqual(v,initial);
   driftLauncher(v,apex,.2,2,apex);assert.notEqual(v.x,0);
 }
 const apex=12/18;
 const run=hz=>{const v={...initial};for(let i=0;i<hz*3;i++)driftLauncher(v,i/hz,1/hz,2,apex);return v};
 const a=run(30),b=run(120);assert.ok(Math.abs(a.x)>.1);assert.ok(Math.abs(a.x-b.x)<.1);
 assert.ok(Math.abs(Math.hypot(a.x,a.z)-40)<1e-8);assert.equal(a.y,12);
 const crossing={...initial},descending={...initial};
 driftLauncher(crossing,.9,.2,2,1);driftLauncher(descending,1,.1,2,1);
 assert.ok(Math.abs(crossing.x-descending.x)<1e-10);
 assert.equal(driftRate(.5,3),0);assert.notEqual(driftRate(2,3),driftRate(2,4));
});
test('bird camera uses independent zoom/pitch limits and reset defaults',()=>{
 const s=new Surface(),defaults={yaw:0,pitch:1.3,distance:95,manual:false},r={...defaults};
 const c=createCameraControls(s,r,()=>true,()=>1000,{defaults,distance:[35,240],pitch:[.55,1.48]});
 s.emit('pointerdown',1,100);s.emit('pointermove',1,180,300);assert.equal(r.pitch,1.48);
 s.handlers.wheel({deltaY:-100000,preventDefault(){}});assert.equal(r.distance,35);
 s.handlers.wheel({deltaY:100000,preventDefault(){}});assert.equal(r.distance,240);
 c.reset();assert.deepEqual(r,defaults);c.dispose();
});
