import { randomInt } from 'node:crypto';

export const HAND_NAMES = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
export function compare(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const diff = (a[i] || 0) - (b[i] || 0); if (diff) return diff; } return 0; }
function five(cards) {
  const values = cards.map(c => c.rank).sort((a, b) => b - a);
  const groups = [...new Set(values)].map(v => [values.filter(x => x === v).length, v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const unique = [...new Set(values)];
  const straight = unique.length === 5 && (unique[0] - unique[4] === 4 ? unique[0] : unique.join(',') === '14,5,4,3,2' ? 5 : 0);
  if (straight && flush) return [8, straight];
  if (groups[0][0] === 4) return [7, groups[0][1], groups[1][1]];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, groups[0][1], groups[1][1]];
  if (flush) return [5, ...values];
  if (straight) return [4, straight];
  if (groups[0][0] === 3) return [3, groups[0][1], ...groups.slice(1).map(g => g[1])];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...groups.slice(0, 2).map(g => g[1]).sort((a, b) => b - a), groups[2][1]];
  if (groups[0][0] === 2) return [1, groups[0][1], ...groups.slice(1).map(g => g[1])];
  return [0, ...values];
}
export function evaluate(cards) {
  return evaluateDetailed(cards).score;
}
export function evaluateDetailed(cards) {
  if (cards.length < 5 || cards.length > 7) throw new Error('A hand must contain 5–7 cards.');
  let best = []; let chosen = [];
  for (let a = 0; a < cards.length - 4; a++) for (let b = a + 1; b < cards.length - 3; b++) for (let c = b + 1; c < cards.length - 2; c++) for (let d = c + 1; d < cards.length - 1; d++) for (let e = d + 1; e < cards.length; e++) {
    const selection = [cards[a], cards[b], cards[c], cards[d], cards[e]];
    const value = five(selection); if (compare(value, best) > 0) { best = value; chosen = selection; }
  }
  return { score: best, cards: chosen };
}
export function shuffledDeck() {
  const deck = [];
  for (const suit of ['s', 'h', 'd', 'c']) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) { const j = randomInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}
