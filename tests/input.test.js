import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeldInput, bindHoldButton } from '../src/game/input.js';

test('overlapping keys and pointers release only their own hold', () => {
  const state={l:0,r:0},calls=[];
  const input=createHeldInput(state,()=>calls.push('down'),()=>calls.push('up'),()=>calls.push('cancel'));
  input.press('l','KeyA');input.press('l','ArrowLeft');input.press('l','pointer:1');
  input.release('l','KeyA');input.release('l','ArrowLeft');assert.equal(state.l,1);
  input.release('l','pointer:1');assert.equal(state.l,0);
  input.press('fire','Space');input.press('fire','Space');input.press('fire','pointer:2');
  input.release('fire','Space');assert.deepEqual(calls,['down']);
  input.release('fire','pointer:2');input.release('fire','untracked');assert.deepEqual(calls,['down','up']);
  input.press('fire','Enter');input.press('r','KeyD');input.clear();input.release('fire','Enter');
  assert.equal(state.r,0);assert.deepEqual(calls,['down','up','down','cancel']);
});
test('pointer capture retains a drag outside the button; cancellation never fires', () => {
  const handlers={},captures=new Set(),calls=[];
  const button={addEventListener:(k,f)=>handlers[k]=f,setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
  bindHoldButton(button,'fire',createHeldInput({},()=>calls.push('down'),()=>calls.push('up'),()=>calls.push('cancel')));
  const e={button:0,pointerId:1,preventDefault(){}};
  handlers.pointerdown(e);assert.equal(captures.has(1),true);assert.equal(handlers.pointerleave,undefined);
  handlers.pointercancel(e);handlers.lostpointercapture(e);handlers.pointerup(e);
  assert.deepEqual(calls,['down','cancel']);assert.equal(captures.size,0);
  handlers.pointerdown(e);handlers.pointerup(e);handlers.lostpointercapture(e);assert.deepEqual(calls,['down','cancel','down','up']);
});
