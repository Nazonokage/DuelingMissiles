import {socketURL} from './endpoint.js';
const $=id=>document.getElementById(id);
const words=['Sky','Cloud','Cobalt','Swift','Quiet','Lucky','Silver','Paper','Azure','Comet','Falcon','Orbit'];
export function randomName(){const n=crypto.getRandomValues(new Uint32Array(2));return `${words[n[0]%words.length]}-${1000+n[1]%9000}`;}
const element=(tag,text,className)=>{const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;};

export class OnlineLobby {
  constructor({config,onMatch,onSnapshot,onClosed,endpoint=import.meta.env?.VITE_GAME_SERVER_URL||''}){
    Object.assign(this,{config,onMatch,onSnapshot,onClosed,endpoint,reconnectTimer:null,stopped:false,ws:null,connected:false,active:false,seat:-1,turnId:0,seq:0,paused:false,names:[],mode:'identity',attempt:0,token:null});
    this.storageKey=null;
    try{this.storageKey='duel-session:'+socketURL(endpoint,location.href);}catch{}
    let saved;try{saved=JSON.parse(sessionStorage.getItem(this.storageKey));}catch{}
    if(saved&&typeof saved.token==='string'&&typeof saved.name==='string'){this.token=saved.token;$('anonymous-name').value=saved.name;}
    else $('anonymous-name').value=randomName();
    $('random-name').onclick=()=>{$('anonymous-name').value=randomName();};
    $('create-name').onclick=()=>this.connect();
    $('anonymous-name').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();this.connect();}};
    $('host-match').onclick=()=>this.send({type:'host',config:this.config()});
    $('search-matches').onclick=()=>{this.mode='search';this.render();this.search();};
    let timer;$('player-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>this.search(),180);};
    $('refresh-matches').onclick=()=>this.search();
    $('cancel-request').onclick=()=>this.send({type:'cancel'});
    $('leave-room').onclick=()=>this.send({type:'leave'});
    $('leave-online').onclick=()=>{this.stopped=true;clearTimeout(this.reconnectTimer);this.forgetSession();this.send({type:'leave'});location.reload();};
    $('online-retry').onclick=()=>this.connect();
    this.render();
  }
  forgetSession(){this.token=null;try{sessionStorage.removeItem(this.storageKey);}catch{}}
  rememberSession(name){try{sessionStorage.setItem(this.storageKey,JSON.stringify({name,token:this.token}));}catch{}}
  status(message){$('lobby-status').textContent=message;}
  send(message){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(message));}
  action(action,data={}){if(this.active&&this.connected&&!this.paused)this.send({type:'action',seq:++this.seq,turnId:this.turnId,action,...data});}
  search(){this.send({type:'search',query:$('player-search').value});}
  connect(){
    clearTimeout(this.reconnectTimer);this.stopped=false;
    if(this.ws&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.ws.readyState)){if(!this.connected)this.send({type:'hello',name:$('anonymous-name').value.trim(),token:this.token});return;}
    const name=$('anonymous-name').value.trim();
    if(!/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(name)){this.status('Choose 3–20 letters, numbers, spaces, underscores or hyphens.');$('anonymous-name').focus();return;}
    this.status('Connecting…');$('create-name').disabled=true;
    let ws;
    try{ws=new WebSocket(socketURL(this.endpoint,location.href));}
    catch(error){this.status(error.message);$('create-name').disabled=false;$('online-retry').hidden=false;return;}
    this.ws=ws;
    const timeout=setTimeout(()=>{if(!this.connected)ws.close();},8000);
    ws.onopen=()=>{if(ws!==this.ws)return;this.send({type:'hello',name,token:this.token});};
    ws.onmessage=event=>{
      if(ws!==this.ws)return;
      let m;try{m=JSON.parse(event.data);}catch{return;}
      if(m.type==='hello'){
        clearTimeout(timeout);this.connected=true;this.token=m.token;this.seq=m.seq;this.attempt=0;this.rememberSession(m.name);
        $('anonymous-name').value=m.name;this.mode='lobby';this.status(`Ready as ${m.name}. Host a match or find a player.`);this.render();
      }else if(m.type==='resumeRejected'){
        this.stopped=true;this.forgetSession();this.connected=false;this.mode='identity';
        if(this.active){this.active=false;this.onClosed(m.message);}
        this.status(m.message);$('create-name').disabled=false;this.render();
      }else if(m.type==='rooms'){
        const list=$('room-list');list.replaceChildren();
        if(!m.rooms.length)list.append(element('p','No open hosts found. Try another name, refresh, or host your own.','settings-note'));
        for(const room of m.rooms){
          const row=element('div','','room-row'),info=element('div','');info.append(element('strong',room.host),element('small',`${room.config.n} launchers · ${room.config.hp} armor · ${room.config.theme}`));
          const button=element('button','Request match');button.onclick=()=>this.send({type:'join',room:room.id,country:this.config().p1country});row.append(info,button);list.append(row);
        }
      }else if(m.type==='hosting'){
        this.mode='host';this.status('Your room is open. Accept a player below to begin.');this.render();
        const list=$('join-requests');list.replaceChildren();
        if(!m.requests.length)list.append(element('p','Waiting for a player to request a match…','settings-note'));
        for(const person of m.requests){const row=element('div','','room-row'),label=element('strong',person.name),actions=element('div','','request-actions');
          for(const [text,accept] of [['Accept',true],['Decline',false]]){const b=element('button',text);b.onclick=()=>this.send({type:'decide',id:person.id,accept});actions.append(b);}
          row.append(label,actions);list.append(row);
        }
      }else if(m.type==='pending'){this.mode='pending';this.status(`Waiting for ${m.host} to accept your request.`);this.render();}
      else if(m.type==='notice'||m.type==='left'){this.mode='lobby';this.status(m.message||'Room closed. Ready for another match.');this.render();}
      else if(m.type==='match'){
        this.active=true;this.seat=m.seat;this.names=m.names;this.turnId=m.snapshot.turnId;this.paused=false;this.onMatch(m);this.updateMatch(m.snapshot);
      }else if(m.type==='snapshot'){
        this.paused=m.paused;this.turnId=m.snapshot.turnId;this.onSnapshot(m.snapshot,m.paused);this.updateMatch(m.snapshot);
      }else if(m.type==='roomClosed'){
        if(this.active){this.paused=true;this.onClosed(m.message);$('online-status').textContent=m.message;}
        else{this.mode='lobby';this.status(m.message);this.render();}
      }else if(m.type==='error'){this.status(m.message);$('create-name').disabled=false;}
    };
    ws.onerror=()=>{if(ws===this.ws)this.status('The online service is unavailable. Retry shortly, or play on this device.');};
    ws.onclose=event=>{
      clearTimeout(timeout);if(ws!==this.ws)return;this.connected=false;$('create-name').disabled=false;
      if(event.code===4001){this.stopped=true;this.forgetSession();this.mode='identity';this.status('This session was opened in another connection. Choose a new name to play here.');if(this.active){this.active=false;this.onClosed('Session moved to another connection.');}}
      if(this.stopped){this.render();return;}
      if(this.active){this.paused=true;this.onSnapshot(null,true);$('online-status').textContent='Connection lost. Reconnecting…';}
      this.status('Disconnected. Reconnecting…');this.render();
      if(this.token&&this.attempt<6)this.reconnectTimer=setTimeout(()=>{this.attempt++;this.connect();},Math.min(1000*2**this.attempt,5000));
      else{this.status('The online service is unavailable. Retry shortly, or play on this device.');$('online-retry').hidden=false;}
    };
  }
  updateMatch(snapshot){
    $('online-match').hidden=false;
    $('online-status').textContent=this.paused?'Match paused — waiting for reconnection.':snapshot.state==='over'?'Match complete.':`${this.names[this.seat]} · ${snapshot.turn===this.seat?'Your turn':this.names[snapshot.turn]+'’s turn'}${snapshot.state==='aiming'?` · ${snapshot.remaining}s`:''}`;
  }
  render(){
    const locked=this.connected&&['host','pending'].includes(this.mode);
    $('identity-form').hidden=this.connected;
    $('lobby-actions').hidden=!this.connected||!['lobby','search'].includes(this.mode);
    $('room-search').hidden=!this.connected||this.mode!=='search';
    $('hosting-room').hidden=!this.connected||this.mode!=='host';
    $('cancel-request').hidden=!this.connected||this.mode!=='pending';
    $('online-retry').hidden=this.connected||this.ws?.readyState===WebSocket.CONNECTING;
    $('go').disabled=locked;
    document.querySelectorAll('.match-settings [data-k],#p1country,#p2country').forEach(control=>control.disabled=locked);
  }
}
