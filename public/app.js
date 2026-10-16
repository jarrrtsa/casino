import {drawCharacter} from './character-renderer.mjs';
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
let animateSnapshot=false;
const motionAllowed=()=>!document.hidden&&!document.body.classList.contains('reduce-motion')&&!document.body.classList.contains('no-effects')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
let audioContext;
let noiseBuffer;
const ui = createShell({ getRoom: () => currentRoom, onLeave: () => $('leave').click(), onSound: enabled => setSound(enabled), onError: text => setError(text), onSingleplayer: buyIn => join('/api/singleplayer',buyIn), onHomePoker:buyIn=>join('/api/home/poker',buyIn), onIdentityChange: () => resetSession() });
const money = value => `$${value.toLocaleString('en-US')}`;
const stageNames = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', finished: 'Hand finished' };
const cardKey = c => `${c.rank}${c.suit}`;
function node(tag, className = '', text = '') { const element = document.createElement(tag); element.className = className; element.textContent = text; return element; }
function setError(text = '') { document.querySelectorAll('.dialog-error').forEach(e=>e.remove());const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(text&&dialog){const notice=node('p','dialog-error',text);notice.setAttribute('role','alert');dialog.append(notice);$('error').classList.add('hidden');}else{$('error').textContent = text; $('error').classList.toggle('hidden', !text);} }
function cue(kind) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  if(['shuffle','card','chip','fold'].includes(kind)){
    noiseBuffer ||= (()=>{const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*.25),audioContext.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;return buffer;})();
    const bursts=kind==='shuffle'?5:kind==='chip'?2:1;
    for(let i=0;i<bursts;i++){
      const time=audioContext.currentTime+i*(kind==='shuffle'?.055:.035),duration=kind==='fold'?.12:kind==='card'?.065:kind==='chip'?.025:.045;
      const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
      source.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=kind==='chip'?3200:kind==='fold'?500:kind==='card'?950:1100+i*170;filter.Q.value=kind==='chip'?5:.7;
      gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(kind==='fold'?.035:kind==='card'?.045:kind==='shuffle'?.045:.065,time+.009);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start(time);source.stop(time+duration+.01);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }
    return;
  }
  const actionNotes={check:[330],call:[350,440],raise:[330,440,554]};
  const notes=actionNotes[kind]||(kind==='win'?[440,554,659]:kind==='turn'?[440,587]:[220]);
  const actionSound=Object.hasOwn(actionNotes,kind);
  notes.forEach((frequency, i) => {
    const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); const time = audioContext.currentTime + i * (actionSound?.065:.1);
    osc.type = kind === 'chip' ? 'triangle' : 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(actionSound?.026:.045, time + .015); gain.gain.exponentialRampToValueAtTime(.001, time + .16);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(time); osc.stop(time + .18);osc.onended=()=>{osc.disconnect();gain.disconnect();};
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
      } else { fresh.textContent = back ? '♠' : ''; fresh.setAttribute('aria-label', back ? 'Face-down card' : 'Undealt card'); }
      if (element) element.replaceWith(fresh); else container.append(fresh); element = fresh;
      if(animateSnapshot&&motionAllowed()&&(card||back))fresh.animate([{translate:'0 -12px'},{translate:'0 0'}],{duration:180,delay:i*25,easing:'ease-out'});
    }
    element.className = `card${card && ['h', 'd'].includes(card.suit) ? ' red' : ''}${!card ? back ? ' back' : ' placeholder' : ''}${card && winners.has(cardKey(card)) ? ' winning' : ''}`;
  }
  while (container.children.length > total) container.lastElementChild.remove();
}
const payoutAnimations=new Set();
function clearPayouts(){for(const animation of payoutAnimations)animation.cancel();payoutAnimations.clear();document.querySelectorAll('.payout-chip').forEach(chip=>chip.remove());}
function collectPot(room){
  clearPayouts();
  if(!motionAllowed())return;
  const pile=document.querySelector('.chip-stack'),origin=pile.getBoundingClientRect();
  const totals=new Map();for(const result of room.hand.results)totals.set(result.id,(totals.get(result.id)||0)+result.amount);
  const animations=[];
  for(const [id,amount] of totals){
    if(amount<=0)continue;
    const seat=[...$('seats').children].find(seat=>seat.dataset.id===id);
    const target=id===session.playerId?$('hero-stack'):seat?.querySelector('.seat-stack');if(!target)continue;
    const end=target.getBoundingClientRect();
    for(let i=0;i<5;i++){
      const chip=node('span','payout-chip');chip.setAttribute('aria-hidden','true');
      chip.style.left=`${origin.left+origin.width/2-10}px`;chip.style.top=`${origin.top+origin.height/2-5}px`;document.body.append(chip);
      const dx=end.left+end.width/2-origin.left-origin.width/2,dy=end.top+end.height/2-origin.top-origin.height/2;
      const animation=chip.animate([{translate:'0 0',opacity:1},{translate:`${dx*.5}px ${dy*.5-35}px`,opacity:1,offset:.5},{translate:`${dx}px ${dy}px`,opacity:0}],{duration:650,delay:i*65,easing:'ease-in-out'});
      payoutAnimations.add(animation);animations.push(animation.finished);
      animation.finished.catch(()=>{}).finally(()=>{payoutAnimations.delete(animation);chip.remove();});
    }
    const glow=target.animate([{color:'#fff0b9',textShadow:'0 0 12px #ffd77b'},{color:'#e3c996',textShadow:'none'}],{duration:1100});
    payoutAnimations.add(glow);glow.finished.catch(()=>{}).finally(()=>payoutAnimations.delete(glow));
  }
  Promise.allSettled(animations).then(()=>{if(currentRoom?.code===room.code&&currentRoom?.hand?.number===room.hand.number&&currentRoom?.hand?.stage==='finished')pile.style.opacity='0';});
}
function renderPotChips(amount){
  const pile=document.querySelector('.chip-stack');
  if(currentRoom?.hand?.stage!=='finished')pile.style.opacity='';
  const count=amount>0?Math.min(28,2+Math.floor(Math.log2(1+amount/10)*3)):0;
  if(pile.dataset.count===String(count))return;
  pile.dataset.count=String(count);pile.style.opacity='';
  pile.replaceChildren(...Array.from({length:count},(_,index)=>{const chip=node('i');chip.style.left=`${Math.floor(index/7)*16}px`;chip.style.bottom=`${index%7*4}px`;return chip;}));
  pile.style.width=`${Math.max(1,Math.ceil(count/7))*16+9}px`;
  pile.style.height=`${Math.min(count,7)*4+8}px`;
  if(animateSnapshot&&motionAllowed())pile.animate([{translate:'0 -5px',opacity:.7},{translate:'0 0',opacity:1}],{duration:230});
}
function avatar(index) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('seat-avatar'); svg.setAttribute('aria-hidden', 'true');svg.setAttribute('viewBox','0 0 100 200');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `/assets/characters.svg#${['cap', 'hoodie', 'coat', 'beanie'][index % 4]}`); svg.append(use); return svg;
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
      } else fresh.append(node('div', 'seat-info', 'Empty seat'));
      if (seat) seat.replaceWith(fresh); else $('seats').append(fresh); seat = fresh;
    }
    if (!player) { seat.className = 'seat empty'; continue; }
    const online = room.players.find(p => p.id === player.id);
    drawCharacter(seat.querySelector('svg'),online?.appearance||{},'seated');
    const winner = h?.results.some(r => r.id === player.id);
    seat.className = `seat${player.id === session.playerId ? ' self' : ''}${player.folded ? ' folded' : ''}${h?.turnId === player.id ? ' turn' : ''}${winner ? ' winner' : ''}`;
    seat.querySelector('.seat-name').textContent = `${player.name}${player.id === session.playerId ? ' · you' : ''}`;
    seat.querySelector('.seat-name').title = player.name;
    seat.querySelector('.seat-stack').textContent = money(player.stack);
    seat.querySelector('.seat-state').textContent = !online?.connected ? 'Disconnected' : player.folded ? 'Fold' : winner ? `+${money(h.results.filter(r => r.id === player.id).reduce((sum, r) => sum + r.amount, 0))}` : player.allIn ? 'ALL-IN' : h?.stage === 'finished' ? player.handName || 'Hand finished' : player.lastAction || (h ? 'In hand' : online?.ready ? 'Ready' : 'Waiting');
    const badges = seat.querySelector('.seat-badges');
    const role = h ? `${h.dealerId === player.id ? 'D' : ''}|${h.smallBlindId === player.id ? 'SB' : h.bigBlindId === player.id ? 'BB' : ''}` : '';
    if (badges.dataset.role !== role) { badges.dataset.role = role; badges.replaceChildren(...role.split('|').filter(Boolean).map(label => node('span', label === 'D' ? '' : 'blind', label))); }
    cards(seat.querySelector('.cards'), player.cards || [], h ? 2 : 0, { back: true, hand: h?.number, winning: winner ? player.bestCards : [] });
    const bet = seat.querySelector('.seat-bet'); const betKey = `${h?.number}:${player.bet || 0}`;
    if (bet.dataset.key !== betKey) { bet.dataset.key = betKey; bet.textContent = `Bet ${money(player.bet || 0)}`; bet.classList.remove('changed'); void bet.offsetWidth; bet.classList.add('changed'); }
    bet.classList.toggle('hidden', !player.bet || h?.stage === 'finished');
  }
}
async function request(path, data = {}) {
  const stamp = ui.character.stamp(), sessionToken = session?.token;
  const result = await ui.character.gameRequest(path, data, sessionToken);
  ui.character.assertCurrent(stamp);
  if (sessionToken !== session?.token) throw Object.assign(new Error('Outdated table response.'), { stale: true });
  return result;
}
function render(room) {
  if (!session || !room || !ui.character.isResponseCurrent(room)) return;
  if (room.character && ui.character.profile && room.character.id !== ui.character.profile.id) { resetSession('This table belongs to another character.'); return; }
  if (currentRoom?.code === room.code && currentRoom?.hand && room.hand && (currentRoom.hand.number > room.hand.number || (currentRoom.hand.number === room.hand.number && currentRoom.hand.version > room.hand.version))) return;
  const previous = currentRoom; if (room.serverTime) clockOffset = room.serverTime - Date.now();
  animateSnapshot=Boolean(currentRoom&&currentRoom.code===room.code);
  currentRoom = room;
  $('room-code').textContent = room.code;
  $('players').replaceChildren(...room.players.map(player => {
    const row = document.createElement('li');
    const name = document.createElement('span'); name.textContent = `${player.name}${player.id === session.playerId ? ' (you)' : ''}${player.host ? ' · host' : ''} · ${money(player.stack)}`;
    const status = document.createElement('small'); status.textContent = !player.connected ? 'Offline' : player.ready ? '✓ Ready' : 'Waiting';
    row.append(name, status); return row;
  }));
  $('ready').textContent = room.players.find(p => p.id === session.playerId)?.ready ? 'Unready' : 'Ready';
  const me = room.players.find(p => p.id === session.playerId);
  $('player-count').textContent = `${room.players.length} / 6`;
  const playing = room.hand && room.hand.stage !== 'finished';
  $('start').classList.toggle('hidden', !me?.host);
  $('start').textContent = room.hand ? 'Next hand' : 'Start Hold’em';
  const funded = room.players.filter(p => p.stack > 0 && p.connected);
  $('start').disabled = !connected || busy || playing || funded.length < 2 || funded.some(p => !p.ready);
  $('ready').disabled = !connected || busy || playing || me?.stack === 0;
  $('leave').disabled = !connected || busy || (playing && room.hand.seats.some(p => p.id === session.playerId));
  ui.syncRoom(room, previous);
  const ownSeat = room.hand?.seats.find(p => p.id === session.playerId);
  $('hero-name').textContent = `${me?.name || ownSeat?.name || 'You'} · stack`;
  $('hero-stack').textContent = money(ownSeat?.stack ?? me?.stack ?? 0);
  const unready = funded.filter(p => !p.ready).length;
  $('lobby-help').textContent = playing ? 'Hand in progress. Leave when your hand is over.' : me?.stack === 0 ? 'No chips remaining. Return home to buy into a new table.' : funded.length < 2 ? room.singleplayer ? 'Table finished. Return home to start a new NPC table.' : 'Invite a friend. At least two players are required.' : unready ? `${unready} players are not ready.` : me?.host ? 'All players ready. Start the hand.' : 'All players ready. Waiting for the host.';
  renderSeats(room);
  if (!room.hand) {
    $('hand-title').textContent = room.singleplayer ? 'Your table is ready' : 'Waiting for players'; $('pot').textContent = '$0';renderPotChips(0); $('pot-label').textContent = 'POT'; $('pots').textContent = ''; $('turn-status').textContent = room.singleplayer ? 'Ready to play' : 'Waiting for players'; $('turn-clock').textContent = '—';
    cards($('board'), [], 5); cards($('hole'), [], 2, {back:true}); $('hand-name').textContent = 'Waiting for cards'; $('street').replaceChildren(); $('controls').classList.add('hidden'); $('results').classList.add('hidden');
    $('waiting').classList.remove('hidden'); $('waiting').replaceChildren(node('strong', '', room.singleplayer ? 'Mara and Jules are ready' : 'Waiting for players'), node('span', '', room.singleplayer ? 'Start a hand when you are ready.' : 'Join the lobby and select Ready.')); return;
  }
  const h = room.hand;
  $('hand-title').textContent = `Hand #${h.number} · ${stageNames[h.stage]}`;
  const winnings = h.results.reduce((sum, r) => sum + r.amount, 0);
  $('pot').textContent = money(h.stage === 'finished' ? winnings : h.pot);renderPotChips(h.stage==='finished'?winnings:h.pot); $('pot-label').textContent = h.stage === 'finished' ? 'PAID OUT' : 'POT';
  if (previous?.hand && previous.hand.pot !== h.pot) { const pot = document.querySelector('.pot-display'); pot.classList.remove('changed'); void pot.offsetWidth; pot.classList.add('changed'); }
  const winnerCards = h.seats.filter(p => h.results.some(r => r.id === p.id)).flatMap(p => p.bestCards || []);
  cards($('board'), h.board, 5, {hand:h.number, winning: winnerCards});
  $('pots').textContent = h.pots?.length > 1 && (h.stage === 'finished' || h.seats.some(p => p.allIn)) ? h.pots.map((pot, i) => `${pot.uncalled ? 'Unmatched bet' : i === 0 ? 'Main pot' : 'Side pot ' + i}: ${money(pot.amount)}`).join(' · ') : '';
  const phaseKey = `${h.number}:${h.stage}`;
  if ($('street').dataset.key !== phaseKey) { $('street').dataset.key = phaseKey; $('street').replaceChildren(...['preflop', 'flop', 'turn', 'river'].map((phase, i, phases) => node('span', phase === h.stage ? 'active' : phases.indexOf(h.stage) > i || h.stage === 'finished' ? 'passed' : '', phase))); }
  const seat = h.seats.find(p => p.id === session.playerId);
  cards($('hole'), seat?.cards || [], 2, {back:!seat, hand:h.number, winning:h.results.some(r => r.id === session.playerId) ? seat?.bestCards : []});
  document.querySelector('.your-hand').classList.toggle('folded', Boolean(seat?.folded));
  $('hand-name').textContent = seat?.folded ? 'Folded' : seat?.handName || (seat ? '' : 'Playing next hand');
  $('controls').classList.toggle('hidden', !h.actions);
  const legal = h.actions;
  $('waiting').classList.toggle('hidden', Boolean(legal));
  if (!legal) {
    const actor = h.seats.find(p => p.id === h.turnId)?.name;
    $('waiting').replaceChildren(node('strong', '', h.stage === 'finished' ? 'Hand finished' : seat?.folded ? 'Folded' : seat?.allIn ? 'All-in' : !seat ? 'Spectating' : `${actor} is playing.`), node('span', '', h.stage === 'finished' ? funded.length < 2 ? 'Two players with chips are needed for the next hand.' : me?.host ? 'Start the next hand when everyone is ready.' : 'Waiting for the host.' : ''));
  }
  if (legal) {
    $('call').textContent = legal.canCheck ? 'Check' : `Call ${money(legal.call)}`;
    $('fold').disabled = busy || !connected; $('call').disabled = busy || !connected;
    $('raise-button').disabled = busy || !connected || !legal.canRaise;
    for (const id of ['raise', 'raise-slider']) { $(id).min = Math.min(legal.minRaiseTo, legal.maxRaiseTo); $(id).max = legal.maxRaiseTo; $(id).disabled = !legal.canRaise || busy || !connected; }
    $('raise').disabled = !legal.canRaise || busy || !connected;
    const key = `${h.number}:${h.version}`;
    if (raiseKey !== key) { raiseKey = key; $('raise').value = Math.min(legal.minRaiseTo, legal.maxRaiseTo); $('raise-slider').value = $('raise').value; }
    document.querySelectorAll('[data-preset]').forEach(button => button.disabled = !legal.canRaise || busy || !connected);
    $('raise-form').classList.toggle('hidden', !legal.canRaise);
    $('action-help').textContent = legal.canCheck ? 'Your turn · check or bet' : `Your turn · call ${money(legal.call)}${legal.call === seat?.stack ? ' (all-in)' : ''}.`;
    updateRaiseCost();
  }
  $('results').classList.toggle('hidden', h.stage !== 'finished');
  const resultKey = JSON.stringify([h.number, h.results]);
  if ($('results').dataset.key !== resultKey) {
    $('results').dataset.key = resultKey;
    const winners = [...new Set(h.results.map(r => r.id))].map(id => { const list = h.results.filter(r => r.id === id); return `${list[0].name} +${money(list.reduce((sum, r) => sum + r.amount, 0))}`; });
    $('results').replaceChildren(node('strong', '', winners.join(' · ')), ...h.results.map(r => node('div', '', `${h.pots.length > 1 ? r.pot === 0 ? 'Main pot · ' : 'Side pot ' + r.pot + ' · ' : ''}${r.name}: ${r.hand} — ${money(r.amount)}`)));
  }
  $('history').replaceChildren(...h.log.map(message => { const li = document.createElement('li'); li.textContent = message; return li; }));
  $('history-count').textContent = `${h.log.length} events`;
  if(previous&&(!previous.hand||h.number!==previous.hand.number)){clearPayouts();cue('shuffle');}
  else if(previous?.hand&&h.board.length>previous.hand.board.length)cue('card');
  if (previous?.hand && h.number === previous.hand.number && h.version !== previous.hand.version) {
    // Versions advance for accepted actions. Read the latest action even if a street
    // transition cleared lastAction; repeated snapshots and reconnects remain silent.
    const actionLine=[...h.log].reverse().find(line=>/: (fold|check|call|raise)(?: (?:to )?\$\d+(?: · all-in)?)?$/.test(line));
    const actionKind=actionLine?.match(/: (fold|check|call|raise)(?: (?:to )?\$\d+(?: · all-in)?)?$/)?.[1];
    if(actionKind)cue(actionKind);

    if (h.stage === 'finished'&&previous.hand.stage!=='finished'){cue('win');collectPot(room);}
    else {if(h.pot>previous.hand.pot)cue('chip');if(h.turnId===session.playerId&&previous.hand.turnId!==session.playerId)cue('turn');}
  }
  updateClock();
}
function updateClock() {
  if (!currentRoom?.hand) return;
  const h = currentRoom.hand;
  const name = h.seats.find(p => p.id === h.turnId)?.name;
  const seconds = Math.max(0, Math.ceil((currentRoom.deadline - Date.now() - clockOffset) / 1000));
  $('turn-status').textContent = h.stage === 'finished' ? 'Hand finished' : `${h.turnId === session?.playerId ? 'Your turn' : 'Turn: ' + name}`;
  $('turn-clock').textContent = h.stage === 'finished' ? '✓' : currentRoom.players.find(p=>p.id===h.turnId)?.bot ? '…' : `${seconds}`;
  document.querySelector('.turn-indicator').classList.toggle('yours', h.turnId === session?.playerId);
  document.querySelector('.turn-indicator').classList.toggle('urgent', h.stage !== 'finished' && seconds <= 10);
}
function updateRaiseCost() {
  const me = currentRoom?.hand?.seats.find(p => p.id === session?.playerId);
  if (me) $('raise-cost').textContent = `From stack: ${money(Math.max(0, Number($('raise').value) - me.bet))}`;
}
setInterval(updateClock, 1000);
function resetSession(message = '') {
  clearPayouts();
  events?.abort(); events = null;
  try { sessionStorage.removeItem('casino-session'); } catch { /* In-memory state is still cleared. */ }
  session = null; currentRoom = null; connected = false; busy = false;
  $('hole').replaceChildren(); $('seats').replaceChildren(); $('results').replaceChildren(); $('results').dataset.key = '';
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
  const token = session.token, stamp = ui.character.stamp(); let retries = 0;
  const alive = () => !controller.signal.aborted && session?.token === token && ui.character.isCurrent(stamp);
  while (alive()) {
    try {
      const response = await fetch('/api/events', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!alive()) return;
      if (response.status === 401) { resetSession('Lobby closed or access changed.'); await ui.character.refresh(); return; }
      if (!response.ok) throw new Error('Connection failed.');
      connected = true; retries = 0; $('connection').textContent = '● Connected'; $('connection').classList.remove('offline');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      try {
        while (alive()) {
          const { value, done } = await reader.read(); if (done || !alive()) break;
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const message = buffer.slice(0, end); buffer = buffer.slice(end + 2);
            if (alive() && message.startsWith('data: ')) render(JSON.parse(message.slice(6)));
          }
        }
      } finally { await reader.cancel().catch(() => {}); }
    } catch { if (!alive()) return; }
    if (!alive()) return;
    connected = false; $('connection').textContent = 'Disconnected — reconnecting…'; $('connection').classList.add('offline'); if (currentRoom) render(currentRoom);
    await retryDelay(Math.min(1000 * 2 ** retries++, 10000), controller.signal);
  }
}
async function join(path, buyIn=Number($('mp-buyin').value)) {
  setError();
  session = await request(path, { name: $('name').value, code: $('code').value, buyIn });
  try { sessionStorage.setItem('casino-session', JSON.stringify(session)); } catch { /* The current connection remains usable. */ } render(session.room); connect();
}
function action(fn) { return async event => {
  event?.preventDefault(); if (busy) return; const stamp = ui.character.stamp(); busy = true; setError();
  if (session && currentRoom) render(currentRoom);
  try { await fn(); }
  catch (error) { if (error.stale) return; if (error.status === 401) { resetSession('Session ended or access changed.'); await ui.character.refresh(); } else setError(error.message || 'Connection failed. Please retry.'); }
  finally { if (ui.character.isCurrent(stamp)) { busy = false; if (session && currentRoom) render(currentRoom); } }
}; }
$('create-form').onsubmit = action(() => join('/api/create'));
$('join-form').onsubmit = action(() => join('/api/join'));
$('ready').onclick = action(async () => render(await request('/api/ready')));
$('copy').onclick = action(async () => { await navigator.clipboard.writeText($('room-code').textContent); $('copy').textContent = 'Copied'; });
$('invite').onclick = action(async () => { const url = new URL('/', location.origin); url.searchParams.set(currentRoom.homeCode?'home':'room', currentRoom.homeCode||currentRoom.code); await navigator.clipboard.writeText(url.href); $('invite').textContent = 'Invite link copied'; });
$('start').onclick = action(async () => render(await request('/api/start')));
async function pokerAction(kind, amount) {
  const h = currentRoom.hand;
  render(await request('/api/action', { hand: h.number, version: h.version, action: kind, amount }));
}
$('fold').onclick = action(() => pokerAction('fold'));
$('call').onclick = action(() => pokerAction(currentRoom.hand.actions.canCheck ? 'check' : 'call'));
$('raise-form').onsubmit = action(() => pokerAction('raise', Number($('raise').value)));
$('raise').oninput = () => { $('raise-slider').value = $('raise').value; updateRaiseCost(); };
$('raise-slider').oninput = () => { $('raise').value = $('raise-slider').value; updateRaiseCost(); };
document.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => {
  const h = currentRoom.hand; const legal = h.actions; if (!legal?.canRaise) return;
  const me = h.seats.find(p => p.id === session.playerId);
  const value = ({ min: legal.minRaiseTo, half: h.currentBet + Math.round((h.pot + legal.call) / 2), pot: h.currentBet + h.pot + legal.call, bb2: 20, bb3: 30, max: legal.maxRaiseTo })[button.dataset.preset];
  $('raise').value = Math.min(legal.maxRaiseTo, Math.max(Math.min(legal.minRaiseTo, legal.maxRaiseTo), value)); $('raise-slider').value = $('raise').value; updateRaiseCost();
});
async function setSound(enabled) {
  try {
    if (enabled) { audioContext ||= new AudioContext(); await audioContext.resume(); }
    soundOn = enabled; $('sound').setAttribute('aria-label',soundOn?'Mute sound':'Unmute sound'); $('sound').title=soundOn?'Mute sound':'Unmute sound'; $('sound').setAttribute('aria-pressed', String(soundOn)); ui.saveSound(soundOn); if (enabled) cue('turn');
  } catch { $('setting-sound').checked = false; setError('Audio could not start. Try the sound button again.'); }
}
$('sound').onclick = () => setSound(!soundOn);
$('leave').onclick = action(async () => { await request('/api/leave'); await ui.character.refresh(); resetSession(); });
const inviteCode = new URL(location.href).searchParams.get('room');
const hasInvite = inviteCode && /^[A-F0-9]{6}$/i.test(inviteCode);
if (hasInvite) $('code').value = inviteCode.toUpperCase();
await ui.character.ready;
try {
  if (ui.character.token) {
    let stored; try { stored = JSON.parse(sessionStorage.getItem('casino-session')); } catch { /* A valid server session can still be restored. */ }
    const restored = ui.character.profile?.session || stored;
    if (restored) { session = restored; render(await request('/api/session')); if (session) connect(); }
  }
} catch (error) { if (!error.stale) resetSession(); }
const homeInvite=new URL(location.href).searchParams.get('home');
if(homeInvite&&/^[A-F0-9]{6}$/i.test(homeInvite)&&!session)ui.openHome(homeInvite.toUpperCase());
else if (hasInvite && !session) ui.ensureProfile('entry');