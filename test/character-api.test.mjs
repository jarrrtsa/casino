import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from '../server.mjs';

test('authenticated NPC tables share the wallet, award XP, restore sessions and protect delivery rewards',async()=>{
  let time=100000;const server=createServer({requireCharacters:true,now:()=>time,botMs:2,turnMs:5,creationLimit:100});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  async function post(path,token,data={},characterToken){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(characterToken?{'X-Character-Token':characterToken}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};}
  let reader;
  try {
    assert.equal((await post('/api/create',null,{name:'anonymous'})).status,401);
    const c=(await post('/api/character/create',null,{name:'Solo',operation:randomUUID()})).data;
    const game=(await post('/api/singleplayer',null,{buyIn:200},c.token)).data;
    assert.equal(game.room.character.cash,800);assert.equal(game.room.players.filter(p=>p.bot).length,2);
    assert.equal((await post('/api/create',null,{buyIn:200},c.token)).status,400);
    assert.equal((await post('/api/join',null,{code:game.room.code,buyIn:200},c.token)).status,403);
    assert.equal((await post('/api/character',c.token)).data.session.token,game.token);
    assert.equal((await post('/api/job/start',c.token)).status,400);
    const stream=await fetch(base+'/api/events',{headers:{Authorization:`Bearer ${game.token}`}});reader=stream.body.getReader();await reader.read();
    let room=(await post('/api/start',game.token)).data;
    assert.equal(room.hand.seats.filter(p=>p.cards.length).length,1);
    for(let i=0;i<100&&room.hand.stage!=='finished';i++){await new Promise(r=>setTimeout(r,5));room=(await post('/api/session',game.token)).data;}
    assert.equal(room.hand.stage,'finished');assert.equal(room.character.hands,1);assert.ok([15,40].includes(room.character.xp));
    const chips=room.players.find(p=>p.id===game.playerId).stack;
    await post('/api/leave',game.token);const home=(await post('/api/character',c.token)).data;
    assert.equal(home.cash,800+chips);assert.equal(home.inTable,false);assert.equal(home.session,null);
    const job=(await post('/api/job/start',c.token)).data;
    assert.equal((await post('/api/job/finish',c.token,{id:job.id,answers:job.pattern})).status,400);
    time+=3100;const paid=await post('/api/job/finish',c.token,{id:job.id,answers:job.pattern});assert.equal(paid.data.cash,home.cash+30);
    assert.equal((await post('/api/job/finish',c.token,{id:job.id,answers:job.pattern})).data.cash,home.cash+30);
    assert.equal((await post('/api/job/start',c.token)).status,400);
    time+=15000;const wrong=(await post('/api/job/start',c.token)).data;
    assert.equal((await post('/api/job/finish',c.token,{id:wrong.id,answers:[]})).status,400);
    assert.equal((await post('/api/character',c.token)).data.cash,home.cash+30);
    const host=(await post('/api/create',null,{buyIn:100},c.token)).data;
    const friend=(await post('/api/character/create',null,{name:'Friend',operation:randomUUID()})).data;
    await post('/api/character/customize',friend.token,{operation:randomUUID(),outfit:'cap',color:'plum'});
    const joined=(await post('/api/join',null,{code:host.room.code,buyIn:200},friend.token)).data;
    assert.equal(joined.room.environment,'bridge');assert.equal(joined.room.players[1].appearance.outfit,'cap');
    assert.equal(joined.room.character.cash,750);assert.equal(joined.room.character.wealth,950);
    await post('/api/leave',joined.token);assert.equal((await post('/api/character',friend.token)).data.cash,950);
    await post('/api/leave',host.token);assert.equal((await post('/api/character',c.token)).data.cash,home.cash+30);
    assert.equal((await post('/api/character/delete',c.token,{name:'wrong'})).status,400);
    assert.equal((await post('/api/character/delete',c.token,{name:'Solo'})).status,200);
    assert.equal((await post('/api/character',c.token)).status,401);
  } finally {if(reader)await reader.cancel();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
