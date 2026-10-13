import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from '../server.mjs';

async function setup(options = {}) {
  const server = createServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, data = {}, token, extraHeaders = {}) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  }
  const readers = [];
  async function connect(token) {
    const response = await fetch(base + '/api/events', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('x-accel-buffering'), 'no');
    const reader = response.body.getReader(); readers.push(reader); await reader.read(); return reader;
  }
  async function close() { for (const reader of readers) await reader.cancel(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  return { base, post, connect, close };
}
test('health, response headers, same-origin POST and bearer-only stream access', async () => {
  const app = await setup();
  try {
    const health = await fetch(app.base + '/health'); assert.equal(health.status, 200); assert.deepEqual(await health.json(), { ok: true });
    const page = await fetch(app.base); assert.equal(page.headers.get('referrer-policy'), 'no-referrer'); assert.equal(page.headers.get('x-frame-options'), 'DENY'); assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
    const denied = await app.post('/api/create', { name: 'X' }, null, { Origin: 'https://another-site.example' }); assert.equal(denied.status, 403);
    const joined = await app.post('/api/create', { name: 'A' }, null, { Origin: app.base }); assert.equal(joined.status, 200);
    assert.equal((await fetch(`${app.base}/api/events?token=${joined.data.token}`)).status, 401);
    for (let i = 0; i < 3; i++) await app.connect(joined.data.token);
    assert.equal((await fetch(app.base + '/api/events', { headers: { Authorization: `Bearer ${joined.data.token}` } })).status, 429);
  } finally { await app.close(); }
});
test('creation throttling, bounded rooms and abandoned-lobby cleanup', async () => {
  let time = 1000; const app = await setup({ now: () => time, creationLimit: 2, roomLimit: 1, graceMs: 100, cleanupMs: 5 });
  try {
    const first = (await app.post('/api/create', { name: 'A' })).data;
    assert.equal((await app.post('/api/create', { name: 'B' })).status, 503);
    assert.equal((await app.post('/api/join', { name: 'B', code: first.room.code })).status, 429);
    time += 60001; await delay(25);
    assert.equal((await app.post('/api/session', {}, first.token)).status, 401);
    assert.equal((await app.post('/api/create', { name: 'C' })).status, 200);
  } finally { await app.close(); }
});
test('short disconnect restores the same seat; expired host is removed and replaced', async () => {
  let time = 1000; const app = await setup({ now: () => time, graceMs: 100, cleanupMs: 5 });
  try {
    const a = (await app.post('/api/create', { name: 'A' })).data;
    const b = (await app.post('/api/join', { name: 'B', code: a.room.code })).data;
    const stream = await app.connect(a.token); await app.connect(b.token);
    await app.post('/api/ready', {}, a.token); await stream.cancel(); await delay(15);
    time += 50;
    const restored = (await app.post('/api/session', {}, a.token)).data;
    assert.equal(restored.players[0].id, a.playerId); assert.equal(restored.players[0].ready, true);
    const reconnected = await app.connect(a.token); await reconnected.cancel(); await delay(15);
    time += 101; await delay(25);
    assert.equal((await app.post('/api/session', {}, a.token)).status, 401);
    const room = (await app.post('/api/session', {}, b.token)).data;
    assert.equal(room.players.length, 1); assert.equal(room.players[0].host, true);
  } finally { await app.close(); }
});
test('expired disconnected seat stays until hand settles; turn timeout handles it', async () => {
  let time = 1000; const app = await setup({ now: () => time, graceMs: 100, cleanupMs: 5, turnMs: 100 });
  try {
    const a = (await app.post('/api/create', { name: 'A' })).data;
    const b = (await app.post('/api/join', { name: 'B', code: a.room.code })).data;
    const disconnected = await app.connect(a.token); await app.connect(b.token);
    await app.post('/api/ready', {}, a.token); await app.post('/api/ready', {}, b.token); await app.post('/api/start', {}, a.token);
    await disconnected.cancel(); await delay(15); time += 101; await delay(20);
    const pending = (await app.post('/api/session', {}, b.token)).data;
    assert.equal(pending.hand.stage, 'preflop'); assert.equal(pending.players.length, 2); assert.equal(pending.players.find(p => p.id === b.playerId).host, true);
    await delay(130);
    const settled = (await app.post('/api/session', {}, b.token)).data;
    assert.equal(settled.hand.stage, 'finished'); assert.equal(settled.players.length, 1); assert.equal(settled.players[0].stack, 1005);
  } finally { await app.close(); }
});
