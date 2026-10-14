import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createEconomy } from '../economy.mjs';
import { createServer } from '../server.mjs';
import { request } from 'node:http';

const op = () => randomUUID();

test('recovery preserves progression, rotates access, survives restart and never replays starting funds', () => {
  const dir=mkdtempSync(join(tmpdir(),'casino-recovery-'));const path=join(dir,'test.sqlite');
  let e=createEconomy(path);const operation=op();
  try {
    const c=e.create('Recover',operation);const id=c.character.id;
    e.mutate(id,op(),'customize',{outfit:'cap',color:'plum'});
    e.buyIn(id,'test-session',900);
    const player={id:'p',characterId:id,stack:0,handStart:900};
    e.settle([player],{stage:'finished',seats:[{id:'p'}],results:[]},'test-hand');
    e.cashOut(id);e.mutate(id,op(),'borrow');
    const before=e.view(id);const key=e.issueRecovery(id).recoveryKey;
    assert.equal(e.recover('bad'),null);assert.equal(e.recover('f'.repeat(64)),null);
    e.close();e=createEconomy(path);
    const restored=e.recover(key);assert.deepEqual(restored.character,before);
    assert.equal(e.authenticate(c.token),null);assert.equal(e.authenticate(restored.token),id);
    assert.throws(()=>e.create('Duplicate',operation),/expired/);
    assert.deepEqual(e.view(id),before);
    const again=e.recover(key);assert.equal(e.authenticate(restored.token),null);
    assert.equal(e.authenticate(again.token),id);
    const replacement=e.issueRecovery(id).recoveryKey;
    assert.equal(e.recover(key),null);assert.equal(e.recover(replacement).character.id,id);
    e.close();e=createEconomy(path);
    assert.equal(e.recover(replacement).character.id,id);
    e.remove(id,'Recover');assert.equal(e.recover(replacement),null);
    assert.throws(()=>e.create('Duplicate',operation),/expired/);
  } finally {e.close();rmSync(dir,{recursive:true,force:true});}
});

test('legacy database migrates without resetting character and stores only recovery digest', () => {
  const dir=mkdtempSync(join(tmpdir(),'casino-legacy-'));const path=join(dir,'test.sqlite');
  let e=createEconomy(path);const operation=op();const c=e.create('Legacy',operation);e.close();
  let db=new DatabaseSync(path);db.exec('DROP TABLE recovery_keys; DROP TABLE creation_tokens');db.close();
  e=createEconomy(path);
  try {
    assert.equal(e.authenticate(c.token),c.character.id);
    const key=e.issueRecovery(c.character.id).recoveryKey;
    db=new DatabaseSync(path);
    const row=db.prepare('SELECT * FROM recovery_keys').get();
    assert.notEqual(row.digest,key);assert.equal(row.digest.length,64);db.close();
    const restored=e.recover(key);assert.equal(restored.character.cash,1000);
    assert.throws(()=>e.create('Duplicate',operation),/expired/);
  } finally {e.close();rmSync(dir,{recursive:true,force:true});}
});

test('table recovery refusal does not revoke keys or alter money', () => {
  const e=createEconomy();
  try {
    const c=e.create('At table',op());const key=e.issueRecovery(c.character.id).recoveryKey;
    e.buyIn(c.character.id,'session',200);const before=e.view(c.character.id);
    assert.throws(()=>e.recover(key),error=>error.status===409);
    assert.throws(()=>e.issueRecovery(c.character.id),/Return home/);
    assert.deepEqual(e.view(c.character.id),before);assert.equal(e.authenticate(c.token),c.character.id);
    e.cashOut(c.character.id);assert.equal(e.recover(key).character.cash,1000);
  } finally {e.close();}
});

test('HTTP recovery authenticates, rate limits, rejects active table and invalidates pending jobs', async () => {
  const server=createServer({requireCharacters:true,recoveryLimit:8});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  async function post(path,token,data={}) {
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
    return {status:response.status,data:await response.json(),headers:response.headers};
  }
  try {
    assert.equal((await post('/api/character/recovery-key')).status,401);
    const operation=op();const c=(await post('/api/character/create',null,{name:'Recover',operation})).data;
    const key=(await post('/api/character/recovery-key',c.token)).data.recoveryKey;
    const tableResponse=await fetch(base+'/api/singleplayer',{method:'POST',headers:{'Content-Type':'application/json','X-Character-Token':c.token},body:JSON.stringify({buyIn:200})});
    const table=await tableResponse.json();assert.equal(tableResponse.status,200);
    const busy=await post('/api/character/recover',null,{recoveryKey:key});assert.equal(busy.status,409);
    assert.equal((await post('/api/character',c.token)).status,200);
    await post('/api/leave',table.token);
    const job=(await post('/api/job/start',c.token)).data;
    // Keep an authenticated mutation in flight while its credential is rotated.
    const received=new Promise(r=>server.once('request',r));
    let delayed;
    const staleResponse=new Promise((resolve,reject)=>{
      delayed=request(base+'/api/character/customize',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${c.token}`}},response=>{
        let text='';response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,data:JSON.parse(text)}));
      });
      delayed.on('error',reject);delayed.write('{');
    });
    await received;
    const recovered=await post('/api/character/recover',null,{recoveryKey:key});assert.equal(recovered.status,200);
    delayed.end(`"operation":"${op()}","outfit":"cap"}`);
    assert.equal((await staleResponse).status,401);
    assert.equal(recovered.data.character.id,c.character.id);assert.equal(recovered.data.character.cash,1000);
    assert.equal((await post('/api/character',c.token)).status,401);
    assert.equal((await post('/api/character/recovery-key',c.token)).status,401);
    assert.equal((await post('/api/session',table.token)).status,401);
    assert.equal((await post('/api/job/finish',recovered.data.token,{id:job.id,answers:job.pattern})).status,400);
    assert.equal((await post('/api/character/create',null,{name:'Duplicate',operation})).status,400);
    assert.equal((await post('/api/character',recovered.data.token)).data.cash,1000);
    for(let i=0;i<6;i++)assert.equal((await post('/api/character/recover',null,{recoveryKey:'bad'})).status,401);
    const limited=await post('/api/character/recover',null,{recoveryKey:key});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
