import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ImpactCamera } from '../src/camera/impact-camera.js';

test('follow camera settles close, stays still, and renews focus for each explosion',()=>{
 for(const z of [-72,72])for(const aspect of [.46,1.6]){
  const c=new ImpactCamera(),hit=new THREE.Vector3(20,2.6,z),cam={aspect,position:new THREE.Vector3(20,15,0),fov:55};
  assert.equal(c.trigger(hit,cam,new THREE.Vector3(),1),true);
  const position=new THREE.Vector3(0,80,100),target=new THREE.Vector3();
  c.apply(.3,position,target);assert.ok(position.distanceTo(hit)<10);assert.deepEqual(target,hit);
  assert.ok(z*(position.z-z)<0);assert.equal(c.timeScale,.12);
  const next=new THREE.Vector3(22,2.6,z);assert.equal(c.trigger(next,cam,target,-1),true);
  assert.equal(c.age,0);assert.deepEqual(c.target,next);
  c.apply(.3,position,target);assert.deepEqual(target,next);
  const parked=position.clone();c.apply(.8,position,target);assert.deepEqual(position,parked);assert.deepEqual(target,next);
 }
});
test('cinematic returns to the live gameplay camera and restores normal time',()=>{
 const c=new ImpactCamera();c.trigger(new THREE.Vector3(0,1,70),{aspect:1,position:new THREE.Vector3(0,15,0),fov:55},new THREE.Vector3(),1);
 const home=new THREE.Vector3(12,30,-20),look=new THREE.Vector3(10,2,0),p=home.clone(),t=look.clone();
 c.apply(2.4,p,t);assert.ok(c.timeScale>.12&&c.timeScale<1);
 p.copy(home);t.copy(look);c.apply(.6,p,t);
 assert.deepEqual(p,home);assert.deepEqual(t,look);assert.equal(c.active,false);assert.equal(c.timeScale,1);
});
test('inspection view overrides leave the camera and time alone',()=>{
 const c=new ImpactCamera(),p=new THREE.Vector3(1,2,3),t=new THREE.Vector3();
 assert.equal(c.trigger(t,{aspect:1,position:new THREE.Vector3(0,15,0),fov:55},t,1,false),false);assert.equal(c.timeScale,1);
 c.trigger(t,{aspect:1,position:new THREE.Vector3(0,15,0),fov:55},t,1);c.apply(.1,p,t,false);
 assert.deepEqual(p,new THREE.Vector3(1,2,3));assert.equal(c.active,false);assert.equal(c.timeScale,1);
});

test('reduced motion cuts to a stationary explosion focus instead of disabling it',()=>{
 const c=new ImpactCamera(),hit=new THREE.Vector3(0,2,70),cam={position:new THREE.Vector3(0,30,-50),aspect:1,fov:55};
 c.trigger(hit,cam,new THREE.Vector3(),1,true,true);const p=cam.position.clone(),t=new THREE.Vector3();
 c.apply(.01,p,t);assert.ok(p.distanceTo(hit)<10);assert.deepEqual(t,hit);assert.equal(c.timeScale,.12);
 const parked=p.clone();c.apply(1,p,t);assert.deepEqual(p,parked);
});
