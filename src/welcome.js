const $=id=>document.getElementById(id);

export function setupWelcome(lobby){
  // Home decoration has its own explicit preference, independent of gameplay motion.
  let homeMotion=true;
  try{homeMotion=localStorage.getItem('duel-home-motion')!=='off';}catch{}
  const updateHomeMotion=()=>{
    $('setup').classList.toggle('home-motion-enabled',homeMotion);
    $('setup').classList.toggle('home-motion-disabled',!homeMotion);
    $('home-motion-toggle').setAttribute('aria-pressed',String(homeMotion));
    $('home-motion-toggle').textContent=`Home motion: ${homeMotion?'on':'off'}`;
  };
  $('home-motion-toggle').onclick=()=>{
    homeMotion=!homeMotion;updateHomeMotion();
    try{localStorage.setItem('duel-home-motion',homeMotion?'on':'off');}catch{}
  };
  updateHomeMotion();
  const dialog=$('play-dialog'),settings=$('settings-pane'),online=$('online-pane');
  const startOffline=$('go').onclick;
  let screen='offline';
  function show(next){
    screen=next;
    settings.hidden=next==='online';online.hidden=next!=='online';
    $('dialog-title').textContent=next==='offline'?'OFFLINE DUEL':next==='host'?'HOST A MATCH':'ONLINE DUEL';
    $('settings-title').textContent=next==='host'?'Set the ground rules.':'Make it your match.';
    $('go').innerHTML=next==='host'?'OPEN ROOM <span aria-hidden="true">↗</span>':'START OFFLINE DUEL <span aria-hidden="true">↗</span>';
    document.querySelector('.start-note').textContent=next==='host'?'Open your room, then accept a rival to begin.':'Pass the controls when the turn changes.';
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    $('modal-back').focus();
  }
  function close(){dialog.close();}
  $('offline-mode').onclick=()=>show('offline');
  $('online-mode').onclick=()=>{show('online');if(!lobby.connected)$('anonymous-name').focus();};
  $('host-match').onclick=()=>show('host');
  $('go').onclick=()=>{
    if(screen==='host'){
      if(!lobby.connected){show('online');lobby.status('Reconnect before opening a room.');return;}
      lobby.send({type:'host',config:lobby.config()});show('online');
    }else startOffline();
  };
  $('modal-close').onclick=close;
  dialog.addEventListener('close',()=>{
    if(lobby.active)return;
    lobby.stopped=true;clearTimeout(lobby.reconnectTimer);
    lobby.send({type:'leave'});
    const socket=lobby.ws;lobby.ws=null;socket?.close();
    lobby.connected=false;lobby.mode='identity';lobby.status('');
    $('create-name').disabled=false;lobby.render();
  });
  $('modal-back').onclick=()=>screen==='host'?show('online'):close();
  $('lobby-back').onclick=()=>{lobby.mode='lobby';lobby.render();};
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});

  // Ambient decoration rests while the page is hidden or a modal has focus.
  const motion=()=>{
    document.body.classList.toggle('welcome-resting',document.hidden||dialog.open);
    document.body.classList.toggle('page-hidden',document.hidden);
  };
  new MutationObserver(motion).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',motion);
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)entry.target.classList.toggle('out-of-view',!entry.isIntersecting);
  });
  observer.observe(document.querySelector('.flight-line'));
  observer.observe($('game-title'));
  observer.observe(document.querySelector('.home-cubes'));
  const loaderObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)entry.target.classList.toggle('in-view',entry.isIntersecting);
  });
  loaderObserver.observe($('lobby-loader'));
  motion();
}
