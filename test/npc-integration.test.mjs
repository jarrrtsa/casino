import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNpcSeats, NPC_ROSTER, npcProfile, npcPublicProfile } from '../npc-roster.mjs';
import { createServer } from '../server.mjs';

test('NPC identity is stable, runtime seats are independent and missing profiles use balanced', () => {
  const first=createNpcSeats(200),second=createNpcSeats(500);
  assert.deepEqual(first.map(npcPublicProfile),[{id:'mara',style:'cautious'},{id:'jules',style:'aggressive'}]);
  assert.equal(npcPublicProfile({bot:false}),null);
  assert.deepEqual(npcPublicProfile({bot:true,npcProfileId:'unknown'}),{id:null,style:'balanced'});
  assert.equal(npcProfile('unknown'),null);
  assert.equal(new Set([...first,...second].map(p=>p.id)).size,4);
  assert.ok(first.every(p=>p.stack===200&&p.ready&&p.bot));
  assert.ok(second.every(p=>p.stack===500));
  first[0].appearance.color='blue';first[0].stack=0;
  assert.equal(second[0].appearance.color,'amber');assert.equal(second[0].stack,500);
  assert.equal(NPC_ROSTER[0].appearance.color,'amber');
  assert.ok(Object.isFrozen(NPC_ROSTER)&&NPC_ROSTER.every(p=>Object.isFrozen(p)&&Object.isFrozen(p.appearance)));
});

test('named NPC table settles and the same funded character recovers across server restart', async () => {
  const dir=mkdtempSync(join(tmpdir(),'casino-npc-recovery-'));const dbPath=join(dir,'test.sqlite');
  let server,base,reader;
  async function start() {
    server=createServer({dbPath,requireCharacters:true,botMs:5,turnMs:10});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    if(reader){await reader.cancel();reader=null;}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null;
  }
  async function post(path,token,data={},characterToken) {
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(characterToken?{'X-Character-Token':characterToken}:{})},body:JSON.stringify(data)});
    return {status:response.status,data:await response.json()};
  }
  try {
    await start();
    const c=(await post('/api/character/create',null,{name:'NPC recovery',operation:randomUUID()})).data;
    const key=(await post('/api/character/recovery-key',c.token)).data.recoveryKey;
    // Client-provided roster/style fields must not override server-owned NPCs.
    const table=await post('/api/singleplayer',null,{buyIn:200,style:'balanced',npcProfileId:'fake',bots:[{name:'Fake'}]},c.token);
    assert.equal(table.status,200);
    const bots=table.data.room.players.filter(p=>p.bot);
    assert.deepEqual(bots.map(p=>[p.name,p.npc]),[['Mara',{id:'mara',style:'cautious'}],['Jules',{id:'jules',style:'aggressive'}]]);
    assert.equal(table.data.room.players.find(p=>!p.bot).npc,null);
    const stream=await fetch(base+'/api/events',{headers:{Authorization:`Bearer ${table.data.token}`}});reader=stream.body.getReader();await reader.read();
    let room=(await post('/api/start',table.data.token)).data;
    assert.equal(room.hand.seats.filter(p=>p.cards.length).length,1);
    for(let attempts=0;room.hand.stage!=='finished'&&attempts<80;attempts++) {
      await new Promise(resolve=>setTimeout(resolve,25));room=(await post('/api/session',table.data.token)).data;
    }
    assert.equal(room.hand.stage,'finished');
    assert.equal(room.players.reduce((total,p)=>total+p.stack,0),600);
    assert.equal(room.character.hands,1);assert.ok([15,40].includes(room.character.xp));
    const stack=room.players.find(p=>p.id===table.data.playerId).stack;
    assert.equal((await post('/api/leave',table.data.token)).status,200);
    const {session,...before}=(await post('/api/character',c.token)).data;
    assert.equal(session,null);assert.equal(before.cash,800+stack);
    await stop();await start();
    const restored=await post('/api/character/recover',null,{recoveryKey:key});assert.equal(restored.status,200);
    assert.deepEqual(restored.data.character,before);
    assert.equal((await post('/api/character',c.token)).status,401);
    assert.equal((await post('/api/session',table.data.token)).status,401);
    const next=await post('/api/singleplayer',null,{buyIn:100},restored.data.token);
    assert.equal(next.status,200);assert.equal(next.data.room.character.cash,before.cash-100);
    assert.deepEqual(next.data.room.players.filter(p=>p.bot).map(p=>p.npc),bots.map(p=>p.npc));
    assert.ok(next.data.room.players.filter(p=>p.bot).every(p=>!bots.some(previous=>previous.id===p.id)));
    assert.equal((await post('/api/leave',next.data.token)).status,200);
    assert.equal((await post('/api/character',restored.data.token)).data.cash,before.cash);
  } finally {
    if(server)await stop();rmSync(dir,{recursive:true,force:true});
  }
});
