import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, set, get } from 'firebase/database';
import fs from 'node:fs';
const address=process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if(!address)throw new Error('Run npm run test:rules to start the isolated local emulator.');
const [host,port]=address.split(':');
const env=await initializeTestEnvironment({projectId:'demo-dueling-missiles',database:{host,port:Number(port),rules:fs.readFileSync('database.rules.json','utf8')}});
try{
 await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database(),'matches/room'),{players:{alice:{slot:0},bob:{slot:1}},turn:{number:0,activeUid:'alice'}}));
 const alice=env.authenticatedContext('alice').database(), outsider=env.authenticatedContext('eve').database(), anon=env.unauthenticatedContext().database();
 await assertSucceeds(get(ref(alice,'matches/room')));
 await assertFails(get(ref(outsider,'matches/room')));await assertFails(get(ref(anon,'matches/room')));
 for(const path of ['players/alice','players/eve','commands/0','snapshots/0','turn','meta']) await assertFails(set(ref(alice,'matches/room/'+path),{uid:'alice',slot:0}));
 await assertFails(set(ref(outsider,'matches/new'),{players:{eve:{slot:0}}}));
 console.log('PASS: member reads; anonymous/outsider reads and all client mutations denied');
}finally{await env.cleanup()}
