import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from '../server.mjs';
test('presence API authenticates, validates moves and replaces generation on leave/rejoin',async()=>{
 let time=10000;const s=createServer({requireCharacters:true,presenceNow:()=>time});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${s.address().port}`;
 async function post(path,token,data={}){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};}
 try{
  const a=(await post('/api/character/create',null,{name:'A',operation:randomUUID()})).data,b=(await post('/api/character/create',null,{name:'B',operation:randomUUID()})).data;
  assert.equal((await post('/api/home/presence/view')).status,401);const home=(await post('/api/home/create',a.token)).data.home;await post('/api/home/join',b.token,{code:home.code});
  const before=(await post('/api/home/presence/view',a.token)).data.presence;assert.equal(before.lobbyId,home.id);assert.equal(before.players.length,2);const own=before.players.find(p=>p.id===a.character.id);
  time+=200;const move={generation:own.generation,seq:1,x:own.x-40,y:own.y,facing:'left'};
  const moved=await post('/api/home/presence/move',a.token,move);assert.equal(moved.status,200);assert.equal(moved.data.presence.players.find(p=>p.id===a.character.id).x,move.x);
  assert.equal((await post('/api/home/presence/move',a.token,move)).status,400);assert.equal((await post('/api/home/presence/move',a.token,{...move,seq:2,id:b.character.id})).status,400);
  await post('/api/home/leave',a.token);assert.equal((await post('/api/home/presence/view',b.token)).data.presence.players.length,1);await post('/api/home/join',a.token,{code:home.code});
  const next=(await post('/api/home/presence/view',a.token)).data.presence.players.find(p=>p.id===a.character.id);assert.notEqual(next.generation,own.generation);assert.equal(next.seq,0);
  assert.equal((await post('/api/home/presence/move',a.token,{...move,seq:2})).status,400);assert.equal((await post('/api/character',a.token)).data.cash,1000);
 }finally{s.closeAllConnections();await new Promise(r=>s.close(r));}
});
