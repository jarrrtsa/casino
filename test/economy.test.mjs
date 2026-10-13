import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEconomy } from '../economy.mjs';
import { startHand, act } from '../poker.mjs';
import { botAction } from '../bots.mjs';

test('wallet leases prevent double spending; loans, purchases and repayments are idempotent', () => {
  let time=100000; const db=createEconomy(':memory:',()=>time);
  try {
    const key=randomUUID(), created=db.create('Tester',key), id=created.character.id;
    assert.equal(db.create('Different name',key).character.id,id);
    assert.equal(db.authenticate(created.token),id);
    assert.equal(db.authenticate('f'.repeat(64)),null);
    db.buyIn(id,'table',1000);
    assert.throws(()=>db.buyIn(id,'duplicate',100),/Return home/);
    assert.throws(()=>db.mutate(id,randomUUID(),'borrow'),/Return home/);
    db.sync([{id:'a',characterId:id,stack:0}],{stage:'finished',seats:[]});
    assert.equal(db.cashOut(id).cash,0);
    const loan=randomUUID(); assert.equal(db.mutate(id,loan,'borrow').cash,500);
    assert.equal(db.mutate(id,loan,'borrow').cash,500);
    assert.throws(()=>db.mutate(id,randomUUID(),'borrow'),/Repay/);
    const purchase=randomUUID(); assert.equal(db.mutate(id,purchase,'customize',{outfit:'cap',color:'sage'}).cash,450);
    db.mutate(id,purchase,'customize',{outfit:'cap'});assert.equal(db.view(id).cash,450);
    assert.throws(()=>db.mutate(id,randomUUID(),'customize',{outfit:'coat'}),/level 3/);
    const payment=randomUUID(); db.mutate(id,payment,'repay',{amount:450});db.mutate(id,payment,'repay',{amount:450});
    assert.equal(db.view(id).debt,50);assert.equal(db.view(id).wealth,-50);
    assert.throws(()=>db.mutate(id,randomUUID(),'repay',{amount:51}),/exceeds/);
    db.mutate(id,randomUUID(),'job');assert.equal(db.view(id).cash,30);
    assert.throws(()=>db.mutate(id,randomUUID(),'job'),/Wait/);
    time+=15000;db.mutate(id,randomUUID(),'job');db.mutate(id,randomUUID(),'repay',{amount:50});
    assert.equal(db.view(id).debt,0);
    assert.throws(()=>db.remove(id,'wrong'),/confirm/);db.remove(id,'Tester');assert.equal(db.authenticate(created.token),null);
  } finally {db.close();}
});

test('database restart refunds committed chips once and preserves character progression', () => {
  const dir=mkdtempSync(join(tmpdir(),'casino-wallet-')),path=join(dir,'wallet.sqlite');let db=createEconomy(path);
  try {
    const c=db.create('Persistent',randomUUID()).character;
    db.buyIn(c.id,'old-session',200);
    const player={id:'p',characterId:c.id,stack:220,handStart:200};
    const finished={stage:'finished',seats:[{id:'p'}],results:[{id:'p'}]};
    for(let i=0;i<3;i++)db.settle([player],finished,`hand-${i}`);
    db.settle([player],finished,'hand-2');
    assert.equal(db.view(c.id).xp,120);assert.equal(db.view(c.id).home.id,'rental');
    db.sync([player],{stage:'flop',seats:[{id:'p',stack:170,total:50}]});
    db.close();db=createEconomy(path);assert.equal(db.view(c.id).cash,1020);assert.equal(db.view(c.id).inTable,false);
    db.close();db=createEconomy(path);assert.equal(db.view(c.id).cash,1020);assert.equal(db.view(c.id).hands,3);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});

test('NPC decisions remain legal and complete games without reading opponents’ cards', () => {
  for(let n=0;n<50;n++){
    const players=['a','b','c'].map(id=>({id,name:id,stack:200}));const hand=startHand(players,'a');let moves=0;
    while(hand.stage!=='finished'){
      const id=hand.seats[hand.turn].id, move=botAction(hand,id);
      const copy={...hand,seats:hand.seats.map(p=>p.id===id?p:{...p,cards:[{rank:2,suit:'s'},{rank:3,suit:'h'}]})};
      assert.deepEqual(botAction(hand,id,()=>.17),botAction(copy,id,()=>.17));
      act(hand,id,move.action,move.amount);assert.ok(++moves<150);
    }
    assert.equal(players.reduce((sum,p)=>sum+p.stack,0),600);
  }
});
