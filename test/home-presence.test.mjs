import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomePresence, PRESENCE_LIMITS } from '../home-presence.mjs';
import { isWalkable } from '../public/world-layout.mjs';

function fixture(environment = 'bridge', ids = ['a', 'b']) {
  let time = 1000;
  const room = { code: 'ABC123', environment, players: ids.map(id => ({ id, token: 'secret', cash: 1000 })) };
  let current = room;
  const model = createHomePresence({ lobbyId: room.code, getLobby: () => current, now: () => time });
  const view = id => model.view(id).players.find(player => player.id === id);
  const move = (id, patch = {}) => { const p = view(id); return model.move(id, { generation: p.generation, seq: p.seq + 1, x: p.x, y: p.y, facing: p.facing, ...patch }); };
  return { model, room, view, move, advance(ms) { time += ms; }, setTime(value) { time = value; }, close() { current = null; } };
}
const rejects = (run, status = 400) => assert.throws(run, error => error.status === status);
function unchanged(f, run, status = 400) {
  const before = f.model.reconcile(); rejects(run, status); assert.deepEqual(f.model.reconcile(), before);
}

test('trusted membership spawns safely in either home and exposes only presence fields', () => {
  for (const environment of ['bridge', 'rental']) {
    const f = fixture(environment); const snapshot = f.model.view('a');
    assert.equal(snapshot.environment, environment); assert.equal(snapshot.players.length, 2);
    for (const p of snapshot.players) {
      assert.ok(isWalkable(p, environment)); assert.equal(p.seq, 0); assert.equal(p.facing, 'right');
      assert.deepEqual(Object.keys(p).sort(), ['facing', 'generation', 'id', 'revision', 'seq', 'x', 'y']);
    }
    snapshot.players[0].x = 0; snapshot.players.pop(); assert.equal(f.view('a').x, 2688);
    rejects(() => f.model.view('outsider'), 403);
    rejects(() => f.model.move('outsider', {}), 403);
  }
});

test('trusted adapter has fixed lobby/environment, validates roster and six-member capacity', () => {
  assert.throws(() => createHomePresence(), TypeError);
  const f = fixture(); f.model.reconcile();
  for (const [key, value] of [['environment','rental'], ['environment','mansion'], ['code','OTHER'], ['players',[{id:'a'},{id:'a'}]], ['players',Array.from({length:7},(_,i)=>({id:String(i)}))]]) {
    const old = f.room[key]; f.room[key] = value; rejects(() => f.model.reconcile(), key === 'environment' && value === 'rental' ? 409 : 503); f.room[key] = old;
  }
  const full = fixture('bridge', ['a','b','c','d','e','f']); assert.equal(full.model.reconcile().players.length, PRESENCE_LIMITS.capacity);
});

test('untrusted coordinates, extra environment/identity/time fields and invalid facing/sequence never mutate state', () => {
  const f = fixture(); f.advance(1000);
  for (const patch of [{x:NaN},{y:Infinity},{x:'2688'},{x:null},{y:-Infinity},{x:383},{x:3457},{y:647},{y:973},{facing:'up'},{seq:0},{seq:-1},{seq:1.5},{seq:Number.MAX_SAFE_INTEGER+1},{generation:'wrong'},{environment:'rental'},{id:'b'},{timestamp:1e12}]) {
    unchanged(f, () => f.move('a',patch));
  }
  for (const message of [null, [], {}, 'move']) unchanged(f, () => f.model.move('a',message));
});

test('server time and capped credit bound cumulative speed including diagonal and long idle', () => {
  const f = fixture(); f.model.reconcile();
  unchanged(f, () => f.move('a',{x:2689}));
  f.advance(100); f.move('a',{x:2731});
  unchanged(f, () => f.move('a',{x:2732}));
  f.advance(100); f.move('a',{x:2761,y:872.4});
  unchanged(f, () => f.move('a',{x:2763}));
  f.advance(1e7); unchanged(f, () => f.move('a',{x:3000}));
  f.move('a',{x:2861,y:872.4});
  unchanged(f, () => f.move('a',{x:2900}));
});

