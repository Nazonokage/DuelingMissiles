import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ViewTransition } from '../src/camera/view-transition.js';

test('inspection entry, interruption and exit start from the visible pose and reach their focus',()=>{
  const view=new ViewTransition(),position=new THREE.Vector3(0,20,100),look=new THREE.Vector3(0,2,70);
  for(const [mode,destination,target] of [
    ['director',new THREE.Vector3(0,270,90),new THREE.Vector3()],
    ['heat',new THREE.Vector3(0,320,40),new THREE.Vector3()],
    ['play',new THREE.Vector3(0,20,-100),new THREE.Vector3(0,2,-70)]
  ]){
    const origin=position.clone(),oldLook=look.clone(),p=destination.clone(),t=target.clone();
    view.apply(mode,0,p,t,position,look);
    assert.deepEqual(p,origin);assert.deepEqual(t,oldLook);
    for(let i=0;i<10;i++){
      p.copy(destination);t.copy(target);view.apply(mode,1/60,p,t,position,look);
      assert.ok(p.distanceTo(position)<15,'no sudden camera jump');position.copy(p);look.copy(t);
    }
    if(mode!=='play')continue; // Change mode before the preceding transition has finished.
    p.copy(destination);t.copy(target);view.apply(mode,1,p,t,position,look);
    assert.deepEqual(p,destination);assert.deepEqual(t,target);
  }
});

test('reduced motion cuts to the requested view without residual interpolation',()=>{
  const view=new ViewTransition(),p=new THREE.Vector3(0,320,40),t=new THREE.Vector3(),from=new THREE.Vector3(10,20,70);
  view.apply('heat',1/60,p,t,from,from,true);assert.deepEqual(p,new THREE.Vector3(0,320,40));
  p.copy(from);view.apply('play',1/60,p,t,new THREE.Vector3(0,320,40),t,true);assert.deepEqual(p,from);
});
