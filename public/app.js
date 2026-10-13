import { createShell } from './shell.js';
const $ = id => document.getElementById(id);
let session;
let events;
let currentRoom;
let busy = false;
let connected = false;
let clockOffset = 0;
let raiseKey = '';
let soundOn = false;
let audioContext;
const ui = createShell({ getRoom: () => currentRoom, onLeave: () => $('leave').click(), onSound: enabled => setSound(enabled), onError: text => setError(text) });
const money = value => `$${value.toLocaleString('en-US')}`;
const stageNames = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', finished: 'Jako päättyi' };
const cardKey = c => `${c.rank}${c.suit}`;
function node(tag, className = '', text = '') { const element = document.createElement(tag); element.className = className; element.textContent = text; return element; }
function setError(text = '') { $('error').textContent = text; $('error').classList.toggle('hidden', !text); }
function cue(kind) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const notes = kind === 'win' ? [440, 554, 659] : kind === 'turn' ? [440, 587] : [220];
  notes.forEach((frequency, i) => {
    const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); const time = audioContext.currentTime + i * .1;
    osc.type = kind === 'chip' ? 'triangle' : 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.045, time + .015); gain.gain.exponentialRampToValueAtTime(.001, time + .16);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(time); osc.stop(time + .18);
  });
}
function cards(container, values, total = values.length, { back = false, hand = 0, winning = [] } = {}) {
  const winners = new Set(winning.map(cardKey));
  for (let i = 0; i < total; i++) {
    const card = values[i]; const key = `${hand}:${card ? cardKey(card) : back ? 'back' : 'empty'}:${i}`;
    let element = container.children[i];
    if (!element || element.dataset.key !== key) {
      const fresh = node('span', 'card'); fresh.dataset.key = key;
      if (card) {
        const rank = ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[card.rank] || card.rank;
        const suit = ({ s: '♠', h: '♥', d: '♦', c: '♣' })[card.suit];
        fresh.append(node('span', 'card-rank', String(rank)), node('span', 'card-suit', suit), node('span', 'card-center', suit));
        fresh.setAttribute('aria-label', `${rank} ${suit}`);
      } else { fresh.textContent = back ? '♠' : ''; fresh.setAttribute('aria-label', back ? 'Piilotettu kortti' : 'Korttia ei vielä jaettu'); }
      if (element) element.replaceWith(fresh); else container.append(fresh); element = fresh;
    }
    element.className = `card${card && ['h', 'd'].includes(card.suit) ? ' red' : ''}${!card ? back ? ' back' : ' placeholder' : ''}${card && winners.has(cardKey(card)) ? ' winning' : ''}`;
  }
  while (container.children.length > total) container.lastElementChild.remove();
}
function avatar(index) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('seat-avatar'); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `/assets/avatars.svg#${['cap', 'player', 'glasses', 'beanie'][index % 4]}`); svg.append(use); return svg;
}
function renderSeats(room) {
  const h = room.hand; const participants = h?.seats || room.players;
  const ownIndex = participants.findIndex(p => p.id === session.playerId);
  const ordered = ownIndex >= 0 ? [...participants.slice(ownIndex), ...participants.slice(0, ownIndex)] : [null, ...participants];
  const slots = ({ 1: [0], 2: [0, 2], 3: [0, 2, 3], 4: [0, 1, 2, 3], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] })[ordered.length];
  for (let slot = 0; slot < 6; slot++) {
    const index = slots.indexOf(slot); const player = ordered[index];
    let seat = $('seats').children[slot];
    const identity = player?.id || 'empty';
    if (!seat || seat.dataset.id !== identity) {
      const fresh = node('div', 'seat'); fresh.dataset.slot = slot; fresh.dataset.id = identity; fresh.dataset.color = index < 0 ? slot : index;
      if (player) {
        const info = node('div', 'seat-info'); info.append(node('strong', 'seat-name'), node('span', 'seat-stack'), node('small', 'seat-state'), node('div', 'seat-badges'));
        fresh.append(avatar(participants.findIndex(p => p.id === player.id)), info, node('div', 'cards mini'), node('span', 'seat-bet hidden'));
      } else fresh.append(node('div', 'seat-info', 'Vapaa paikka'));
      if (seat) seat.replaceWith(fresh); else $('seats').append(fresh); seat = fresh;
    }
    if (!player) { seat.className = 'seat empty'; continue; }
    const online = room.players.find(p => p.id === player.id);
    const winner = h?.results.some(r => r.id === player.id);
    seat.className = `seat${player.id === session.playerId ? ' self' : ''}${player.folded ? ' folded' : ''}${h?.turnId === player.id ? ' turn' : ''}${winner ? ' winner' : ''}`;
    seat.querySelector('.seat-name').textContent = `${player.name}${player.id === session.playerId ? ' · sinä' : ''}`;
    seat.querySelector('.seat-name').title = player.name;
    seat.querySelector('.seat-stack').textContent = money(player.stack);
    seat.querySelector('.seat-state').textContent = !online?.connected ? 'Yhteys katkesi' : player.folded ? 'Fold' : winner ? `+${money(h.results.filter(r => r.id === player.id).reduce((sum, r) => sum + r.amount, 0))}` : player.allIn ? 'ALL-IN' : h?.stage === 'finished' ? player.handName || 'Jako päättyi' : player.lastAction || (h ? 'Mukana' : online?.ready ? 'Valmis' : 'Odottaa');
    const badges = seat.querySelector('.seat-badges');
    const role = h ? `${h.dealerId === player.id ? 'D' : ''}|${h.smallBlindId === player.id ? 'SB' : h.bigBlindId === player.id ? 'BB' : ''}` : '';
    if (badges.dataset.role !== role) { badges.dataset.role = role; badges.replaceChildren(...role.split('|').filter(Boolean).map(label => node('span', label === 'D' ? '' : 'blind', label))); }
    cards(seat.querySelector('.cards'), player.cards || [], h ? 2 : 0, { back: true, hand: h?.number, winning: winner ? player.bestCards : [] });
    const bet = seat.querySelector('.seat-bet'); const betKey = `${h?.number}:${player.bet || 0}`;
    if (bet.dataset.key !== betKey) { bet.dataset.key = betKey; bet.textContent = money(player.bet || 0); bet.classList.remove('changed'); void bet.offsetWidth; bet.classList.add('changed'); }
    bet.classList.toggle('hidden', !player.bet || h?.stage === 'finished');
  }
}
async function request(path, data = {}) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error); error.status = response.status; throw error; }
  return result;
}
function render(room) {
  if (currentRoom?.code === room.code && currentRoom?.hand && room.hand && (currentRoom.hand.number > room.hand.number || (currentRoom.hand.number === room.hand.number && currentRoom.hand.version > room.hand.version))) return;
  const previous = currentRoom; if (room.serverTime) clockOffset = room.serverTime - Date.now();
  currentRoom = room;
  $('room-code').textContent = room.code;
  $('players').replaceChildren(...room.players.map(player => {
    const row = document.createElement('li');
    const name = document.createElement('span'); name.textContent = `${player.name}${player.id === session.playerId ? ' (sinä)' : ''}${player.host ? ' · host' : ''} · ${money(player.stack)}`;
    const status = document.createElement('small'); status.textContent = !player.connected ? 'Poissa linjoilta' : player.ready ? '✓ Valmis' : 'Odottaa';
    row.append(name, status); return row;
  }));
  $('ready').textContent = room.players.find(p => p.id === session.playerId)?.ready ? 'Peru valmius' : 'Olen valmis';
  const me = room.players.find(p => p.id === session.playerId);
  $('player-count').textContent = `${room.players.length} / 6`;
  const playing = room.hand && room.hand.stage !== 'finished';
  $('start').classList.toggle('hidden', !me?.host);
  $('start').textContent = room.hand ? 'Seuraava jako' : 'Aloita Hold’em';
  const funded = room.players.filter(p => p.stack > 0 && p.connected);
  $('start').disabled = !connected || busy || playing || funded.length < 2 || funded.some(p => !p.ready);
  $('ready').disabled = !connected || busy || playing || me?.stack === 0;
  $('leave').disabled = !connected || busy || (playing && room.hand.seats.some(p => p.id === session.playerId));
  ui.syncRoom(room, previous);
  const ownSeat = room.hand?.seats.find(p => p.id === session.playerId);
  $('hero-name').textContent = `${me?.name || ownSeat?.name || 'Sinä'} · oma käsi`;
  $('hero-stack').textContent = money(ownSeat?.stack ?? me?.stack ?? 0);
  const unready = funded.filter(p => !p.ready).length;
  $('lobby-help').textContent = playing ? 'Jako on käynnissä. Pöydästä voi poistua jaon jälkeen.' : me?.stack === 0 ? 'Pelimerkkisi loppuivat. Voit seurata peliä tai poistua lobbystä.' : funded.length < 2 ? 'Kutsu ainakin yksi kaveri pöytään. Pelaamaan tarvitaan kaksi.' : unready ? `${unready} pelaajaa ei ole vielä valmiina.` : me?.host ? 'Porukka on valmis. Voit aloittaa jaon.' : 'Porukka on valmis. Odotetaan hostia.';
  renderSeats(room);
  if (!room.hand) {
    $('hand-title').textContent = 'Pöytä odottaa teitä'; $('pot').textContent = '$0'; $('pot-label').textContent = 'POTTI'; $('pots').textContent = ''; $('turn-status').textContent = 'Odotetaan porukkaa'; $('turn-clock').textContent = '—';
    cards($('board'), [], 5); cards($('hole'), [], 2, {back:true}); $('hand-name').textContent = 'Kortit jaetaan pian'; $('street').replaceChildren(); $('controls').classList.add('hidden'); $('results').classList.add('hidden');
    $('waiting').classList.remove('hidden'); $('waiting').replaceChildren(node('strong', '', 'Kaikki alkaa yhdestä jaosta.'), node('span', '', 'Kutsu kaverit, merkitse itsesi valmiiksi ja anna hostin aloittaa.')); return;
  }
  const h = room.hand;
  $('hand-title').textContent = `Jako #${h.number} · ${stageNames[h.stage]}`;
  const winnings = h.results.reduce((sum, r) => sum + r.amount, 0);
  $('pot').textContent = money(h.stage === 'finished' ? winnings : h.pot); $('pot-label').textContent = h.stage === 'finished' ? 'JAETTU' : 'POTTI';
  if (previous?.hand && previous.hand.pot !== h.pot) { const pot = document.querySelector('.pot-display'); pot.classList.remove('changed'); void pot.offsetWidth; pot.classList.add('changed'); }
  const winnerCards = h.seats.filter(p => h.results.some(r => r.id === p.id)).flatMap(p => p.bestCards || []);
  cards($('board'), h.board, 5, {hand:h.number, winning: winnerCards});
  $('pots').textContent = h.pots?.length > 1 && (h.stage === 'finished' || h.seats.some(p => p.allIn)) ? h.pots.map((pot, i) => `${pot.uncalled ? 'Avoin panos' : i === 0 ? 'Pääpotti' : 'Sivupotti ' + i}: ${money(pot.amount)}`).join(' · ') : '';
  const phaseKey = `${h.number}:${h.stage}`;
  if ($('street').dataset.key !== phaseKey) { $('street').dataset.key = phaseKey; $('street').replaceChildren(...['preflop', 'flop', 'turn', 'river'].map((phase, i, phases) => node('span', phase === h.stage ? 'active' : phases.indexOf(h.stage) > i || h.stage === 'finished' ? 'passed' : '', phase))); }
  const seat = h.seats.find(p => p.id === session.playerId);
  cards($('hole'), seat?.cards || [], 2, {back:!seat, hand:h.number, winning:h.results.some(r => r.id === session.playerId) ? seat?.bestCards : []});
  document.querySelector('.your-hand').classList.toggle('folded', Boolean(seat?.folded));
  $('hand-name').textContent = seat?.folded ? 'Luovutit tämän jaon' : seat?.handName || (seat ? 'Kaksi omaa korttia' : 'Liityt mukaan seuraavaan jakoon');
  $('controls').classList.toggle('hidden', !h.actions);
  const legal = h.actions;
  $('waiting').classList.toggle('hidden', Boolean(legal));
  if (!legal) {
    const actor = h.seats.find(p => p.id === h.turnId)?.name;
    $('waiting').replaceChildren(node('strong', '', h.stage === 'finished' ? 'Jako pelattu.' : seat?.folded ? 'Tämä jako on ohi osaltasi.' : seat?.allIn ? 'Olet all-in.' : !seat ? 'Seuraat tätä jakoa.' : `${actor} pelaa.`), node('span', '', h.stage === 'finished' ? funded.length < 2 ? 'Seuraavaan jakoon tarvitaan kaksi pelaajaa, joilla on pelimerkkejä.' : me?.host ? 'Aloita seuraava jako, kun porukka on valmis.' : 'Host aloittaa seuraavan jaon.' : 'Pöydän tapahtumat päivittyvät automaattisesti.'));
  }
  if (legal) {
    $('call').textContent = legal.canCheck ? 'Check' : `Call ${money(legal.call)}`;
    $('fold').disabled = busy || !connected; $('call').disabled = busy || !connected;
    $('raise-button').disabled = busy || !connected || !legal.canRaise;
    $('all-in').disabled = busy || !connected || (!legal.canRaise && legal.maxRaiseTo > h.currentBet);
    for (const id of ['raise', 'raise-slider']) { $(id).min = Math.min(legal.minRaiseTo, legal.maxRaiseTo); $(id).max = legal.maxRaiseTo; $(id).disabled = !legal.canRaise || busy || !connected; }
    $('raise').disabled = !legal.canRaise || busy || !connected;
    const key = `${h.number}:${h.version}`;
    if (raiseKey !== key) { raiseKey = key; $('raise').value = Math.min(legal.minRaiseTo, legal.maxRaiseTo); $('raise-slider').value = $('raise').value; }
    document.querySelectorAll('[data-preset]').forEach(button => button.disabled = !legal.canRaise || busy || !connected);
    $('raise-form').classList.toggle('hidden', !legal.canRaise);
    $('action-help').textContent = legal.canCheck ? 'Sinun vuorosi · voit checkata ilman maksua.' : `Sinun vuorosi · maksettavaa ${money(legal.call)}${legal.call === seat?.stack ? ' (all-in)' : ''}.`;
    updateRaiseCost();
  }
  $('results').classList.toggle('hidden', h.stage !== 'finished');
  const resultKey = JSON.stringify([h.number, h.results]);
  if ($('results').dataset.key !== resultKey) {
    $('results').dataset.key = resultKey;
    const winners = [...new Set(h.results.map(r => r.id))].map(id => { const list = h.results.filter(r => r.id === id); return `${list[0].name} +${money(list.reduce((sum, r) => sum + r.amount, 0))}`; });
    $('results').replaceChildren(node('strong', '', winners.join(' · ')), ...h.results.map(r => node('div', '', `${h.pots.length > 1 ? r.pot === 0 ? 'Pääpotti · ' : 'Sivupotti ' + r.pot + ' · ' : ''}${r.name}: ${r.hand} — ${money(r.amount)}`)));
  }
  $('history').replaceChildren(...h.log.map(message => { const li = document.createElement('li'); li.textContent = message; return li; }));
  $('history-count').textContent = `${h.log.length} tapahtumaa`;
  if (previous?.hand && h.number === previous.hand.number && h.version !== previous.hand.version) {
    if (h.stage === 'finished') cue(h.results.some(r => r.id === session.playerId) ? 'win' : 'chip');
    else if (h.turnId === session.playerId && previous.hand.turnId !== session.playerId) cue('turn'); else if (h.pot !== previous.hand.pot) cue('chip');
  }
  updateClock();
}
function updateClock() {
  if (!currentRoom?.hand) return;
  const h = currentRoom.hand;
  const name = h.seats.find(p => p.id === h.turnId)?.name;
  const seconds = Math.max(0, Math.ceil((currentRoom.deadline - Date.now() - clockOffset) / 1000));
  $('turn-status').textContent = h.stage === 'finished' ? 'Jako päättyi' : `${h.turnId === session?.playerId ? 'Sinun vuorosi' : 'Vuorossa: ' + name}`;
  $('turn-clock').textContent = h.stage === 'finished' ? '✓' : `${seconds}`;
  document.querySelector('.turn-indicator').classList.toggle('yours', h.turnId === session?.playerId);
  document.querySelector('.turn-indicator').classList.toggle('urgent', h.stage !== 'finished' && seconds <= 10);
}
function updateRaiseCost() {
  const me = currentRoom?.hand?.seats.find(p => p.id === session?.playerId);
  if (me) $('raise-cost').textContent = `Stackista lisää ${money(Math.max(0, Number($('raise').value) - me.bet))}`;
}
setInterval(updateClock, 1000);
function resetSession(message = '') {
  events?.abort(); sessionStorage.removeItem('casino-session'); session = null; currentRoom = null; connected = false;
  ui.returnHome(); raiseKey = '';
  setError(message);
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
      connected = true; retries = 0; $('connection').textContent = '● Yhteys palvelimeen toimii'; $('connection').classList.remove('offline');
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
    connected = false; $('connection').textContent = 'Yhteys katkesi — palautetaan…'; $('connection').classList.add('offline'); if (currentRoom) render(currentRoom);
    await retryDelay(Math.min(1000 * 2 ** retries++, 10000), controller.signal);
  }
}
async function join(path) {
  setError();
  session = await request(path, { name: $('name').value, code: $('code').value });
  ui.saveName($('name').value);
  sessionStorage.setItem('casino-session', JSON.stringify(session)); render(session.room); connect();
}
function action(fn) { return async event => { event?.preventDefault(); if (busy) return; busy = true; setError(); if (session && currentRoom) render(currentRoom); try { await fn(); } catch (error) { if (error.status === 401) resetSession('Istunto päättyi. Liity lobbyyn uudelleen.'); else setError(error.message || 'Yhteys epäonnistui. Yritä uudelleen.'); } finally { busy = false; if (session && currentRoom) render(currentRoom); } }; }
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
$('raise').oninput = () => { $('raise-slider').value = $('raise').value; updateRaiseCost(); };
$('raise-slider').oninput = () => { $('raise').value = $('raise-slider').value; updateRaiseCost(); };
document.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => {
  const h = currentRoom.hand; const legal = h.actions; if (!legal?.canRaise) return;
  const me = h.seats.find(p => p.id === session.playerId);
  const value = ({ min: legal.minRaiseTo, half: h.currentBet + Math.round((h.pot + legal.call) / 2), pot: h.currentBet + h.pot + legal.call, max: legal.maxRaiseTo })[button.dataset.preset];
  $('raise').value = Math.min(legal.maxRaiseTo, Math.max(Math.min(legal.minRaiseTo, legal.maxRaiseTo), value)); $('raise-slider').value = $('raise').value; updateRaiseCost();
});
async function setSound(enabled) {
  try {
    if (enabled) { audioContext ||= new AudioContext(); await audioContext.resume(); }
    soundOn = enabled; $('sound').textContent = soundOn ? 'Äänet päällä' : 'Äänet pois'; $('sound').setAttribute('aria-pressed', String(soundOn)); ui.saveSound(soundOn); if (enabled) cue('turn');
  } catch { $('setting-sound').checked = false; setError('Ääniä ei voitu käynnistää. Kokeile uudelleen äänipainikkeesta.'); }
}
$('sound').onclick = () => setSound(!soundOn);
$('leave').onclick = action(async () => { await request('/api/leave'); resetSession(); });
const inviteCode = new URL(location.href).searchParams.get('room');
const hasInvite = inviteCode && /^[A-F0-9]{6}$/i.test(inviteCode);
if (hasInvite) $('code').value = inviteCode.toUpperCase();
try { const stored = sessionStorage.getItem('casino-session'); if (stored) { session = JSON.parse(stored); render(await request('/api/session')); connect(); } } catch { resetSession(); }
if (hasInvite && !session) ui.ensureProfile('entry');
