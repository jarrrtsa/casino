import test from 'node:test';
import assert from 'node:assert/strict';
import { startHand, act, shuffledDeck, legalActions } from '../poker.mjs';
import { botAction, NPC_STYLES } from '../bots.mjs';
import { estimateEquity } from '../npc-equity.mjs';

const cards = text => text.split(' ').map(code => ({ rank: '23456789TJQKA'.indexOf(code[0]) + 2, suit: code[1] }));
function rng(seed = 1) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
}
function scenario(hole = 'As Kh', bet = 10, stack = 200, board = '') {
  const hand = startHand([{ id: 'a', name: 'A', stack: 200 }, { id: 'b', name: 'B', stack: 200 }], 'a');
  hand.turn = 0; hand.currentBet = bet; hand.minRaise = 10;
  hand.board = board ? cards(board) : [];
  hand.stage = hand.board.length ? 'river' : 'preflop';
  Object.assign(hand.seats[0], { cards: cards(hole), stack, bet: 0, total: 0, actedAt: null });
  Object.assign(hand.seats[1], { stack: Math.max(0, 200 - bet), bet, total: bet, actedAt: null });
  return hand;
}

// Repeatable deck shuffling for full-hand tests; does not use production RNG.
function deck(random) {
  const result = shuffledDeck().sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank);
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

test('legacy API defaults to balanced; invalid style falls back and inactive turns use no randomness', () => {
  const hand = scenario();
  assert.deepEqual(botAction(hand, 'a', rng(7)), botAction(hand, 'a', rng(7), 'balanced'));
  assert.deepEqual(botAction(hand, 'a', rng(7), 'unknown'), botAction(hand, 'a', rng(7)));
  assert.deepEqual(botAction(hand, 'a', rng(7), 'toString'), botAction(hand, 'a', rng(7)));
  assert.equal(botAction(null, 'a', () => { throw new Error('Unused RNG'); }), null);
  assert.equal(botAction(hand, 'b', () => { throw new Error('Unused RNG'); }), null);
  hand.stage = 'finished'; assert.equal(botAction(hand, 'a'), null);
});

test('controlled risk gives cautious fold, balanced call and aggressive raise', () => {
  const hand = scenario('As Kh', 150);
  assert.deepEqual(botAction(hand, 'a', () => 0.3, 'cautious'), { action: 'fold' });
  assert.deepEqual(botAction(hand, 'a', () => 0.3, 'balanced'), { action: 'call' });
  assert.deepEqual(botAction(hand, 'a', () => 0.3, 'aggressive'), { action: 'raise', amount: 200 });
});

test('styles differ in value betting and sizing without folding a free check', () => {
  const marginal = scenario('As Kh');
  assert.equal(botAction(marginal, 'a', () => 0.3, 'cautious').action, 'call');
  assert.equal(botAction(marginal, 'a', () => 0.3, 'balanced').action, 'call');
  assert.equal(botAction(marginal, 'a', () => 0.3, 'aggressive').action, 'raise');
  const strong = scenario('As Ah'); strong.seats.forEach(p => p.total += 60);
  const sizes = Object.keys(NPC_STYLES).map(style => botAction(strong, 'a', () => 0.3, style).amount);
  assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2]);
  const free = scenario('7s 2h', 0);
  for (const style of Object.keys(NPC_STYLES)) assert.deepEqual(botAction(free, 'a', () => 0.99, style), { action: 'check' });
});

test('preflop estimates value pairs, high cards, suited connectivity and opponent count', () => {
  const equity = (text, opponents = 1) => estimateEquity(cards(text), [], opponents, rng());
  assert.ok(equity('As Ah') > equity('2s 2h'));
  assert.ok(equity('As Kh') > equity('7s 2h'));
  assert.ok(equity('Js Ts') > equity('Js Th'));
  assert.ok(equity('9s 8h') > equity('9s 3h'));
  assert.ok(equity('As Kh', 3) < equity('As Kh', 1));
});

test('public-board equity handles shared nuts, kickers, draws and several opponents', () => {
  const royal = cards('Ts Js Qs Ks As');
  assert.equal(estimateEquity(cards('2c 3h'), royal, 1, rng()), 0.5);
  assert.ok(Math.abs(estimateEquity(cards('2c 3h'), royal, 2, rng()) - 1 / 3) < 1e-12);
  const river = cards('Ah Kd Qs 8c 2h');
  assert.ok(estimateEquity(cards('Ac Ks'), river, 1, rng(33)) > estimateEquity(cards('Ad 7c'), river, 1, rng(33)));
  const flop = cards('As 9s 2d');
  assert.ok(estimateEquity(cards('Ks Qs'), flop, 1, rng(91), 256) > estimateEquity(cards('Kc Qh'), flop, 1, rng(91), 256));
  for (const style of Object.keys(NPC_STYLES)) {
    const shared = scenario('2c 3h', 0, 200, 'Ts Js Qs Ks As');
    assert.deepEqual(botAction(shared, 'a', rng(4), style), { action: 'check' });
    shared.currentBet = 150; shared.seats[1].bet = 150; shared.seats[1].total = 150;
    assert.deepEqual(botAction(shared, 'a', rng(4), style), { action: 'call' });
  }
});

