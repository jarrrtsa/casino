import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { startHand, act, viewHand, legalActions } from './poker.mjs';

const publicFiles = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/assets/cellar.svg', ['assets/cellar.svg', 'image/svg+xml']], ['/assets/avatars.svg', ['assets/avatars.svg', 'image/svg+xml']]]);
export function createServer(options = {}) {
const rooms = new Map();
const sessions = new Map();
const streams = new Map();
const requests = new Map();
const now = options.now || Date.now;
const graceMs = options.graceMs ?? 120000;
const creationLimit = options.creationLimit ?? 30;
const roomLimit = options.roomLimit ?? 100;
function removeSession(token, session) {
  const { room, player } = session;
  room.players = room.players.filter(p => p.id !== player.id);
  sessions.delete(token);
  for (const stream of streams.get(player.id) || []) stream.end();
  streams.delete(player.id);
  if (room.host === player.id) room.host = (room.players.find(p => streams.get(p.id)?.size) || room.players[0])?.id;
  if (!room.players.length) { clearTimeout(room.timer); rooms.delete(room.code); } else broadcast(room);
}
function cleanup() {
  for (const [token, session] of sessions) {
    if (streams.get(session.player.id)?.size || now() - session.player.disconnectedAt < graceMs) continue;
    // Finish the current hand before removing a seat with committed chips.
    if (session.room.hand && session.room.hand.stage !== 'finished' && session.room.hand.seats.some(p => p.id === session.player.id)) {
      const replacement = session.room.players.find(p => streams.get(p.id)?.size);
      if (session.room.host === session.player.id && replacement) { session.room.host = replacement.id; broadcast(session.room); }
      continue;
    }
    removeSession(token, session);
  }
  for (const [key, bucket] of requests) if (now() - bucket.start >= 60000) requests.delete(key);
}
function allowRequest(key, limit) {
  let bucket = requests.get(key);
  if (!bucket || now() - bucket.start >= 60000) { bucket = { start: now(), count: 0 }; requests.set(key, bucket); }
  return ++bucket.count <= limit;
}
function snapshot(room, id) {
  return { code: room.code, players: room.players.map(p => ({ id: p.id, name: p.name, stack: room.hand?.seats.find(s => s.id === p.id)?.stack ?? p.stack, ready: p.ready, host: p.id === room.host, connected: Boolean(streams.get(p.id)?.size) })), stage: room.hand ? 'table' : 'lobby', hand: viewHand(room.hand, id), deadline: room.deadline || null, serverTime: now(), turnDuration: options.turnMs ?? 60000 };
}
function broadcast(room) {
  for (const p of room.players) for (const stream of streams.get(p.id) || []) stream.write(`data: ${JSON.stringify(snapshot(room, p.id))}\n\n`);
}
function scheduleTurn(room) {
  clearTimeout(room.timer); room.deadline = null;
  if (!room.hand || room.hand.stage === 'finished') return;
  room.deadline = now() + (options.turnMs ?? 60000);
  room.timer = setTimeout(() => {
    const id = room.hand.seats[room.hand.turn]?.id;
    const legal = legalActions(room.hand, id);
    if (legal) act(room.hand, id, legal.canCheck ? 'check' : 'fold');
    scheduleTurn(room); broadcast(room);
  }, options.turnMs ?? 60000);
  room.timer.unref();
}
function reply(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }
async function body(req) {
  let data = '';
  for await (const chunk of req) { data += chunk; if (data.length > 4096) throw new Error('Pyyntö on liian suuri.'); }
  return JSON.parse(data || '{}');
}
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'GET' && url.pathname === '/health') return reply(res, 200, { ok: true });
      if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
        if (req.headers.origin) {
          let originHost;
          try { originHost = new URL(req.headers.origin).host; } catch { return reply(res, 403, { error: 'Virheellinen alkuperä.' }); }
          if (originHost !== req.headers.host) return reply(res, 403, { error: 'Pyyntö tulee eri sivustolta.' });
        }
        // Deliberately ignore forwarded IP headers: a proxy IP limit protects resources,
        // while session limits below handle players sharing the same proxy.
        if (!allowRequest(`global:${req.socket.remoteAddress}`, 600)) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'Liikaa pyyntöjä. Odota hetki.' }); }
      }
      if (req.method === 'GET' && publicFiles.has(url.pathname)) {
        const [file, type] = publicFiles.get(url.pathname);
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        res.end(await readFile(new URL(`./public/${file}`, import.meta.url))); return;
      }
      if (req.method === 'POST' && ['/api/create', '/api/join'].includes(url.pathname)) {
        cleanup();
        if (!allowRequest(`join:${req.socket.remoteAddress}`, creationLimit)) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'Liikaa liittymisyrityksiä. Odota minuutti.' }); }
        const data = await body(req);
        const name = typeof data.name === 'string' ? data.name.trim().slice(0, 24) : '';
        if (!name) return reply(res, 400, { error: 'Anna pelaajalle nimi.' });
        let room;
        if (url.pathname === '/api/create') {
          if (rooms.size >= roomLimit) return reply(res, 503, { error: 'Palvelin on täynnä. Kokeile myöhemmin.' });
          let code;
          do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
          room = { code, host: null, players: [] }; rooms.set(code, room);
        } else { room = rooms.get(String(data.code || '').trim().toUpperCase()); }
        if (!room) return reply(res, 404, { error: 'Lobbyä ei löytynyt. Tarkista koodi.' });
        if (room.players.length >= 6) return reply(res, 409, { error: 'Pöytä on täynnä (6 pelaajaa).' });
        const player = { id: randomUUID(), name, ready: false, stack: 1000, disconnectedAt: now() };
        if (!room.host) room.host = player.id;
        room.players.push(player);
        const token = randomBytes(32).toString('hex');
        sessions.set(token, { room, player }); broadcast(room);
        return reply(res, 200, { token, playerId: player.id, room: snapshot(room, player.id) });
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      const session = sessions.get(token);
      if (url.pathname.startsWith('/api/') && !session) return reply(res, 401, { error: 'Liity ensin lobbyyn.' });
      if (session && req.method === 'POST' && !allowRequest(`session:${token}`, 120)) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'Liikaa pyyntöjä. Odota minuutti.' }); }
      if (req.method === 'POST' && url.pathname === '/api/session') return reply(res, 200, snapshot(session.room, session.player.id));
      if (req.method === 'GET' && url.pathname === '/api/events') {
        if ((streams.get(session.player.id)?.size || 0) >= 3) return reply(res, 429, { error: 'Liikaa yhtäaikaisia yhteyksiä.' });
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        if (!streams.has(session.player.id)) streams.set(session.player.id, new Set());
        streams.get(session.player.id).add(res); broadcast(session.room);
        session.player.disconnectedAt = null;
        const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);
        res.on('close', () => { clearInterval(keepalive); streams.get(session.player.id)?.delete(res); if (!streams.get(session.player.id)?.size) session.player.disconnectedAt = now(); broadcast(session.room); }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/ready') {
        if (session.room.hand && session.room.hand.stage !== 'finished') return reply(res, 409, { error: 'Jako on kesken.' });
        session.player.ready = !session.player.ready; broadcast(session.room); return reply(res, 200, snapshot(session.room, session.player.id));
      }
      if (req.method === 'POST' && url.pathname === '/api/start') {
        const { room, player } = session;
        if (room.host !== player.id) return reply(res, 403, { error: 'Vain host voi aloittaa jaon.' });
        if (room.hand && room.hand.stage !== 'finished') return reply(res, 409, { error: 'Jako on jo käynnissä.' });
        cleanup();
        const funded = room.players.filter(p => p.stack > 0 && streams.get(p.id)?.size);
        if (funded.length < 2 || funded.some(p => !p.ready)) return reply(res, 409, { error: 'Tarvitaan vähintään kaksi paikalla olevaa pelaajaa. Kaikkien pelaavien tulee olla valmiina.' });
        const previousDealer = room.hand?.seats[room.hand.dealer].id;
        const oldIndex = room.players.findIndex(p => p.id === previousDealer);
        let dealer = funded[0].id;
        if (oldIndex >= 0) for (let i = 1; i <= room.players.length; i++) { const p = room.players[(oldIndex + i) % room.players.length]; if (funded.includes(p)) { dealer = p.id; break; } }
        room.hand = startHand(funded, dealer, (room.hand?.number || 0) + 1);
        scheduleTurn(room); broadcast(room); return reply(res, 200, snapshot(room, player.id));
      }
      if (req.method === 'POST' && url.pathname === '/api/action') {
        const data = await body(req); const { room, player } = session;
        if (!room.hand || data.hand !== room.hand.number || data.version !== room.hand.version) return reply(res, 409, { error: 'Pöydän tilanne muuttui. Tarkista vuorosi.' });
        try { act(room.hand, player.id, data.action, data.amount); } catch (error) { return reply(res, 400, { error: error.message }); }
        scheduleTurn(room); broadcast(room); return reply(res, 200, snapshot(room, player.id));
      }
      if (req.method === 'POST' && url.pathname === '/api/leave') {
        const { room, player } = session;
        if (room.hand?.stage !== 'finished' && room.hand?.seats.some(p => p.id === player.id)) return reply(res, 409, { error: 'Odota jaon päättymistä ennen pöydästä poistumista. Vuoro ohitetaan automaattisesti 60 sekunnissa.' });
        removeSession(token, session);
        return reply(res, 200, { ok: true });
      }
      reply(res, 404, { error: 'Sivua ei löytynyt.' });
    } catch { reply(res, 400, { error: 'Pyyntöä ei voitu käsitellä.' }); }
  });
  const housekeeping = setInterval(cleanup, options.cleanupMs ?? 10000);
  housekeeping.unref();
  server.on('close', () => { clearInterval(housekeeping); for (const room of rooms.values()) clearTimeout(room.timer); });
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  const server = createServer();
  server.listen(port, host, () => console.log(`Casino Royale: http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`));
  function shutdown() { server.close(); server.closeAllConnections(); const timer = setTimeout(() => process.exit(0), 5000); timer.unref(); }
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
