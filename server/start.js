import {createDuelServer} from './http.js';
const {server,lobby}=createDuelServer(),port=Number(process.env.PORT)||3000;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log('Dueling Missiles listening on port '+port));
const stop=()=>{lobby.close();server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
