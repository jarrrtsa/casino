import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, compare, startHand, act, viewHand, shuffledDeck } from '../poker.mjs';
const card = text => ({ rank: '23456789TJQKA'.indexOf(text[0]) + 2, suit: text[1] });
const cards = text => text.split(' ').map(card);
const players = stacks => stacks.map((stack, i) => ({ id: String(i), name: `P${i}`, stack }));
function fixedDeck(draws) { const selected = cards(draws); return [...shuffledDeck().filter(c => !selected.some(x => x.rank === c.rank && x.suit === c.suit)), ...selected.reverse()]; }
test('all hand categories, ace-low straight, best five and kickers', () => {
  const examples = ['As Kd 9c 7h 3s', 'As Ad 9c 7h 3s', 'As Ad 9c 9h 3s', 'As Ad Ac 7h 3s', 'As 2d 3c 4h 5s', 'As Js 9s 7s 3s', 'As Ad Ac 7h 7s', 'As Ad Ac Ah 3s', '9s Ts Js Qs Ks'];
  examples.forEach((hand, index) => assert.equal(evaluate(cards(hand))[0], index));
  assert.deepEqual(evaluate(cards('As 2d 3c 4h 5s')), [4, 5]);
  assert.deepEqual(evaluate(cards('As Ad Ac Ks Kd Kc 2s')), [6, 14, 13]);
  assert.ok(compare(evaluate(cards('As Ad Kc 8h 3s')), evaluate(cards('Ah Ac Qc 8d 3h'))) > 0);
  assert.equal(compare(evaluate(cards('As Kd Qc Jh Ts 2s 3s')), evaluate(cards('Ah Kc Qh Jd Tc 4s 5s'))), 0);
});
test('heads-up blinds, turn order, checks and fold settlement', () => {
  const p = players([1000, 1000]); const h = startHand(p, '0');
  assert.equal(h.seats[h.turn].id, '0'); assert.equal(h.seats[0].bet, 5); assert.equal(h.seats[1].bet, 10);
  assert.throws(() => act(h, '1', 'check'), /vuoro/);
  assert.throws(() => act(h, '0', 'check'), /maksaa/);
  act(h, '0', 'call'); assert.equal(h.stage, 'preflop'); act(h, '1', 'check');
  assert.equal(h.stage, 'flop'); assert.equal(h.seats[h.turn].id, '1');
  act(h, '1', 'fold'); assert.equal(h.stage, 'finished'); assert.equal(p[0].stack, 1010); assert.equal(p[1].stack, 990);
});
test('three-way all-ins allocate main and side pot and return uncalled chips', () => {
  const p = players([100, 200, 300]);
  const h = startHand(p, '0', 1, fixedDeck('Kc Qc Ac Kd Qd Ad 2s 2c 3d 7h 4s 9s 5s Jc'));
  act(h, '0', 'raise', 100); act(h, '1', 'raise', 200); act(h, '2', 'call');
  assert.equal(h.stage, 'finished'); assert.equal(h.board.length, 5);
  assert.deepEqual(p.map(x => x.stack), [300, 200, 100]);
  assert.equal(h.results.reduce((sum, x) => sum + x.amount, 0), 500);
});
test('short all-in does not reopen betting; cumulative short raises do', () => {
  const h = startHand(players([1000, 15, 1000]), '0');
  act(h, '0', 'call'); act(h, '1', 'raise', 15); act(h, '2', 'call');
  assert.equal(viewHand(h, '0').actions.canRaise, false);
  assert.throws(() => act(h, '0', 'raise', 30), /korottaa/); act(h, '0', 'call');
  assert.equal(h.stage, 'flop');
  const cumulative = startHand(players([1000, 15, 20, 1000]), '0');
  act(cumulative, '3', 'call'); act(cumulative, '0', 'call'); act(cumulative, '1', 'raise', 15); act(cumulative, '2', 'raise', 20);
  assert.equal(viewHand(cumulative, '3').actions.canRaise, true);
  act(cumulative, '3', 'raise', 30);
});
test('invalid raises do not mutate state and cards remain private', () => {
  const h = startHand(players([1000, 1000]), '0');
  for (const amount of [12, 20.5, -20, 2000, NaN]) assert.throws(() => act(h, '0', 'raise', amount));
  assert.equal(h.version, 0); assert.equal(h.seats[0].stack, 995);
  const view = viewHand(h, '0'); assert.equal(view.seats[0].cards.length, 2); assert.equal(view.seats[1].cards.length, 0);
  assert.equal(view.deck, undefined); assert.equal(view.seats[1].player, undefined);
});
test('board tie splits pot, and an odd chip goes left of dealer', () => {
  const p = players([1000, 1000, 1000]);
  const h = startHand(p, '0', 1, fixedDeck('2c 3c 4c 2d 3d 4d 5c Ts Js Qs 6c Ks 7c As'));
  act(h, '0', 'call'); act(h, '1', 'call'); act(h, '2', 'check');
  // A folded blind leaves $10 dead money, creating an odd $15/$15 split after betting $5.
  act(h, '1', 'fold'); act(h, '2', 'check'); act(h, '0', 'check');
  for (let i = 0; i < 2; i++) { act(h, '2', 'check'); act(h, '0', 'check'); }
  assert.equal(h.stage, 'finished'); assert.deepEqual(p.map(x => x.stack), [1005, 990, 1005]);
  const odd = players([1000, 1000, 1000]);
  const o = startHand(odd, '0', 1, fixedDeck('2c 3c 4c 2d 3d 4d 5c Ts Js Qs 6c Ks 7c As'));
  act(o, '0', 'call'); act(o, '1', 'fold'); act(o, '2', 'check');
  for (let i = 0; i < 3; i++) { act(o, '2', 'check'); act(o, '0', 'check'); }
  assert.deepEqual(odd.map(x => x.stack), [1002, 995, 1003]);
});
test('random games preserve total chips and terminate with unique dealt cards', () => {
  for (let trial = 0; trial < 100; trial++) {
    const p = players([30 + trial, 70, 120, 250]); const total = p.reduce((sum, x) => sum + x.stack, 0); const h = startHand(p, '0');
    let steps = 0;
    while (h.stage !== 'finished' && steps++ < 200) {
      const id = h.seats[h.turn].id; const legal = viewHand(h, id).actions;
      if (steps % 7 === 0 && legal.canRaise) act(h, id, 'raise', legal.maxRaiseTo);
      else if (steps % 11 === 0) act(h, id, 'fold');
      else act(h, id, legal.canCheck ? 'check' : 'call');
    }
    assert.equal(h.stage, 'finished'); assert.equal(p.reduce((sum, x) => sum + x.stack, 0), total);
    const dealt = [...h.board, ...h.seats.flatMap(x => x.cards)].map(c => `${c.rank}${c.suit}`); assert.equal(new Set(dealt).size, dealt.length);
  }
});
