import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeSocialClient } from '../public/home-social.mjs';
const pending=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('old poll cannot erase a newly created lobby or recovered identity',async()=>{
 const old=pending();const home={code:'ABCDEF'};const client=createHomeSocialClient({request:path=>path.endsWith('/view')?old.promise:Promise.resolve({home})});
 const poll=client.refresh();await client.create();old.resolve({home:null});await poll;assert.equal(client.home,home);
 const late=pending();const c=createHomeSocialClient({request:()=>late.promise});const refresh=c.refresh();c.reset();late.resolve({home});await refresh;assert.equal(c.home,null);
});
test('latest poll wins; failed mutations preserve membership and leave clears it',async()=>{
 const first=pending(),second=pending();let views=0,fail=false;
 const client=createHomeSocialClient({request:async path=>{
  if(path.endsWith('/view'))return ++views===1?first.promise:second.promise;
  if(fail)throw new Error('Rejected');return {home:{code:'ABCDEF'}};
 }});
 await client.create();fail=true;await assert.rejects(client.join('OTHER1'),/Rejected/);assert.equal(client.home.code,'ABCDEF');fail=false;
 const a=client.refresh(),b=client.refresh();second.resolve({home:{code:'NEWEST'}});await b;first.resolve({home:{code:'OLDER1'}});await a;assert.equal(client.home.code,'NEWEST');
 await client.leave();assert.equal(client.home,null);
});
test('home client uses only the documented character home routes',async()=>{
 const calls=[];const c=createHomeSocialClient({request:async(path,data)=>{calls.push([path,data]);return {home:{code:'ABCDEF'}};}});
 await c.create();await c.join('ABCDEF');await c.transfer('friend');await c.leave();
 assert.deepEqual(calls,[['/api/home/create',{}],['/api/home/join',{code:'ABCDEF'}],['/api/home/transfer',{characterId:'friend'}],['/api/home/leave',{}]]);
});
