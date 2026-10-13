import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';

test('lobby membership, readiness, host transfer and access control', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, data = {}, token) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  }
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await post('/api/create', { name: '' })).status, 400);
    const host = (await post('/api/create', { name: 'Host' })).data;
    assert.equal(host.room.players.length, 1);
    assert.equal((await post('/api/join', { name: 'Friend', code: 'XXXXXX' })).status, 404);
    const friend = (await post('/api/join', { name: 'Friend', code: host.room.code.toLowerCase() })).data;
    assert.equal(friend.room.players.length, 2);
    const stream = await fetch(`${base}/api/events`, { headers: { Authorization: `Bearer ${friend.token}` } });
    const reader = stream.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /"connected":true/);
    const ready = await post('/api/ready', {}, friend.token);
    assert.equal(ready.data.players.find(p => p.id === friend.playerId).ready, true);
    const update = new TextDecoder().decode((await reader.read()).value);
    assert.match(update, /"ready":true/);
    await reader.cancel();
    assert.equal((await post('/api/ready')).status, 401);
    for (let i = 0; i < 4; i++) assert.equal((await post('/api/join', { name: `P${i}`, code: host.room.code })).status, 200);
    assert.equal((await post('/api/join', { name: 'Extra', code: host.room.code })).status, 409);
    await post('/api/leave', {}, host.token);
    assert.equal((await post('/api/session', {}, host.token)).status, 401);
    const restored = await post('/api/session', {}, friend.token);
    assert.equal(restored.data.players[0].host, true);
    assert.equal(restored.data.players[0].ready, true);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
