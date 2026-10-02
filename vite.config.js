import { defineConfig } from 'vite';
import { attachLobby } from './server/lobby.js';

export default defineConfig({plugins:[{
  name:'duel-websocket-server',
  configureServer(server){attachLobby(server.httpServer);},
  configurePreviewServer(server){attachLobby(server.httpServer);}
}]});
