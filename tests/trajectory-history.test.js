import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {TrajectoryHistory} from '../src/game/trajectory-history.js';
test('recorded flight paths preserve altitude, endpoints, filters and bounded history',()=>{
 const h=new TrajectoryHistory(2),p=h.begin(0,0xff0000,new Vector3(0,2,0));
 h.add(p,new Vector3(0,2.1,0));assert.equal(p.count,1);
 h.add(p,new Vector3(0,6,-3));h.add(p,new Vector3(0,6,-3.1),true);assert.equal(p.count,3);
 assert.equal(p.line.geometry.attributes.position.getY(1),6);
 h.show(true,1);assert.equal(h.group.visible,true);assert.equal(p.line.visible,false);
 const q=h.begin(1,0x00ff00,new Vector3());h.show(true,1);assert.equal(q.line.visible,true);
 let disposed=false;p.line.geometry.addEventListener('dispose',()=>disposed=true);
 h.begin(0,0xffffff,new Vector3());assert.equal(h.paths.length,2);assert.equal(h.group.children.length,2);assert.equal(disposed,true);
 h.show(false);assert.equal(h.group.visible,false);
});
