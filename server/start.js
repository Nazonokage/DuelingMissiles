import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { attachLobby } from './lobby.js';

const root=resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.mp3':'audio/mpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
const lobby=attachLobby(server),port=Number(process.env.PORT)||3000;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Dueling Missiles listening on port ${port}`));
const stop=()=>{lobby.close();server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
