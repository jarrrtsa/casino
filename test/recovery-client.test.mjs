import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createIdentityClient, copyRecoveryKey } from '../public/character.js';
import { createServer } from '../server.mjs';

const KEY = 'casino-identity-v1';
const OLD = 'a'.repeat(64), NEW = 'b'.repeat(64), RECOVERY = 'c'.repeat(64);
const character = (id = 'hero', name = 'Hero') => ({ id, name, cash: 720, debt: 100, xp: 45, inTable: false });
function storage(initial) {
  const data = new Map(initial ? [[KEY, JSON.stringify(initial)]] : []);
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const response = (status, body, retry = '60') => ({ status, ok: status < 400, headers: { get: () => retry }, json: async () => body });
const deferred = () => { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };

test('clean-browser recovery saves only access token/name and updates identity once', async () => {
  const store = storage(), changes = []; let resets = 0, request;
  const client = createIdentityClient({ storage: store, fetch: async (path, init) => { request = { path, init }; return response(200, { token: NEW, character: character() }); }, onChange: c => changes.push(c), onReplace: () => resets++ });
  await client.recover(` ${RECOVERY.toUpperCase()} `);
  assert.equal(request.path, '/api/character/recover');assert.deepEqual(request.init.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(request.init.body), { recoveryKey: RECOVERY });
  assert.deepEqual(JSON.parse(store.data.get(KEY)), { token: NEW, name: 'Hero' });
  assert.ok(!store.data.get(KEY).includes(RECOVERY));assert.equal(changes.length, 1);assert.equal(resets, 1);assert.equal(client.profile.cash, 720);
});

test('replacement needs confirmation; active local/known server tables prevent requests', async () => {
  let calls = 0;const client = createIdentityClient({ storage: storage({ token: OLD, name: 'Old', creationKey: 'old-creation-key' }), fetch: async () => { calls++;return response(200, { token: NEW, character: character('other', 'Other') }); } });
  await assert.rejects(client.recover(RECOVERY), /Confirm replacing/);assert.equal(calls, 0);
  await assert.rejects(client.recover(RECOVERY, { confirmed: true, hasTable: true }), /Return home/);assert.equal(calls, 0);
  client.update({ ...character(), inTable: true });
  await assert.rejects(client.recover(RECOVERY, { confirmed: true }), /Return home/);assert.equal(calls, 0);
  client.update(character());await client.recover(RECOVERY, { confirmed: true });
  assert.equal(client.identity.creationKey, undefined);assert.equal(client.profile.id, 'other');assert.equal(client.token, NEW);
});

test('invalid keys, server 409/429/503 and network failures preserve current identity', async () => {
  for (const status of [401, 409, 429, 503, 'network']) {
    const store = storage({ token: OLD, name: 'Old' }); let resets = 0;
    const client = createIdentityClient({ storage: store, fetch: async () => { if (status === 'network') throw new Error('network details'); return response(status, { error: 'server details' }, '17'); }, onReplace: () => resets++ });
    const before = store.data.get(KEY);
    await assert.rejects(client.recover(RECOVERY, { confirmed: true }), error => status === 401 ? /Invalid recovery key/.test(error.message) : status === 409 ? /active table/.test(error.message) : status === 429 ? /17 seconds/.test(error.message) : /try again/i.test(error.message));
    assert.equal(store.data.get(KEY), before);assert.equal(client.token, OLD);assert.equal(resets, 0);
  }
});

test('storage failures retain recovered in-memory access and report an actionable warning', async () => {
  const warnings = [];
  const client = createIdentityClient({ storage: { getItem() { throw new Error(); }, setItem() { throw new Error(); } }, fetch: async () => response(200, { token: NEW, character: character() }), onStorageError: text => warnings.push(text) });
  await client.recover(RECOVERY);assert.equal(client.token, NEW);assert.equal(client.profile.id, 'hero');
  assert.match(warnings[0], /Keep this tab open/);assert.ok(!warnings[0].includes(NEW));assert.ok(!warnings[0].includes(RECOVERY));
});

test('late old-character successes, 401s and network errors cannot replace or clear recovery', async () => {
  for (const result of ['success', '401', 'network']) {
    const old = deferred(); let client;
    client = createIdentityClient({ storage: storage({ token: OLD, name: 'Old' }), fetch: async path => path.endsWith('/recover') ? response(200, { token: NEW, character: character() }) : old.promise });
    const pending = client.refresh();const rejected = assert.rejects(pending, e => e.stale === true);
    await client.recover(RECOVERY, { confirmed: true });
    if (result === 'network') old.reject(new Error('old request failed'));
    else old.resolve(response(result === '401' ? 401 : 200, character('old', 'Old')));
    await rejected;assert.equal(client.token, NEW);assert.equal(client.profile.id, 'hero');
  }
});

test('already-returned old profile and game snapshots are fenced even for the same character ID', async () => {
  const client = createIdentityClient({ storage: storage({ token: OLD, name: 'Old' }), fetch: async path => path.endsWith('/recover') ? response(200, { token: NEW, character: character() }) : response(200, { character: { ...character(), cash: 1 } }) });
  const stamp = client.stamp(), oldRoom = await client.gameRequest('/api/session', {}, 'session-token');
  await client.recover(RECOVERY, { confirmed: true });
  assert.equal(client.isCurrent(stamp), false);assert.throws(() => client.assertCurrent(stamp), e => e.stale);
  assert.equal(client.isResponseCurrent(oldRoom), false);assert.equal(client.update(oldRoom.character), false);assert.equal(client.profile.cash, 720);
});

test('game requests carry both appropriate credentials and late responses are discarded', async () => {
  const old = deferred(), calls = [];
  const client = createIdentityClient({ storage: storage({ token: OLD }), fetch: async (path, init) => { calls.push({ path, init });return path.endsWith('/recover') ? response(200, { token: NEW, character: character() }) : old.promise; } });
  const game = client.gameRequest('/api/create', { buyIn: 200 });const rejected = assert.rejects(game, e => e.stale);
  assert.equal(calls[0].init.headers['X-Character-Token'], OLD);
  await client.recover(RECOVERY, { confirmed: true });old.resolve(response(200, { room: { character: character() } }));await rejected;
  const changed=createIdentityClient({storage:storage({token:OLD}),fetch:async()=>response(409,{error:'Table state changed. Check your turn.'})});
  await assert.rejects(changed.gameRequest('/api/action',{},'session-token'),/Table state changed/);
});

test('current authenticated 401 invalidates access and offers recovery, but unavailable loading does not enable replacement creation', async () => {
  let unauthorized = 0;
  const store = storage({ token: OLD, name: 'Old', creationKey: 'legacy-key' });
  const client = createIdentityClient({ storage: store, fetch: async () => response(401, {}), onUnauthorized: () => unauthorized++ });
  await assert.rejects(client.refresh(), e => e.status === 401);
  assert.equal(client.token, undefined);assert.equal(client.identity.creationKey, undefined);assert.equal(unauthorized, 1);
  const unavailable = createIdentityClient({ storage: storage({ token: OLD }), fetch: async () => response(503, {}) });
  await assert.rejects(unavailable.refresh());await assert.rejects(unavailable.create('Accidental replacement'), /Existing character access/);assert.equal(unavailable.token, OLD);
});

test('recovery key generation is explicit, and clipboard rejection selects a manual copy', async () => {
  let calls = 0, selected = 0, copied;
  const store = storage({ token: OLD });const client = createIdentityClient({ storage: store, fetch: async path => { calls++;assert.equal(path, '/api/character/recovery-key');return response(200, { recoveryKey: RECOVERY }); } });
  assert.equal(calls, 0);assert.equal(await client.issueRecovery(), RECOVERY);assert.equal(calls, 1);assert.ok(!store.data.get(KEY).includes(RECOVERY));
  await copyRecoveryKey(RECOVERY, { writeText: async key => { copied = key; }, select: () => selected++, onStatus: text => assert.match(text, /copied/) });
  assert.equal(copied, RECOVERY);
  await copyRecoveryKey(RECOVERY, { writeText: async () => { throw new Error('denied'); }, select: () => selected++, onStatus: text => assert.match(text, /manually/) });assert.equal(selected, 1);
  await copyRecoveryKey(RECOVERY, { writeText: async () => { throw new Error('denied'); }, select: () => { throw new Error('Closed window must not select'); }, onStatus: () => { throw new Error('Closed window must not show status'); }, isCurrent: () => false });
});

test('real API: create key, recover in a clean profile and preserve wallet, reject old access and active target', async () => {
  const server = createServer({ requireCharacters: true });await new Promise(r => server.listen(0, '127.0.0.1', r));const base = `http://127.0.0.1:${server.address().port}`;
  const send = (path, init) => fetch(base + path, init);
  try {
    const first = createIdentityClient({ storage: storage(), fetch: send });await first.create('Recoverable');
    first.update(await first.request('/api/character/customize', { operation: randomUUID(), outfit: 'cap', color: 'sage' }));
    const key = await first.issueRecovery(), oldToken = first.token;
    const second = createIdentityClient({ storage: storage(), fetch: send });await second.recover(key);
    assert.equal(second.profile.id, first.profile.id);assert.equal(second.profile.cash, 950);assert.equal(second.profile.outfit, 'cap');assert.notEqual(second.token, oldToken);
    await assert.rejects(first.refresh(), e => e.status === 401);assert.equal(first.token, undefined);
    const game = await second.gameRequest('/api/create', { buyIn: 100 });
    const third = createIdentityClient({ storage: storage(), fetch: send });await assert.rejects(third.recover(key), e => e.status === 409);assert.equal(third.token, undefined);
    await second.gameRequest('/api/leave', {}, game.token);await second.refresh();
    await third.recover(key);assert.equal(third.profile.cash, 950);assert.equal(third.profile.id, second.profile.id);
  } finally { server.closeAllConnections();await new Promise(r => server.close(r)); }
});

test('an old tab cannot overwrite a recovery token saved by another tab', async () => {
  const store=storage({token:OLD,name:'Old'}),pending=deferred();
  const oldTab=createIdentityClient({storage:store,fetch:async()=>pending.promise});
  const oldRequest=oldTab.refresh(),ignored=assert.rejects(oldRequest,e=>e.stale);
  const newTab=createIdentityClient({storage:store,fetch:async()=>response(200,{token:NEW,character:character()})});
  await newTab.recover(RECOVERY,{confirmed:true});pending.resolve(response(401,{}));await ignored;
  assert.equal(oldTab.token,NEW);assert.equal(JSON.parse(store.data.get(KEY)).token,NEW);
  const stamp=newTab.stamp();store.setItem(KEY,JSON.stringify({name:'Hero'}));assert.equal(newTab.syncStorage(),true);assert.equal(newTab.token,undefined);assert.equal(newTab.isCurrent(stamp),false);
});
