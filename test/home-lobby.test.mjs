import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { createHomeLobbies } from '../home-lobby.mjs';
import { createServer } from '../server.mjs';

const character=id=>({id,name:id,home:{id:id==='host'?'rental':'bridge'},outfit:'hoodie',color:'blue',inTable:false});

test('home membership is exclusive, retries are safe, host transfers preserve the original home',()=>{
 const homes=createHomeLobbies({character,maxMembers:2});const first=homes.create('host');
 assert.deepEqual(homes.create('host'),first);assert.equal(homes.view('stranger'),null);
 const joined=homes.join('guest',first.code.toLowerCase());assert.equal(joined.environment,'rental');assert.equal(joined.players.length,2);
 assert.deepEqual(homes.join('guest',first.code),joined);assert.throws(()=>homes.join('third',first.code),e=>e.status===409);
 const second=homes.create('third');assert.throws(()=>homes.join('guest',second.code),e=>e.status===409);
 assert.throws(()=>homes.transfer('guest','host'),e=>e.status===403);assert.throws(()=>homes.transfer('host','outsider'),e=>e.status===400);
 const moved=homes.transfer('host','guest');assert.equal(moved.hostId,'guest');assert.equal(moved.homeOwnerId,'host');assert.equal(moved.environment,'rental');
 homes.leave('guest');assert.equal(homes.view('host').hostId,'host');homes.leave('host');assert.equal(homes.view('host'),null);
 assert.throws(()=>homes.join('guest',first.code),e=>e.status===404);assert.deepEqual(homes.leave('guest'),{ok:true,left:false});
});

test('idle members expire, active tables retain membership and room limits recover',()=>{
 let time=0;const table=new Set();const homes=createHomeLobbies({character:id=>({...character(id),inTable:table.has(id)}),now:()=>time,idleMs:100,maxRooms:1});
 const room=homes.create('host');homes.join('guest',room.code);assert.throws(()=>homes.create('third'),e=>e.status===503);
 time=60;homes.view('guest');time=100;homes.cleanup();assert.equal(homes.view('guest').hostId,'guest');
 table.add('guest');time=1000;homes.cleanup();assert.ok(homes.view('guest'));homes.leave('guest');
 assert.throws(()=>homes.create('guest'),e=>e.status===409);const next=homes.create('third');assert.ok(next.code);
 time+=100;homes.cleanup();assert.equal(homes.view('third'),null);
});