const live = h => h.seats.filter(p => !p.folded);
const active = h => live(h).filter(p => p.stack > 0);
function next(h, from, predicate) { for (let i = 1; i <= h.seats.length; i++) { const index = (from + i) % h.seats.length; if (predicate(h.seats[index])) return index; } return null; }
function pay(p, amount) { const chips = Math.min(p.stack, amount); p.stack -= chips; p.bet += chips; p.total += chips; }
function log(h, message) { h.log.push(message); h.log = h.log.slice(-16); }
export function potLayers(h) {
  let previous = 0;
  return [...new Set(h.seats.map(p => p.total).filter(Boolean))].sort((a, b) => a - b).map(level => {
    const contributors = h.seats.filter(p => p.total >= level);
    const amount = (level - previous) * contributors.length; previous = level;
    return { amount, uncalled: contributors.length === 1, eligible: contributors.filter(p => !p.folded).map(p => p.id) };
  });
}
function returnUncalled(h) {
  const sorted = [...h.seats].sort((a, b) => b.total - a.total);
  const difference = sorted[0].total - (sorted[1]?.total || 0);
  if (difference > 0) { sorted[0].total -= difference; sorted[0].stack += difference; sorted[0].bet = Math.max(0, sorted[0].bet - difference); log(h, `${sorted[0].name}: refund $${difference}`); }
}
function finish(h) {
  returnUncalled(h);
  h.stage = 'finished'; h.turn = null; h.results = [];
  const survivors = live(h);
  const values = new Map(survivors.map(p => [p.id, survivors.length > 1 ? evaluate([...p.cards, ...h.board]) : null]));
  h.pots = potLayers(h);
  for (const [index, pot] of h.pots.entries()) {
    const { amount } = pot;
    const eligible = survivors.filter(p => pot.eligible.includes(p.id));
    let winners = [];
    for (const p of eligible) { const diff = winners.length ? compare(values.get(p.id), values.get(winners[0].id)) : 1; if (diff > 0) winners = [p]; else if (!diff) winners.push(p); }
    // Odd chips go clockwise from the dealer.
    winners.sort((a, b) => ((h.seats.indexOf(a) - h.dealer - 1 + h.seats.length) % h.seats.length) - ((h.seats.indexOf(b) - h.dealer - 1 + h.seats.length) % h.seats.length));
    winners.forEach((p, i) => { const won = Math.floor(amount / winners.length) + (i < amount % winners.length ? 1 : 0); p.stack += won; h.results.push({ id: p.id, name: p.name, amount: won, pot: index, hand: values.get(p.id) ? HAND_NAMES[values.get(p.id)[0]] : 'Everyone else folded' }); });
  }
  for (const p of h.seats) p.player.stack = p.stack;
  log(h, h.results.map(r => `${r.name} +$${r.amount} (${r.hand})`).join(' · '));
}
function street(h) {
  if (h.stage === 'river') return finish(h);
  h.deck.pop(); // Burn card.
  const count = h.stage === 'preflop' ? 3 : 1;
  for (let i = 0; i < count; i++) h.board.push(h.deck.pop());
  h.stage = h.stage === 'preflop' ? 'flop' : h.stage === 'flop' ? 'turn' : 'river';
  h.currentBet = 0; h.minRaise = 10;
  for (const p of h.seats) { p.bet = 0; p.actedAt = null; p.raiseSizeAtAction = 10; p.lastAction = ''; }
  log(h, h.stage.toUpperCase());
  advance(h, h.dealer);
}
function advance(h, from) {
  if (live(h).length === 1) return finish(h);
  const actors = active(h);
  // No betting into a pot when every opponent is all-in.
  if (actors.length <= 1 && (!actors.length || actors[0].bet >= h.currentBet)) return street(h);
  const pending = p => !p.folded && p.stack > 0 && (p.actedAt === null || p.bet < h.currentBet);
  h.turn = next(h, from, pending);
  if (h.turn === null) street(h);
}
export function startHand(players, dealerId, number = 1, deck = shuffledDeck()) {
  const funded = players.filter(p => p.stack > 0);
  if (funded.length < 2) throw new Error('At least two players with chips are required.');
  const h = { number, version: 0, seats: funded.map(p => ({ id: p.id, name: p.name, player: p, stack: p.stack, cards: [], bet: 0, total: 0, folded: false, actedAt: null, raiseSizeAtAction: 10 })), dealer: Math.max(0, funded.findIndex(p => p.id === dealerId)), deck: [...deck], board: [], stage: 'preflop', currentBet: 10, minRaise: 10, turn: null, log: [], results: [] };
  for (let round = 0; round < 2; round++) for (let i = 1; i <= h.seats.length; i++) h.seats[(h.dealer + i) % h.seats.length].cards.push(h.deck.pop());
  const sb = funded.length === 2 ? h.dealer : (h.dealer + 1) % funded.length;
  const bb = (sb + 1) % funded.length;
  h.smallBlindId = h.seats[sb].id; h.bigBlindId = h.seats[bb].id;
  pay(h.seats[sb], 5); pay(h.seats[bb], 10);
  h.seats[sb].lastAction = 'Small blind'; h.seats[bb].lastAction = 'Big blind';
  log(h, `Hand #${number} · blinds $5 / $10`);
  advance(h, bb);
  return h;
}
export function legalActions(h, id) {
  if (h.stage === 'finished' || h.seats[h.turn]?.id !== id) return null;
  const p = h.seats[h.turn];
  const canRaise = active(h).length > 1 && (p.actedAt === null || h.currentBet - p.actedAt >= p.raiseSizeAtAction);
  return { call: Math.min(p.stack, Math.max(0, h.currentBet - p.bet)), canCheck: p.bet >= h.currentBet, canRaise: canRaise && p.stack + p.bet > h.currentBet, minRaiseTo: h.currentBet + h.minRaise, maxRaiseTo: p.bet + p.stack };
}
export function act(h, id, action, amount) {
  const legal = legalActions(h, id);
  if (!legal) throw new Error('Wait for your turn.');
  const p = h.seats[h.turn]; const oldTurn = h.turn;
  if (action === 'fold') { p.folded = true; p.lastAction = 'Fold'; log(h, `${p.name}: fold`); }
  else if (action === 'check') { if (!legal.canCheck) throw new Error('You must call or fold.'); p.lastAction = 'Check'; log(h, `${p.name}: check`); }
  else if (action === 'call') { pay(p, legal.call); p.lastAction = p.stack === 0 ? 'All-in' : `Call $${legal.call}`; log(h, `${p.name}: call $${legal.call}${p.stack === 0 ? ' · all-in' : ''}`); }
  else if (action === 'raise') {
    if (!legal.canRaise) throw new Error('You cannot raise here.');
    if (!Number.isSafeInteger(amount) || amount > legal.maxRaiseTo || amount <= h.currentBet || (amount < legal.minRaiseTo && amount !== legal.maxRaiseTo)) throw new Error(`Raise to at least $${legal.minRaiseTo} or go all-in.`);
    const raise = amount - h.currentBet;
    pay(p, amount - p.bet); h.currentBet = amount;
    if (raise >= h.minRaise) h.minRaise = raise;
    p.lastAction = p.stack === 0 ? 'All-in' : `Raise $${amount}`;
    log(h, `${p.name}: raise to $${amount}${p.stack === 0 ? ' · all-in' : ''}`);
  } else throw new Error('Unknown action.');
  p.actedAt = h.currentBet; p.raiseSizeAtAction = h.minRaise;
  h.version++; advance(h, oldTurn);
}
export function viewHand(h, id) {
  if (!h) return null;
  return { number: h.number, version: h.version, stage: h.stage, board: h.board, pot: h.stage === 'finished' ? 0 : h.seats.reduce((sum, p) => sum + p.total, 0), pots: h.pots || potLayers(h), dealerId: h.seats[h.dealer].id, smallBlindId: h.smallBlindId, bigBlindId: h.bigBlindId, turnId: h.seats[h.turn]?.id || null, currentBet: h.currentBet, log: h.log, results: h.results, actions: legalActions(h, id), seats: h.seats.map(p => {
    const visible = p.id === id || (h.stage === 'finished' && live(h).length > 1 && !p.folded);
    const best = visible && h.board.length >= 3 ? evaluateDetailed([...p.cards, ...h.board]) : null;
    return { id: p.id, name: p.name, stack: p.stack, bet: p.bet, folded: p.folded, lastAction: p.lastAction || '', allIn: p.stack === 0 && !p.folded && h.stage !== 'finished', cards: visible ? p.cards : [], bestCards: best?.cards || [], handName: best ? HAND_NAMES[best.score[0]] : null };
  }) };
}