test('sequence rejects replay/out of order; rejected high seq does not poison valid next move', () => {
  const f = fixture(); f.advance(50); f.move('a',{facing:'left'});
  unchanged(f, () => f.move('a',{seq:1}));
  unchanged(f, () => f.move('a',{seq:0}));
  unchanged(f, () => f.move('a',{seq:999,x:3400}));
  const result = f.move('a',{seq:2}); assert.equal(result.players[0].seq,2);
});

test('players have independent time credit, sequences, direction and member revisions', () => {
  const f = fixture(); const initial = f.model.reconcile(); f.advance(100);
  f.move('a',{x:2731,facing:'left'}); assert.deepEqual(f.view('b'), initial.players[1]);
  f.move('b',{x:2731}); assert.equal(f.view('b').seq,1); assert.equal(f.view('a').facing,'left');
  unchanged(f, () => f.move('a',{x:2740})); assert.equal(f.model.reconcile().revision, initial.revision+2);
});

test('departure is pruned, rejoin gets fresh generation/spawn and old packets cannot move it', () => {
  const f = fixture(); const old = f.view('a'); f.advance(100); f.move('a',{x:2731});
  f.room.players = [{id:'b'}]; f.model.reconcile(); rejects(() => f.model.move('a',old),403);
  f.room.players.push({id:'a'}); const fresh = f.view('a');
  assert.equal(fresh.x,2688); assert.notEqual(fresh.generation,old.generation);
  unchanged(f, () => f.model.move('a',{generation:old.generation,seq:999,x:fresh.x,y:fresh.y,facing:'right'}));
  f.close(); const closed = f.model.reconcile(); assert.deepEqual(closed.players,[]); rejects(() => f.model.view('a'),403);
});

test('clock rollback and nonfinite clocks fail closed without visible mutations', () => {
  const f = fixture(); const before = f.model.reconcile();
  for (const value of [999,NaN,Infinity]) { f.setTime(value); rejects(() => f.move('a'),503); }
  f.setTime(1000); assert.deepEqual(f.model.reconcile(),before); f.advance(100); f.move('a',{x:2731});
});

test('shared footprints prevent entering or crossing obstacles; tangential wall travel works', () => {
  for (const environment of ['bridge','rental']) {
    const f = fixture(environment); f.model.reconcile();
    // Reach the clear lane and move west in server-authorized increments.
    const step = patch => { f.advance(250); return f.move('a',patch); };
    if (environment === 'bridge') {
      step({y:920});
      for (let x=2588;x>=1188;x-=100) step({x});
      step({x:1100});
      unchanged(f, () => { f.advance(250); f.move('a',{y:860}); });
      step({y:887}); step({x:1060}); // Inflated table face, tangent permitted.
      unchanged(f, () => { f.advance(250); f.move('a',{y:860}); });
    } else {
      step({y:775}); for (let x=2588;x>=1388;x-=100) step({x});
      step({x:1288}); step({x:1188});
      unchanged(f, () => { f.advance(250); f.move('a',{y:670}); }); // Free endpoints across cabinet.
      unchanged(f, () => { f.advance(250); f.move('a',{y:710}); });
      step({y:741}); step({x:1150});
    }
  }
});


test('real home-lobby adapter preserves host home on transfer and reconciles leave/rejoin/closure', async () => {
  const { createHomeLobbies } = await import('../home-lobby.mjs');
  let time = 1000;
  const homes = createHomeLobbies({ now: () => time, character: id => ({ name:id, home:{id:id === 'a' ? 'bridge' : 'rental'}, outfit:'hoodie', color:'blue', inTable:false }) });
  const home = homes.create('a'); homes.join('b', home.code);
  const model = createHomePresence({ lobbyId: home.code, now: () => time, getLobby: () => homes.view('b') });
  const initial = model.view('a'); const old = initial.players.find(p => p.id === 'a');
  homes.transfer('a','b'); assert.equal(model.view('b').environment,'bridge');
  homes.leave('a'); assert.equal(model.reconcile().players.length,1);
  homes.join('a',home.code); const fresh = model.view('a').players.find(p => p.id === 'a');
  assert.notEqual(fresh.generation,old.generation);
  rejects(() => model.move('a',{generation:old.generation,seq:1,x:old.x,y:old.y,facing:'left'}));
  time += 100; model.move('a',{generation:fresh.generation,seq:1,x:fresh.x+43,y:fresh.y,facing:'right'});
  homes.leave('a'); homes.leave('b'); assert.deepEqual(model.reconcile().players,[]);
});
