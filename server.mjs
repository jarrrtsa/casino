import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { startHand, act, viewHand, legalActions } from './poker.mjs';
import { createEconomy } from './economy.mjs';
import { botAction } from './bots.mjs';

const publicFiles = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/shell.js', ['shell.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/shell.css', ['shell.css', 'text/css']], ['/assets/dealer.svg', ['assets/dealer.svg', 'image/svg+xml']], ['/assets/home.svg', ['assets/home.svg', 'image/svg+xml']], ['/assets/cellar.svg', ['assets/cellar.svg', 'image/svg+xml']], ['/assets/avatars.svg', ['assets/avatars.svg', 'image/svg+xml']]]);
for(const name of ['bridge','loft','mansion','characters','table-bridge','table-home','table-loft','table-mansion'])publicFiles.set(`/assets/${name}.svg`,[`assets/${name}.svg`,'image/svg+xml']);
publicFiles.set('/character.js',['character.js','text/javascript']);
publicFiles.set('/rpg.css',['rpg.css','text/css']);
export function createServer(options = {}) {
const economy = createEconomy(options.dbPath || ':memory:', options.now || Date.now);
const jobs = new Map();
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
  if (player.characterId) economy.cashOut(player.characterId);
  if (room.singleplayer) { clearTimeout(room.timer); rooms.delete(room.code); }
  room.players = room.players.filter(p => p.id !== player.id);
  sessions.delete(token);
  for (const stream of streams.get(player.id) || []) stream.end();
  streams.delete(player.id);
  if (room.host === player.id) room.host = (room.players.find(p => streams.get(p.id)?.size) || room.players[0])?.id;
  if (!room.players.length || room.singleplayer) { clearTimeout(room.timer); rooms.delete(room.code); } else broadcast(room);
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
  return { code: room.code, singleplayer: Boolean(room.singleplayer), environment: room.environment || 'bridge', players: room.players.map(p => ({ id: p.id, name: p.name, appearance:p.appearance, bot:Boolean(p.bot), stack: room.hand?.seats.find(s => s.id === p.id)?.stack ?? p.stack, ready: p.ready, host: p.id === room.host, connected: p.bot || Boolean(streams.get(p.id)?.size) })), character: room.players.find(p=>p.id===id)?.characterId ? economy.view(room.players.find(p=>p.id===id).characterId) : null, stage: room.hand ? 'table' : 'lobby', hand: viewHand(room.hand, id), deadline: room.deadline || null, serverTime: now(), turnDuration: options.turnMs ?? 60000 };
}
function broadcast(room) {
  for (const p of room.players) for (const stream of streams.get(p.id) || []) stream.write(`data: ${JSON.stringify(snapshot(room, p.id))}\n\n`);
}
function scheduleTurn(room) {
  clearTimeout(room.timer); room.deadline = null;
  if (!room.hand) return;
  economy.sync(room.players,room.hand);
  if(room.hand.stage==='finished') { economy.settle(room.players,room.hand,`hand:${room.id}:${room.hand.number}`); return; }
  const actor=room.players.find(p=>p.id===room.hand.seats[room.hand.turn]?.id);
  const duration=actor?.bot ? (options.botMs ?? 1100) : (options.turnMs ?? 60000);
  room.deadline = now() + duration;
  room.timer = setTimeout(() => {
    const id = room.hand.seats[room.hand.turn]?.id;
    const legal = legalActions(room.hand, id);
    if (legal) { const move=actor?.bot ? botAction(room.hand,id) : {action:legal.canCheck?'check':'fold'}; act(room.hand,id,move.action,move.amount); }
    scheduleTurn(room); broadcast(room);
  }, duration);
  room.timer.unref();
}
function reply(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); }
async function body(req) {
  let data = '';
  for await (const chunk of req) { data += chunk; if (data.length > 4096) throw new Error('Request too large.'); }
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
          try { originHost = new URL(req.headers.origin).host; } catch { return reply(res, 403, { error: 'Invalid origin.' }); }
          if (originHost !== req.headers.host) return reply(res, 403, { error: 'Cross-site request blocked.' });
        }
        // Deliberately ignore forwarded IP headers: a proxy IP limit protects resources,
        // while session limits below handle players sharing the same proxy.
        if (!allowRequest(`global:${req.socket.remoteAddress}`, 600)) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'Too many requests. Try again shortly.' }); }
      }
      if (req.method === 'GET' && publicFiles.has(url.pathname)) {
        const [file, type] = publicFiles.get(url.pathname);
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        res.end(await readFile(new URL(`./public/${file}`, import.meta.url))); return;
      }
      const characterToken=req.headers['x-character-token'] || (url.pathname.startsWith('/api/character') || url.pathname.startsWith('/api/wallet') || url.pathname.startsWith('/api/job') ? req.headers.authorization?.replace(/^Bearer /,'') : null);
      const characterId=economy.authenticate(characterToken);
      if(req.method==='POST' && url.pathname==='/api/character/create') {
        if(!allowRequest(`join:${req.socket.remoteAddress}`,creationLimit))return reply(res,429,{error:'Too many character creations. Wait a minute.'});
        const data=await body(req);return reply(res,200,economy.create(data.name,data.operation));
      }
      if(req.method==='POST' && ['/api/character','/api/character/customize','/api/character/delete','/api/wallet/borrow','/api/wallet/repay','/api/job/start','/api/job/finish'].includes(url.pathname)) {
        if(!characterId)return reply(res,401,{error:'Create or restore your character first.'});
        if(!allowRequest(`character:${characterId}`,120))return reply(res,429,{error:'Too many requests. Wait a minute.'});
        const data=await body(req);
        if(url.pathname==='/api/character'){
          const active=[...sessions.entries()].find(([,s])=>s.player.characterId===characterId);
          return reply(res,200,{...economy.view(characterId),session:active?{token:active[0],playerId:active[1].player.id,room:snapshot(active[1].room,active[1].player.id)}:null});
        }
        if(url.pathname==='/api/character/delete'){economy.remove(characterId,data.name);jobs.delete(characterId);return reply(res,200,{ok:true});}
        if(url.pathname==='/api/job/start') {
          const c=economy.view(characterId);if(c.inTable)throw new Error('Return home before starting a delivery.');
          if(now()-c.lastJob<15000)throw new Error('Next delivery is available in a few seconds.');
          let job=jobs.get(characterId);if(!job||job.complete||now()-job.created>90000){job={id:randomUUID(),pattern:Array.from({length:4},()=>randomBytes(1)[0]%4),created:now(),complete:false};jobs.set(characterId,job);}
          return reply(res,200,{id:job.id,pattern:job.pattern});
        }
        if(url.pathname==='/api/job/finish') {
          const job=jobs.get(characterId);if(!job||job.id!==data.id||now()-job.created>90000)throw new Error('Delivery expired. Start again.');
          if(!Array.isArray(data.answers)||JSON.stringify(data.answers)!==JSON.stringify(job.pattern)){jobs.delete(characterId);throw new Error('Wrong delivery order. Try a new route.');}
          if(now()-job.created<3000)throw new Error('Watch the delivery route first.');
          if(job.complete)return reply(res,200,economy.view(characterId));
          const c=economy.mutate(characterId,job.id,'job');job.complete=true;return reply(res,200,c);
        }
        return reply(res,200,economy.mutate(characterId,data.operation,url.pathname.endsWith('borrow')?'borrow':url.pathname.endsWith('repay')?'repay':'customize',data));
      }
      if (req.method === 'POST' && ['/api/create', '/api/join', '/api/singleplayer'].includes(url.pathname)) {
        cleanup();
        if (!allowRequest(`join:${req.socket.remoteAddress}`, creationLimit)) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'Too many join attempts. Wait a minute.' }); }
        const data = await body(req);
        const character=characterId ? economy.view(characterId) : null;
        if(options.requireCharacters && !character)return reply(res,401,{error:'Create a character before joining a table.'});
        const name = character?.name || (typeof data.name === 'string' ? data.name.trim().slice(0, 24) : '');
        if (!name) return reply(res, 400, { error: 'Enter a player name.' });
        let room;
        if (url.pathname === '/api/create' || url.pathname==='/api/singleplayer') {
          if (rooms.size >= roomLimit) return reply(res, 503, { error: 'Server full. Try again later.' });
          let code;
          do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
          room = { id:randomUUID(), code, host: null, players: [], singleplayer:url.pathname==='/api/singleplayer',environment:character?.home.id||'bridge' };
        } else { room = rooms.get(String(data.code || '').trim().toUpperCase()); }
        if (!room) return reply(res, 404, { error: 'Lobby not found. Check the code.' });
        if(url.pathname==='/api/join' && room.singleplayer)return reply(res,403,{error:'NPC tables are private singleplayer games.'});
        if (room.players.length >= 6) return reply(res, 409, { error: 'Table full (6 players).' });
        const token = randomBytes(32).toString('hex');
        const chips=characterId ? economy.buyIn(characterId,token,data.buyIn) : 1000;
        const player = { id: randomUUID(), name, characterId, appearance:character?{outfit:character.outfit,color:character.color}:null, ready: Boolean(room.singleplayer), stack: chips, disconnectedAt: now() };
        if (!room.host) room.host = player.id;
        room.players.push(player);
        if(room.singleplayer){room.players.push(...['Mara','Jules'].map((name,i)=>({id:randomUUID(),name,bot:true,ready:true,stack:chips,appearance:{outfit:i?'beanie':'coat',color:i?'plum':'amber'}})));}
        rooms.set(room.code,room);
        sessions.set(token, { room, player }); broadcast(room);
        return reply(res, 200, { token, playerId: player.id, room: snapshot(room, player.id) });
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      const session = sessions.get(token);
      if (url.pathname.startsWith('/api/') && !session) return reply(res, 401, { error: 'Join a lobby first.' });
      if (session && req.method === 'POST' && !allowRequest(`session:${token}`, 120)) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'Too many requests. Wait a minute.' }); }
      if (req.method === 'POST' && url.pathname === '/api/session') return reply(res, 200, snapshot(session.room, session.player.id));
      if (req.method === 'GET' && url.pathname === '/api/events') {
        if ((streams.get(session.player.id)?.size || 0) >= 3) return reply(res, 429, { error: 'Too many concurrent connections.' });
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        if (!streams.has(session.player.id)) streams.set(session.player.id, new Set());
        streams.get(session.player.id).add(res); broadcast(session.room);
        session.player.disconnectedAt = null;
        const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);
        res.on('close', () => { clearInterval(keepalive); streams.get(session.player.id)?.delete(res); if (!streams.get(session.player.id)?.size) session.player.disconnectedAt = now(); broadcast(session.room); }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/ready') {
        if (session.room.hand && session.room.hand.stage !== 'finished') return reply(res, 409, { error: 'Hand in progress.' });
        session.player.ready = !session.player.ready; broadcast(session.room); return reply(res, 200, snapshot(session.room, session.player.id));
      }
      if (req.method === 'POST' && url.pathname === '/api/start') {
        const { room, player } = session;
        if (room.host !== player.id) return reply(res, 403, { error: 'Only the host can start a hand.' });
        if (room.hand && room.hand.stage !== 'finished') return reply(res, 409, { error: 'Hand already in progress.' });
        cleanup();
        const funded = room.players.filter(p => p.stack > 0 && (p.bot || streams.get(p.id)?.size));
        if (funded.length < 2 || funded.some(p => !p.ready)) return reply(res, 409, { error: 'At least two connected players are required. All participating players must be ready.' });
        const previousDealer = room.hand?.seats[room.hand.dealer].id;
        const oldIndex = room.players.findIndex(p => p.id === previousDealer);
        let dealer = funded[0].id;
        if (oldIndex >= 0) for (let i = 1; i <= room.players.length; i++) { const p = room.players[(oldIndex + i) % room.players.length]; if (funded.includes(p)) { dealer = p.id; break; } }
        for(const p of funded)p.handStart=p.stack;
        room.hand = startHand(funded, dealer, (room.hand?.number || 0) + 1);
        scheduleTurn(room); broadcast(room); return reply(res, 200, snapshot(room, player.id));
      }
      if (req.method === 'POST' && url.pathname === '/api/action') {
        const data = await body(req); const { room, player } = session;
        if (!room.hand || data.hand !== room.hand.number || data.version !== room.hand.version) return reply(res, 409, { error: 'Table state changed. Check your turn.' });
        try { act(room.hand, player.id, data.action, data.amount); } catch (error) { return reply(res, 400, { error: error.message }); }
        scheduleTurn(room); broadcast(room); return reply(res, 200, snapshot(room, player.id));
      }
      if (req.method === 'POST' && url.pathname === '/api/leave') {
        const { room, player } = session;
        if (room.hand?.stage !== 'finished' && room.hand?.seats.some(p => p.id === player.id)) return reply(res, 409, { error: 'Wait for your hand to finish before leaving. Turns time out after 60 seconds.' });
        removeSession(token, session);
        return reply(res, 200, { ok: true });
      }
      reply(res, 404, { error: 'Page not found.' });
    } catch (error) { reply(res, 400, { error: error.message || 'Unable to process request.' }); }
  });
  const housekeeping = setInterval(cleanup, options.cleanupMs ?? 10000);
  housekeeping.unref();
  server.on('close', () => { clearInterval(housekeeping); for (const room of rooms.values()) clearTimeout(room.timer); economy.close(); });
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  const server = createServer({ dbPath: process.env.CASINO_DB_PATH || resolve('data/casino.sqlite'), requireCharacters:true });
  server.listen(port, host, () => console.log(`Casino Royale: http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`));
  function shutdown() { server.close(); server.closeAllConnections(); const timer = setTimeout(() => process.exit(0), 5000); timer.unref(); }
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
