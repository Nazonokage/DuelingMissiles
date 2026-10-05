import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {setTurnWind,windLevel,WIND_MIN,WIND_MAX} from '../src/game/wind.js';
import {seededRandom} from '../src/game/simulation.js';
import {Duel} from '../server/duel.js';

test('seeded turn winds stay in the playable range and cover every direction',()=>{
 const a=seededRandom(2026),b=seededRandom(2026),quadrants=new Set();
 for(let i=0;i<1000;i++){
  const wind=setTurnWind(new Vector3(),a);assert.deepEqual(wind,setTurnWind(new Vector3(),b));
  assert.equal(wind.y,0);assert.ok(wind.length()>=WIND_MIN-1e-10&&wind.length()<=WIND_MAX+1e-10);
  quadrants.add((wind.x>=0?'E':'W')+(wind.z>=0?'S':'N'));
 }
 assert.equal(quadrants.size,4);
 assert.equal(windLevel(0),'Calm');assert.equal(windLevel(.6),'Light');assert.equal(windLevel(1.2),'Moderate');assert.equal(windLevel(1.8),'Strong');
});

test('normal server turn wind visibly moves a rising launcher missile with wobble disabled',()=>{
 const run=calm=>{
  const g=new Duel({wobble:false},2026);if(calm)g.wind.set(0,0,0);
  const wind=g.wind.clone();g.state='flying';
  g.ball={p:new Vector3(0,40,0),v:new Vector3(0,25,-20),t:0,seed:1,apexTime:25/18,side:0,used:false};
  for(let i=0;i<120;i++)g.step();const climb=g.ball.p.clone();
  for(let i=0;i<240;i++)g.step();return {wind,climb,p:g.ball.p.clone()};
 };
 const calm=run(true),windy=run(false);
 assert.ok(windy.climb.clone().sub(calm.climb).distanceTo(windy.wind.clone().multiplyScalar(.5))<1e-8);
 const offset=windy.p.clone().sub(calm.p);assert.ok(offset.distanceTo(windy.wind.clone().multiplyScalar(4.5))<1e-8);
 assert.ok(offset.length()>=2.7&&offset.length()<=8.1);assert.equal(windy.p.y,calm.p.y);
});
