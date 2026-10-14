import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from '../server.mjs';

test('home friends share one paid poker table, finish a hand and return to free membership',async()=>{
 const s=createServer({requireCharacters:true});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${s.address().port}`,readers=[];
 async function post(path,token,data={},character){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(character?{'X-Character-Token':character}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};}
 const create=async name=>(await post('/api/character/create',null,{name,operation:randomUUID()})).data;
 try{
  const a=await create('Host'),b=await create('Friend'),outsider=await create('Outsider');
  const home=(await post('/api/home/create',a.token)).data.home;await post('/api/home/join',b.token,{code:home.code});
  assert.equal((await post('/api/home/poker',b.token,{buyIn:100})).status,409);
  assert.equal((await post('/api/home/poker',a.token,{buyIn:2000})).status,400);
  assert.equal((await post('/api/character',a.token)).data.cash,1000);
  const first=await post('/api/home/poker',a.token,{buyIn:200});assert.equal(first.status,200);
  assert.equal((await post('/api/join',null,{code:first.data.room.code,buyIn:100},outsider.token)).status,403);
  const second=await post('/api/home/poker',b.token,{buyIn:100});assert.equal(second.status,200);assert.equal(second.data.room.code,first.data.room.code);
  assert.equal((await post('/api/home/poker',a.token,{buyIn:200})).status,400);assert.equal((await post('/api/character',a.token)).data.cash,800);
  for(const p of [first.data,second.data]){const stream=await fetch(base+'/api/events',{headers:{Authorization:`Bearer ${p.token}`}});const reader=stream.body.getReader();readers.push(reader);await reader.read();await post('/api/ready',p.token);}
  let room=(await post('/api/start',first.data.token)).data;const actor=[first.data,second.data].find(p=>p.playerId===room.hand.turnId);
  room=(await post('/api/action',actor.token,{hand:room.hand.number,version:room.hand.version,action:'fold'})).data;assert.equal(room.hand.stage,'finished');
  for(const p of [first.data,second.data])assert.equal((await post('/api/leave',p.token)).status,200);
  const ca=(await post('/api/character',a.token)).data,cb=(await post('/api/character',b.token)).data;assert.equal(ca.cash+cb.cash,2000);assert.equal(ca.hands,1);assert.equal(cb.hands,1);
  assert.equal((await post('/api/home/view',a.token)).data.home.players.length,2);
  const fresh=await post('/api/home/poker',a.token,{buyIn:100});assert.equal(fresh.status,200);assert.notEqual(fresh.data.room.code,first.data.room.code);await post('/api/leave',fresh.data.token);
 }finally{for(const r of readers)await r.cancel();s.closeAllConnections();await new Promise(r=>s.close(r));}
});
