import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { attachLobby } from './lobby.js';

const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.mp3':'audio/mpeg','.png':'image/png','.svg':'image/svg+xml'};
export function createDuelServer({root=resolve('dist'),...lobbyOptions}={}) {
const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({ok:true,service:'dueling-missiles',protocol:1}));return;}
  if(path==='/socket'){res.writeHead(426,{'Content-Type':'text/plain',Upgrade:'websocket'});res.end(req.method==='HEAD'?undefined:'WebSocket upgrade required');return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
const lobby=attachLobby(server,lobbyOptions);
return {server,lobby};
}
