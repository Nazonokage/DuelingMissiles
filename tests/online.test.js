import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { Vector3 } from 'three';
import { Duel,validName,matchConfig } from '../server/duel.js';
import { attachLobby } from '../server/lobby.js';

const advance=(g,seconds)=>{for(let i=0;i<seconds*120;i++)g.step();};
const command=(g,action,data={},player=g.turn)=>g.command(player,{turnId:g.turnId,action,...data});
test('anonymous names and host settings are bounded and normalized',()=>{
  for(const name of ['Sky-1234','Pilot Three','A_b'])assert.equal(validName(name),true);
  for(const name of ['',null,'ab','<img src=x>','a'.repeat(21),' name'])assert.equal(validName(name),false);
  assert.deepEqual(matchConfig({n:900,hp:500,theme:'x'}),{n:5,hp:2,theme:'blueprint',p1country:'italy',p2country:'france'});
});
test('server owns charging, shot result, health and turn; stale/out-of-turn controls are rejected',()=>{
  const g=new Duel({},14);advance(g,1.5);
  assert.equal(command(g,'charge',{},1),false);assert.equal(g.command(0,{turnId:0,action:'charge'}),false);
  assert.equal(command(g,'charge'),true);advance(g,.3);assert.equal(command(g,'release',{power:999,hp:999}),true);
  assert.equal(command(g,'release'),false);const speed=g.ball.v.length();assert.ok(speed<40);
  assert.equal(g.ball.owner,0);advance(g,8);assert.equal(g.turn,1);assert.equal(g.spent.length,1);
  assert.equal(g.cannons[0][2].hp,2);
});
test('authoritative damage ends a duel, last launcher ignores cooldown, and recasts retain launch and boost',()=>{
  const g=new Duel({hp:1},3);for(const c of g.cannons[0])c.hp=0;g.cannons[0][1].hp=1;g.cannons[0][1].cool=1;g.beginTurn();advance(g,1.5);
  assert.equal(g.sel,1);assert.equal(g.cannons[0][1].locked,false);command(g,'charge');command(g,'release');assert.equal(g.cannons[0][1].cool,0);
  g.ball.p.set(0,.2,0);g.step();advance(g,3.1);g.turn=0;g.beginTurn();advance(g,1.5);
  assert.equal(command(g,'takeover',{id:g.spent[0].id}),true);assert.equal(g.state,'control');
  assert.equal(command(g,'go'),true);assert.equal(g.ball.armed,true);assert.equal(command(g,'go'),true);assert.equal(command(g,'go'),false);assert.equal(g.ball.boosted,true);
  const target=g.cannons[1][0];for(const c of g.cannons[1])c.hp=0;target.hp=1;
  g.ball.p.set(target.x,1.4,target.z);g.ball.t=1;g.step();assert.equal(g.state,'over');assert.equal(g.winner,0);
});
test('one-hold steering and match snapshots are deterministic',()=>{
  const run=()=>{const g=new Duel({},123);advance(g,1.5);command(g,'steer',{value:1});advance(g,.2);command(g,'steer',{value:0});advance(g,.1);
    const yaw=g.cannons[0][2].aim.yaw;command(g,'steer',{value:-1});advance(g,.2);assert.equal(g.cannons[0][2].aim.yaw,yaw);
    command(g,'charge');advance(g,.5);command(g,'release');advance(g,3);return g.snapshot();};
  assert.deepEqual(run(),run());
});