async function setup(t,options={}){
 const server=createServer({requireCharacters:true,creationLimit:100,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 async function post(path,token,data={}){
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
  return {status:response.status,data:await response.json()};
 }
 const create=async name=>(await post('/api/character/create',null,{name,operation:randomUUID()})).data;
 return {server,base,post,create};
}

test('HTTP home visits never change wallets and expose only roster metadata',async t=>{
 const {post,create}=await setup(t,{homeCapacity:2});const a=await create('Host'),b=await create('Guest'),c=await create('Third');
 await post('/api/character/customize',b.token,{operation:randomUUID(),outfit:'cap',color:'plum'});
 const beforeA=(await post('/api/character',a.token)).data,beforeB=(await post('/api/character',b.token)).data;
 assert.equal((await post('/api/home/create')).status,401);
 const home=(await post('/api/home/create',a.token,{buyIn:1000,environment:'mansion',hostId:c.character.id})).data.home;
 assert.equal(home.environment,'bridge');assert.equal(home.hostId,a.character.id);
 assert.equal((await post('/api/home/view',c.token,{code:home.code})).data.home,null);
 const joined=(await post('/api/home/join',b.token,{code:home.code})).data.home;assert.equal(joined.players[1].appearance.outfit,'cap');
 for(const player of joined.players)assert.deepEqual(Object.keys(player).sort(),['appearance','host','id','name']);
 assert.equal((await post('/api/home/join',c.token,{code:home.code})).status,409);
 assert.equal((await post('/api/home/transfer',b.token,{characterId:a.character.id})).status,403);
 assert.equal((await post('/api/home/transfer',a.token,{characterId:c.character.id})).status,400);
 assert.equal((await post('/api/home/transfer',a.token,{characterId:b.character.id})).data.home.hostId,b.character.id);
 assert.deepEqual((await post('/api/character',a.token)).data,beforeA);assert.deepEqual((await post('/api/character',b.token)).data,beforeB);
 await post('/api/home/leave',b.token);assert.equal((await post('/api/home/view',a.token)).data.home.hostId,a.character.id);
 await post('/api/home/leave',a.token);assert.equal((await post('/api/home/join',c.token,{code:home.code})).status,404);
});

test('recovery and deletion remove home membership and transfer host safely',async t=>{
 const {post,create}=await setup(t);const a=await create('Host'),b=await create('Guest');const key=(await post('/api/character/recovery-key',a.token)).data.recoveryKey;
 const home=(await post('/api/home/create',a.token)).data.home;await post('/api/home/join',b.token,{code:home.code});
 assert.equal((await post('/api/character/delete',b.token,{name:'wrong'})).status,400);assert.equal((await post('/api/home/view',b.token)).data.home.players.length,2);
 const restored=await post('/api/character/recover',null,{recoveryKey:key});assert.equal(restored.status,200);
 assert.equal((await post('/api/home/view',a.token)).status,401);assert.equal((await post('/api/home/view',restored.data.token)).data.home,null);
 const retained=(await post('/api/home/view',b.token)).data.home;assert.equal(retained.hostId,b.character.id);assert.equal(retained.environment,home.environment);
 await post('/api/character/delete',b.token,{name:'Guest'});assert.equal((await post('/api/home/join',restored.data.token,{code:home.code})).status,404);
});

test('home membership and leave do not cash out a poker table',async t=>{
 const {post,create,base}=await setup(t);const a=await create('Player');const home=(await post('/api/home/create',a.token)).data.home;
 const tableResponse=await fetch(base+'/api/singleplayer',{method:'POST',headers:{'Content-Type':'application/json','X-Character-Token':a.token},body:JSON.stringify({buyIn:200})});const table=await tableResponse.json();assert.equal(tableResponse.status,200);
 assert.equal((await post('/api/home/view',a.token)).data.home.code,home.code);await post('/api/home/leave',a.token);
 const inTable=(await post('/api/character',a.token)).data;assert.equal(inTable.cash,800);assert.equal(inTable.chips,200);assert.equal(inTable.inTable,true);
 assert.equal((await post('/api/home/create',a.token)).status,409);assert.equal((await post('/api/session',table.token)).status,200);
 await post('/api/leave',table.token);assert.equal((await post('/api/character',a.token)).data.cash,1000);
});

test('an in-flight home action rechecks credentials after recovery',async t=>{
 const {post,create,server,base}=await setup(t);const a=await create('Slow');const key=(await post('/api/character/recovery-key',a.token)).data.recoveryKey;
 let pending;const received=new Promise(r=>server.once('request',r));
 const response=new Promise((resolve,reject)=>{pending=request(base+'/api/home/create',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${a.token}`}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});pending.on('error',reject);pending.write('{');});
 await received;const restored=(await post('/api/character/recover',null,{recoveryKey:key})).data;pending.end('}');assert.equal(await response,401);
 assert.equal((await post('/api/home/view',restored.token)).data.home,null);
});

test('HTTP expired host moves to active guest and join throttling is enforced',async t=>{
 let time=0;const {post,create}=await setup(t,{now:()=>time,homeIdleMs:100,creationLimit:3});const a=await create('Host'),b=await create('Guest');
 const home=(await post('/api/home/create',a.token)).data.home;await post('/api/home/join',b.token,{code:home.code});time=60;await post('/api/home/view',b.token);time=100;
 assert.equal((await post('/api/home/view',a.token)).data.home,null);assert.equal((await post('/api/home/view',b.token)).data.home.hostId,b.character.id);
 assert.equal((await post('/api/home/join',a.token,{code:'bad'})).status,404);assert.equal((await post('/api/home/join',a.token,{code:home.code})).status,429);
});
