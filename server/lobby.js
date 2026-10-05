import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes, randomUUID } from 'node:crypto';
import { allowedOrigins, acceptsOrigin } from './origins.js';
import { Duel, matchConfig, validName } from './duel.js';

export function attachLobby(httpServer,{graceMs=30000,origins=process.env.PUBLIC_ORIGINS||process.env.PUBLIC_ORIGIN||'',maxConnectionsPerIP=Number(process.env.MAX_CONNECTIONS_PER_IP)||12}={}) {
  const permitted=allowedOrigins(origins);
  if(!Number.isInteger(maxConnectionsPerIP)||maxConnectionsPerIP<1||maxConnectionsPerIP>256)throw new Error('MAX_CONNECTIONS_PER_IP must be between 1 and 256.');
  const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
  const sessions=new Map(),rooms=new Map();let disposed=false;
  const send=(s,type,data={})=>{if(s?.ws?.readyState===WebSocket.OPEN&&s.ws.bufferedAmount<256000)s.ws.send(JSON.stringify({type,...data}));};
  const error=(s,message)=>send(s,'error',{message});
  const list=s=>send(s,'rooms',{rooms:[...rooms.values()].filter(r=>!r.game&&r.host.ws&&r.host.name.toLowerCase().includes(s.query||'')).map(r=>({id:r.id,host:r.host.name,config:r.config,requests:r.pending.size})).slice(0,50)});
  const refresh=()=>{for(const s of sessions.values())if(s.searching)list(s);};
  const hostUpdate=r=>send(r.host,'hosting',{room:r.id,requests:[...r.pending.values()].map(s=>({id:s.id,name:s.name}))});
  const releasePending=(s,message)=>{if(!s.pending)return;const r=rooms.get(s.pending);r?.pending.delete(s.id);s.pending=null;if(r)hostUpdate(r);if(message)send(s,'notice',{message});};
  const closeRoom=(r,message)=>{
    rooms.delete(r.id);
    for(const s of r.pending.values()){s.pending=null;send(s,'notice',{message});}
    for(const s of r.players||[r.host]){s.room=null;send(s,'roomClosed',{message});}
    refresh();
  };
  const broadcast=r=>{const snapshot=r.game.snapshot();for(const s of r.players)send(s,'snapshot',{snapshot,paused:r.players.some(p=>!p.ws)});};
  const startMessage=(r,s)=>send(s,'match',{room:r.id,seat:r.players.indexOf(s),names:r.players.map(p=>p.name),config:r.config,snapshot:r.game.snapshot()});
  const leave=s=>{
    releasePending(s);const r=rooms.get(s.room);
    if(r)closeRoom(r,r.game?`${s.name} left the match.`:'The host closed this room.');
    s.room=null;send(s,'left');
  };
  const upgrade=(request,socket,head)=>{
    if(request.url?.split('?')[0]!=='/socket')return;
    const origin=request.headers.origin;
    const validOrigin=acceptsOrigin(origin,request.headers.host,permitted);
    if(!validOrigin||wss.clients.size>=256){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
    const ip=request.socket.remoteAddress;
    if([...wss.clients].filter(ws=>ws.ip===ip).length>=maxConnectionsPerIP){socket.destroy();return;}
    wss.handleUpgrade(request,socket,head,ws=>{ws.ip=ip;wss.emit('connection',ws);});
  };
  httpServer.on('upgrade',upgrade);
  wss.on('connection',ws=>{
    let session=null,budget=100,last=Date.now();ws.alive=true;
    const helloTimeout=setTimeout(()=>{if(!session)ws.close(1008,'Choose a username first');},10000);helloTimeout.unref();
    ws.on('pong',()=>{ws.alive=true;});
    ws.on('error',()=>{});
    ws.on('message',(bytes,binary)=>{
      const now=Date.now();budget=Math.min(100,budget+(now-last)*.05);last=now;
      if(--budget<0||binary){ws.close(1008,'Too many requests');return;}
      let m;try{m=JSON.parse(bytes.toString());}catch{ws.close(1008,'Invalid message');return;}
      if(!m||typeof m!=='object'||Array.isArray(m))return;
      if(!session){
        if(m.type!=='hello')return;
        const previous=typeof m.token==='string'?sessions.get(m.token):null;
        if(previous&&previous.ws===null&&previous.deadline>now){session=previous;}
        else{
          if(m.token){ws.send(JSON.stringify({type:'resumeRejected',message:'Your online session has expired. Create a name to play again.'}));ws.close(1008,'Session expired');return;}
          const name=typeof m.name==='string'?m.name.trim():'';
          if(!validName(name)){ws.send(JSON.stringify({type:'error',message:'Use 3–20 letters, numbers, spaces, underscores or hyphens.'}));return;}
          if([...sessions.values()].some(s=>s.name.toLowerCase()===name.toLowerCase())){ws.send(JSON.stringify({type:'error',message:'That name is already in use. Try another.'}));return;}
          if(sessions.size>=256){ws.close(1013,'Lobby is full');return;}
          session={id:randomUUID(),token:randomBytes(32).toString('hex'),name,room:null,pending:null,seq:0,query:'',searching:false};sessions.set(session.token,session);
        }
        clearTimeout(helloTimeout);session.ws=ws;session.deadline=0;send(session,'hello',{name:session.name,token:session.token,seq:session.seq});
        const r=rooms.get(session.room);if(r?.game){startMessage(r,session);broadcast(r);}else if(r)hostUpdate(r);else list(session);
        return;
      }
      const s=session,r=rooms.get(s.room);
      if(m.type==='search'){
        if(typeof m.query!=='string'||m.query.length>20)return;
        s.query=m.query.toLowerCase();s.searching=true;list(s);
      }else if(m.type==='host'){
        if(r||s.pending)return error(s,'Leave your current room or request first.');
        if(rooms.size>=100)return error(s,'No room slots available. Try again shortly.');
        const room={id:randomUUID().slice(0,8),host:s,config:matchConfig(m.config),pending:new Map(),created:now};
        rooms.set(room.id,room);s.room=room.id;s.searching=false;hostUpdate(room);refresh();
      }else if(m.type==='join'){
        const room=rooms.get(m.room);if(r||s.pending)return error(s,'Cancel your current request first.');
        if(!room||room.game||!room.host.ws||room.host===s)return error(s,'That room is no longer available.');
        if(room.pending.size>=8)return error(s,'That host has too many requests. Try another room.');
        s.pending=room.id;s.country=matchConfig({p2country:m.country}).p2country;room.pending.set(s.id,s);s.searching=false;
        send(s,'pending',{host:room.host.name,room:room.id});hostUpdate(room);refresh();
      }else if(m.type==='decide'){
        if(!r||r.host!==s||r.game)return error(s,'Only the host can accept a request.');
        const guest=r.pending.get(m.id);if(!guest||!guest.ws)return error(s,'That player is no longer waiting.');
        if(m.accept===false){releasePending(guest,`${s.name} declined your request.`);refresh();return;}
        if(m.accept!==true)return;
        r.config.p2country=guest.country;r.players=[s,guest];r.game=new Duel(r.config,randomBytes(4).readUInt32LE());
        for(const candidate of r.pending.values()){candidate.pending=null;if(candidate!==guest)send(candidate,'notice',{message:'The host accepted another player.'});}
        r.pending.clear();guest.room=r.id;
        for(const p of r.players){p.searching=false;startMessage(r,p);}refresh();
      }else if(m.type==='cancel'){releasePending(s,'Request cancelled.');refresh();}
      else if(m.type==='leave')leave(s);
      else if(m.type==='action'){
        if(!r?.game||r.players.some(p=>!p.ws))return;
        if(!Number.isSafeInteger(m.seq)||m.seq<=s.seq)return;
        s.seq=m.seq;r.game.command(r.players.indexOf(s),m);
      }
    });
    ws.on('close',()=>{
      clearTimeout(helloTimeout);if(!session||session.ws!==ws)return;
      const s=session;s.ws=null;s.deadline=Date.now()+graceMs;releasePending(s);
      const r=rooms.get(s.room);
      if(r?.game){r.game.held=0;r.game.charging=null;broadcast(r);}
      else if(r)closeRoom(r,'The host disconnected.');
      refresh();
    });
  });
  let previous=performance.now(),accumulator=0,frames=0;
  const loop=setInterval(()=>{
    const now=performance.now();accumulator+=Math.min((now-previous)/1000,.25);previous=now;
    while(accumulator>=1/120){for(const r of rooms.values())if(r.game&&r.players.every(p=>p.ws))r.game.step();accumulator-=1/120;}
    if(++frames%3===0)for(const r of rooms.values())if(r.game)broadcast(r);
  },1000/60);loop.unref();
  const sweep=setInterval(()=>{
    const now=Date.now();
    for(const s of sessions.values())if(!s.ws&&s.deadline<=now){const r=rooms.get(s.room);if(r)closeRoom(r,`${s.name} disconnected. Match ended.`);sessions.delete(s.token);}
    for(const r of rooms.values())if(now-r.created>(r.game?7200000:1200000))closeRoom(r,'This room expired. Create a new one.');
    for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}
  },5000);sweep.unref();
  const close=()=>{if(disposed)return;disposed=true;clearInterval(loop);clearInterval(sweep);httpServer.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();sessions.clear();rooms.clear();};
  httpServer.once('close',close);
  return {close,rooms,sessions};
}