async function fixture(t){
 const server=createServer(),lobby=attachLobby(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const sockets=[];t.after(async()=>{for(const ws of sockets)ws.terminate();lobby.close();await new Promise(resolve=>server.close(resolve));});
 const client=async name=>{
  const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/socket`);sockets.push(ws);const messages=[];
  ws.on('message',data=>messages.push(JSON.parse(data)));await once(ws,'open');
  const send=m=>ws.send(JSON.stringify(m));
  const wait=async(type,predicate=()=>true)=>{const deadline=Date.now()+3000;while(Date.now()<deadline){const i=messages.findIndex(m=>m.type===type&&predicate(m));if(i>=0)return messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,10));}throw new Error(`No ${type}: ${JSON.stringify(messages.slice(-3))}`);};
  send({type:'hello',name});const hello=await wait('hello');return {ws,send,wait,hello,messages};
 };
 return {lobby,client};
}
test('real sockets search by host, require approval, reject impostors and duplicate turns, and clean up',async t=>{
 const {lobby,client}=await fixture(t),host=await client('Host-Pilot'),guest=await client('Guest-Pilot'),outsider=await client('Other-Pilot');
 host.send({type:'host',config:{n:7,hp:3}});const room=(await host.wait('hosting')).room;
 guest.send({type:'search',query:'HOST'});const results=await guest.wait('rooms',m=>m.rooms.length===1);assert.equal(results.rooms[0].host,'Host-Pilot');
 guest.send({type:'join',room,country:'japan'});await guest.wait('pending');const request=await host.wait('hosting',m=>m.requests.length===1);
 outsider.send({type:'decide',id:request.requests[0].id,accept:true});assert.match((await outsider.wait('error')).message,/Only the host/);assert.equal(lobby.rooms.get(room).game,undefined);
 host.send({type:'decide',id:request.requests[0].id,accept:false});assert.match((await guest.wait('notice')).message,/declined/);
 guest.send({type:'join',room,country:'japan'});await guest.wait('pending');const next=await host.wait('hosting',m=>m.requests.length===1);
 host.send({type:'decide',id:next.requests[0].id,accept:true});const match=await host.wait('match');const other=await guest.wait('match');
 assert.equal(match.seat,0);assert.equal(other.seat,1);assert.deepEqual(match.names,other.names);assert.equal(match.config.p2country,'japan');
 const g=lobby.rooms.get(room).game;advance(g,1.5);
 guest.send({type:'action',seq:1,turnId:g.turnId,action:'charge'});await new Promise(r=>setTimeout(r,20));assert.equal(g.charging,null);
 host.send({type:'action',seq:1,turnId:g.turnId,action:'charge'});await new Promise(r=>setTimeout(r,20));assert.notEqual(g.charging,null);
 host.send({type:'action',seq:1,turnId:g.turnId,action:'release'});await new Promise(r=>setTimeout(r,20));assert.equal(g.ball,null);
 host.send({type:'action',seq:2,turnId:g.turnId,action:'release'});await host.wait('snapshot',m=>m.snapshot.ball!==null);assert.ok(g.ball);
 host.send({type:'leave'});await guest.wait('roomClosed');assert.equal(lobby.rooms.size,0);
});
test('cancelled requests disappear and a disconnected duel pauses then resumes with its secret token',async t=>{
 const {lobby,client}=await fixture(t),host=await client('Host-Two'),guest=await client('Guest-Two');
 host.send({type:'host'});const room=(await host.wait('hosting')).room;
 guest.send({type:'join',room});await guest.wait('pending');await host.wait('hosting',m=>m.requests.length===1);
 guest.send({type:'cancel'});await guest.wait('notice');await host.wait('hosting',m=>m.requests.length===0);
 guest.send({type:'join',room});await guest.wait('pending');const request=await host.wait('hosting',m=>m.requests.length===1);
 host.send({type:'decide',id:request.requests[0].id,accept:true});await host.wait('match');await guest.wait('match');
 guest.ws.close();await once(guest.ws,'close');await host.wait('snapshot',m=>m.paused);
 const g=lobby.rooms.get(room).game,tick=g.tick;await new Promise(r=>setTimeout(r,100));assert.equal(g.tick,tick);
 // A new transport resumes the existing identity rather than submitting a username as proof.
 const ws=new WebSocket(host.ws.url);t.after(()=>ws.terminate());const incoming=[];ws.on('message',d=>incoming.push(JSON.parse(d)));await once(ws,'open');
 ws.send(JSON.stringify({type:'hello',token:guest.hello.token,name:'Wrong-Name'}));
 await new Promise(r=>setTimeout(r,100));assert.ok(incoming.some(m=>m.type==='match'&&m.seat===1));assert.ok(g.tick>tick);
});
