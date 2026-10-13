const $ = id => document.getElementById(id);
let session;
let events;
let currentRoom;
let busy = false;
let connected = false;
const money = value => `$${value.toLocaleString('en-US')}`;
const stageNames = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', finished: 'Jako päättyi' };
function cards(container, values, backs = 0) {
  const nodes = values.map(card => {
    const node = document.createElement('span'); node.className = `card ${['h', 'd'].includes(card.suit) ? 'red' : ''}`;
    node.textContent = `${({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[card.rank] || card.rank}${({ s: '♠', h: '♥', d: '♦', c: '♣' })[card.suit]}`; return node;
  });
  for (let i = 0; i < backs; i++) { const node = document.createElement('span'); node.className = 'card back'; node.textContent = '♠'; nodes.push(node); }
  container.replaceChildren(...nodes);
}
async function request(path, data = {}) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error); error.status = response.status; throw error; }
  return result;
}
function render(room) {
  if (currentRoom?.hand && room.hand && currentRoom.hand.number === room.hand.number && currentRoom.hand.version > room.hand.version) return;
  currentRoom = room;
  $('entry').classList.add('hidden'); $('lobby').classList.remove('hidden'); $('room-code').textContent = room.code;
  $('players').replaceChildren(...room.players.map(player => {
    const row = document.createElement('li');
    const name = document.createElement('span'); name.textContent = `${player.name}${player.id === session.playerId ? ' (sinä)' : ''}${player.host ? ' · host' : ''} · ${money(player.stack)}`;
    const status = document.createElement('small'); status.textContent = !player.connected ? 'Poissa linjoilta' : player.ready ? '✓ Valmis' : 'Odottaa';
    row.append(name, status); return row;
  }));
  $('ready').textContent = room.players.find(p => p.id === session.playerId)?.ready ? 'Peru valmius' : 'Olen valmis';
  const me = room.players.find(p => p.id === session.playerId);
  const playing = room.hand && room.hand.stage !== 'finished';
  $('start').classList.toggle('hidden', !me?.host);
  $('start').textContent = room.hand ? 'Seuraava jako' : 'Aloita Hold’em';
  const funded = room.players.filter(p => p.stack > 0 && p.connected);
  $('start').disabled = !connected || busy || playing || funded.length < 2 || funded.some(p => !p.ready);
  $('ready').disabled = !connected || busy || playing || me?.stack === 0;
  $('leave').disabled = !connected || busy || (playing && room.hand.seats.some(p => p.id === session.playerId));
  $('table').classList.toggle('hidden', !room.hand);
  document.querySelector('main').classList.toggle('in-game', Boolean(room.hand));
  $('lobby-help').textContent = playing ? 'Vuoroaika 60 s. Ajan loppuessa check tai fold. Poistuminen jaon jälkeen.' : me?.stack === 0 ? 'Pelimerkkisi loppuivat. Voit seurata peliä; pankki tulee myöhemmin.' : 'Kaikki valmiiksi, sitten host aloittaa jaon.';
  if (!room.hand) return;
  const h = room.hand;
  $('hand-title').textContent = `Jako #${h.number} · ${stageNames[h.stage]}`;
  $('pot').textContent = h.stage === 'finished' ? 'Potti jaettu' : `POTTI ${money(h.pot)}`;
  cards($('board'), h.board, 5 - h.board.length);
  $('seats').replaceChildren(...h.seats.map(player => {
    const seat = document.createElement('div'); seat.className = `seat ${player.id === h.turnId ? 'turn' : ''} ${player.folded ? 'folded' : ''}`;
    const name = document.createElement('strong'); name.textContent = `${player.id === h.dealerId ? 'Ⓓ ' : ''}${player.name}${player.id === session.playerId ? ' · sinä' : ''}`;
    const stack = document.createElement('span'); stack.textContent = money(player.stack);
    const status = document.createElement('small'); status.textContent = player.folded ? 'Fold' : player.allIn ? 'ALL-IN' : `Panostettu ${money(player.bet)}`;
    const hand = document.createElement('div'); hand.className = 'cards mini'; cards(hand, player.cards, player.cards.length ? 0 : 2);
    seat.append(name, stack, status, hand); return seat;
  }));
  const seat = h.seats.find(p => p.id === session.playerId);
  cards($('hole'), seat?.cards || []);
  $('controls').classList.toggle('hidden', !h.actions);
  const legal = h.actions;
  if (legal) {
    $('call').textContent = legal.canCheck ? 'Check' : `Call ${money(legal.call)}`;
    $('fold').disabled = busy || !connected; $('call').disabled = busy || !connected;
    $('raise-button').disabled = busy || !connected || !legal.canRaise;
    $('all-in').disabled = busy || !connected || (!legal.canRaise && legal.maxRaiseTo > h.currentBet);
    $('raise').min = Math.min(legal.minRaiseTo, legal.maxRaiseTo); $('raise').max = legal.maxRaiseTo;
    $('raise').disabled = !legal.canRaise || busy || !connected;
    if (document.activeElement !== $('raise')) $('raise').value = Math.min(legal.minRaiseTo, legal.maxRaiseTo);
    $('action-help').textContent = legal.canRaise ? `Sinun vuorosi · pienin korotus yhteensä ${money(legal.minRaiseTo)}` : 'Sinun vuorosi · korotusoikeus suljettu';
  }
  $('results').textContent = h.results.map(r => `${r.name} voitti ${money(r.amount)} · ${r.hand}`).join(' / ');
  $('history').replaceChildren(...h.log.map(message => { const li = document.createElement('li'); li.textContent = message; return li; }));
  updateClock();
}
function updateClock() {
  if (!currentRoom?.hand) return;
  const h = currentRoom.hand;
  const name = h.seats.find(p => p.id === h.turnId)?.name;
  $('turn-status').textContent = h.stage === 'finished' ? 'Host voi aloittaa seuraavan jaon' : `${h.turnId === session?.playerId ? 'Sinun' : name + ':n'} vuoro · ${Math.max(0, Math.ceil((currentRoom.deadline - Date.now()) / 1000))} s`;
}
setInterval(updateClock, 1000);
function resetSession(message = '') {
  events?.abort(); sessionStorage.removeItem('casino-session'); session = null; currentRoom = null; connected = false;
  $('lobby').classList.add('hidden'); $('table').classList.add('hidden'); document.querySelector('main').classList.remove('in-game'); $('entry').classList.remove('hidden');
  $('error').textContent = message;
}
function retryDelay(ms, signal) {
  return new Promise(resolve => {
    const stop = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, ms);
    signal.addEventListener('abort', stop, { once: true });
  });
}
async function connect() {
  events?.abort();
  const controller = new AbortController(); events = controller;
  const token = session.token; let retries = 0;
  while (!controller.signal.aborted && session?.token === token) {
    try {
      const response = await fetch('/api/events', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (response.status === 401) { resetSession('Lobby on sulkeutunut tai palvelin on käynnistynyt uudelleen. Luo uusi lobby tai liity koodilla.'); return; }
      if (!response.ok) throw new Error('Yhteys epäonnistui.');
      connected = true; retries = 0; $('connection').textContent = '● Yhteys palvelimeen toimii';
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      try {
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const message = buffer.slice(0, end); buffer = buffer.slice(end + 2);
            if (message.startsWith('data: ')) render(JSON.parse(message.slice(6)));
          }
        }
      } finally { await reader.cancel().catch(() => {}); }
    } catch { if (controller.signal.aborted) return; }
    if (controller.signal.aborted || session?.token !== token) return;
    connected = false; $('connection').textContent = 'Yhteys katkesi — yritetään palauttaa…'; if (currentRoom) render(currentRoom);
    await retryDelay(Math.min(1000 * 2 ** retries++, 10000), controller.signal);
  }
}
async function join(path) {
  $('error').textContent = '';
  session = await request(path, { name: $('name').value, code: $('code').value });
  sessionStorage.setItem('casino-session', JSON.stringify(session)); render(session.room); connect();
}
function action(fn) { return async event => { event?.preventDefault(); if (busy) return; busy = true; $('error').textContent = ''; try { await fn(); } catch (error) { if (error.status === 401) resetSession('Istunto päättyi. Liity lobbyyn uudelleen.'); else $('error').textContent = error.message; } finally { busy = false; if (session && currentRoom) render(currentRoom); } }; }
$('create-form').onsubmit = action(() => join('/api/create'));
$('join-form').onsubmit = action(() => join('/api/join'));
$('ready').onclick = action(async () => render(await request('/api/ready')));
$('copy').onclick = action(async () => { await navigator.clipboard.writeText($('room-code').textContent); $('copy').textContent = 'Kopioitu'; });
$('invite').onclick = action(async () => { const url = new URL('/', location.origin); url.searchParams.set('room', currentRoom.code); await navigator.clipboard.writeText(url.href); $('invite').textContent = 'Kutsulinkki kopioitu'; });
$('start').onclick = action(async () => render(await request('/api/start')));
async function pokerAction(kind, amount) {
  const h = currentRoom.hand;
  render(await request('/api/action', { hand: h.number, version: h.version, action: kind, amount }));
}
$('fold').onclick = action(() => pokerAction('fold'));
$('call').onclick = action(() => pokerAction(currentRoom.hand.actions.canCheck ? 'check' : 'call'));
$('all-in').onclick = action(() => pokerAction(currentRoom.hand.actions.maxRaiseTo > currentRoom.hand.currentBet ? 'raise' : 'call', currentRoom.hand.actions.maxRaiseTo));
$('raise-form').onsubmit = action(() => pokerAction('raise', Number($('raise').value)));
$('leave').onclick = action(async () => { await request('/api/leave'); resetSession(); });
const inviteCode = new URL(location.href).searchParams.get('room');
if (inviteCode && /^[A-F0-9]{6}$/i.test(inviteCode)) $('code').value = inviteCode.toUpperCase();
try { const stored = sessionStorage.getItem('casino-session'); if (stored) { session = JSON.parse(stored); render(await request('/api/session')); connect(); } } catch { sessionStorage.removeItem('casino-session'); session = null; }
