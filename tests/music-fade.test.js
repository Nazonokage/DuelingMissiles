import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicManager } from '../src/audio/music-manager.js';

test('music fades from silence, volume changes respect the ramp, and pause cancels it',async t=>{
 const audio={paused:true,src:'',volume:1,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
 const m=new MusicManager({song:{url:'/tone.wav'}},null,()=>audio);t.after(()=>m.stop());m.refresh();
 await new Promise(r=>setImmediate(r));assert.equal(audio.volume,0);
 await new Promise(r=>setTimeout(r,140));assert.ok(audio.volume>0&&audio.volume<.05);
 m.setVolume(.2);assert.ok(audio.volume<.02);m.setMuted(true);const volume=audio.volume;
 await new Promise(r=>setTimeout(r,100));assert.equal(audio.volume,volume);assert.equal(m.fadeTimer,null);
 m.setMuted(false);await new Promise(r=>setImmediate(r));assert.equal(audio.volume,0);m.stop();assert.equal(m.fadeTimer,null);
});