test('pot odds change a marginal call; inaccessible side-pot money cannot justify a call', () => {
  const small = scenario('8c 7h', 30, 200, 'As Kd Qs 5h 3c');
  const large = structuredClone(small); large.seats.forEach(p => p.total += 100);
  // Raise prevention isolates calling risk from bluffing.
  for (const hand of [small, large]) { hand.seats[0].actedAt = hand.currentBet; hand.seats[0].raiseSizeAtAction = 10; }
  assert.equal(botAction(small, 'a', rng(32)).action, 'fold');
  assert.equal(botAction(large, 'a', rng(32)).action, 'call');
  const side = scenario('7s 2h', 200, 20);
  side.seats.push({ id: 'folded', folded: true, stack: 0, bet: 0, total: 10000 });
  assert.equal(botAction(side, 'a', () => 0.99, 'cautious').action, 'fold');
});

test('hidden engine fields are never read, and decisions do not mutate the hand', () => {
  for (const style of Object.keys(NPC_STYLES)) {
    for (const board of ['', 'As 9s 2d', 'As 9s 2d 3c', 'As 9s 2d 3c 4h']) {
      const hand = scenario('Ks Qs', 10, 200, board), before = structuredClone(hand);
      const expected = botAction(hand, 'a', rng(11), style);
      assert.deepEqual(hand, before);
      const fail = () => { throw new Error('Hidden information was accessed'); };
      Object.defineProperty(hand, 'deck', { get: fail });
      Object.defineProperty(hand.seats[1], 'cards', { get: fail });
      Object.defineProperty(hand.seats[1], 'player', { get: fail });
      assert.deepEqual(botAction(hand, 'a', rng(11), style), expected);
    }
  }
});

test('short all-in raises stay legal and betting that has not reopened cannot raise', () => {
  const short = scenario('As Ah', 20, 25);
  assert.deepEqual(botAction(short, 'a', () => 0.1, 'aggressive'), { action: 'raise', amount: 25 });
  assert.doesNotThrow(() => act(short, 'a', 'raise', 25));
  const closed = scenario('As Ah', 20);
  closed.seats[0].actedAt = 15; closed.seats[0].raiseSizeAtAction = 10;
  assert.equal(legalActions(closed, 'a').canRaise, false);
  assert.equal(botAction(closed, 'a', () => 0, 'aggressive').action, 'call');
});

test('all styles complete reproducible 2–6 player hands with legal moves and conserved chips', () => {
  for (const style of Object.keys(NPC_STYLES)) {
    for (let trial = 0; trial < 20; trial++) {
      const random = rng(trial + 73), count = 2 + trial % 5;
      const players = Array.from({ length: count }, (_, i) => ({ id: String(i), name: String(i), stack: [7, 25, 80, 150, 300, 500][(i + trial) % 6] }));
      const total = players.reduce((sum, p) => sum + p.stack, 0);
      const hand = startHand(players, '0', 1, deck(random)); let moves = 0;
      while (hand.stage !== 'finished') {
        const id = hand.seats[hand.turn].id, legal = legalActions(hand, id), move = botAction(hand, id, random, style);
        assert.ok(move);
        if (move.action === 'raise') {
          assert.ok(Number.isSafeInteger(move.amount) && move.amount > hand.currentBet && move.amount <= legal.maxRaiseTo);
          assert.ok(move.amount >= legal.minRaiseTo || move.amount === legal.maxRaiseTo);
        }
        act(hand, id, move.action, move.amount); assert.ok(++moves < 200);
      }
      assert.equal(players.reduce((sum, p) => sum + p.stack, 0), total);
    }
  }
});

test('bluff frequencies distinguish styles and never bluff into an all-in opponent', () => {
  const weak = scenario('7s 2h', 10);
  assert.equal(botAction(weak, 'a', () => 0.1, 'aggressive').action, 'raise');
  assert.equal(botAction(weak, 'a', () => 0.1, 'balanced').action, 'fold');
  assert.equal(botAction(weak, 'a', () => 0.1, 'cautious').action, 'fold');
  assert.equal(botAction(weak, 'a', () => 0.04, 'balanced').action, 'raise');
  assert.equal(botAction(weak, 'a', () => 0.04, 'cautious').action, 'fold');
  weak.seats[1].stack = 0;
  assert.notEqual(botAction(weak, 'a', () => 0.001, 'aggressive').action, 'raise');
});
