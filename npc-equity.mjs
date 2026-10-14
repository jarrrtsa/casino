import { compare, evaluate } from './poker.mjs';

const SUITS = ['s', 'h', 'd', 'c'];
const cardKey = card => `${card.rank}${card.suit}`;

export function randomUnit(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('NPC random source must return a number in [0, 1).');
  }
  return value;
}

// Preflop approximation, rather than a claim of exact poker equity.
// Pair rank, high cards, suitedness and connectivity matter separately.
function preflopEquity(cards, opponents) {
  const [high, low] = cards.map(card => card.rank).sort((a, b) => b - a);
  let headsUp;
  if (high === low) headsUp = 0.49 + (high - 2) * 0.03;
  else {
    headsUp = 0.27 + (high + low) * 0.012;
    if (cards[0].suit === cards[1].suit) headsUp += 0.025;
    const gap = high - low;
    if (gap === 1) headsUp += 0.025;
    else if (gap === 2) headsUp += 0.012;
    else if (gap >= 5) headsUp -= 0.025;
    if (high === 14) headsUp += 0.025;
  }
  return Math.max(0.02, Math.min(0.9, headsUp) ** opponents);
}

/** Only caller-supplied visible cards enter this calculation. No engine deck. */
export function estimateEquity(cards, board, opponents, random, samples = 64) {
  if (opponents === 0) return 1;
  if (board.length === 0) return preflopEquity(cards, opponents);
  if (board.length < 3 || board.length > 5) throw new Error('Invalid public board.');
  const known = new Set([...cards, ...board].map(cardKey));
  const unseen = SUITS.flatMap(suit => Array.from({ length: 13 }, (_, index) => ({ rank: index + 2, suit })))
    .filter(card => !known.has(cardKey(card)));
  let equity = 0;
  for (let sample = 0; sample < samples; sample++) {
    const pool = [...unseen];
    const draw = () => {
      const index = Math.floor(randomUnit(random) * pool.length);
      const card = pool[index];
      pool[index] = pool[pool.length - 1];
      pool.pop();
      return card;
    };
    const runout = [...board];
    while (runout.length < 5) runout.push(draw());
    const score = evaluate([...cards, ...runout]);
    let ties = 1, beaten = false;
    for (let opponent = 0; opponent < opponents; opponent++) {
      const result = compare(evaluate([draw(), draw(), ...runout]), score);
      if (result > 0) beaten = true;
      if (result === 0) ties++;
    }
    if (!beaten) equity += 1 / ties;
  }
  return equity / samples;
}
