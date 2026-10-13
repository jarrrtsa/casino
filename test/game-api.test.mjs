import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';

test('HTTP game actions enforce host, readiness, private cards, versions and dealer rotation', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const readers = [];
  async function post(path, token, data = {}) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  }
  try {
    const a = (await post('/api/create', null, { name: 'A' })).data;
    const b = (await post('/api/join', null, { name: 'B', code: a.room.code })).data;
    for (const p of [a, b]) { const stream = await fetch(`${base}/api/events`, { headers: { Authorization: `Bearer ${p.token}` } }); const reader = stream.body.getReader(); readers.push(reader); await reader.read(); }
    assert.equal((await post('/api/start', a.token)).status, 409);
    await post('/api/ready', a.token); await post('/api/ready', b.token);
    assert.equal((await post('/api/start', b.token)).status, 403);
    const begun = await post('/api/start', a.token); assert.equal(begun.status, 200);
    assert.equal(begun.data.hand.seats[0].cards.length, 2); assert.equal(begun.data.hand.seats[1].cards.length, 0);
    const other = (await post('/api/session', b.token)).data;
    assert.equal(other.hand.seats[0].cards.length, 0); assert.equal(other.hand.seats[1].cards.length, 2);
    assert.equal((await post('/api/start', a.token)).status, 409);
    assert.equal((await post('/api/leave', a.token)).status, 409);
    assert.equal((await post('/api/action', b.token, { hand: 1, version: 0, action: 'fold' })).status, 400);
    const called = await post('/api/action', a.token, { hand: 1, version: 0, action: 'call' }); assert.equal(called.status, 200);
    assert.equal((await post('/api/action', a.token, { hand: 1, version: 0, action: 'call' })).status, 409);
    const ended = await post('/api/action', b.token, { hand: 1, version: 1, action: 'fold' }); assert.equal(ended.data.hand.stage, 'finished');
    assert.deepEqual(ended.data.players.map(p => p.stack), [1010, 990]);
    const second = await post('/api/start', a.token); assert.equal(second.data.hand.number, 2); assert.equal(second.data.hand.dealerId, b.playerId); assert.equal(second.data.hand.turnId, b.playerId);
    await post('/api/action', b.token, { hand: 2, version: 0, action: 'fold' });
    for (const reader of readers) await reader.cancel();
    await post('/api/leave', b.token); await post('/api/leave', a.token);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
