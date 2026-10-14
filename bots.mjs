import { randomInt } from 'node:crypto';
import { evaluate, legalActions } from './poker.mjs';
import { estimateEquity, randomUnit } from './npc-equity.mjs';

export const NPC_STYLES = Object.freeze({
  cautious: Object.freeze({ risk: 0.065, commitmentRisk: 0.12, valueEdge: 0.24, raiseFrequency: 0.55, bluffFrequency: 0.015, potFraction: 0.45, raiseBudget: 0.3 }),
  balanced: Object.freeze({ risk: 0.025, commitmentRisk: 0.07, valueEdge: 0.16, raiseFrequency: 0.72, bluffFrequency: 0.065, potFraction: 0.65, raiseBudget: 0.55 }),
  aggressive: Object.freeze({ risk: -0.01, commitmentRisk: 0.025, valueEdge: 0.1, raiseFrequency: 0.9, bluffFrequency: 0.16, potFraction: 0.9, raiseBudget: 1 })
});
const cryptoRandom = () => randomInt(0x1000000) / 0x1000000;

/** Backward compatible: the optional fourth argument selects a playing style. */
export function botAction(hand, id, random = cryptoRandom, style = 'balanced') {
  if (!hand) return null;
  const legal = legalActions(hand, id);
  if (!legal) return null;
  const me = hand.seats[hand.turn];
  const opponents = hand.seats.filter(seat => seat.id !== id && !seat.folded);
  const policy = typeof style === 'string' && Object.hasOwn(NPC_STYLES, style) ? NPC_STYLES[style] : NPC_STYLES.balanced;
  // A royal flush on the public board cannot be beaten or improved by a hole card.
  if (hand.board.length === 5) {
    const boardScore = evaluate(hand.board);
    if (boardScore[0] === 8 && boardScore[1] === 14) return { action: legal.canCheck ? 'check' : 'call' };
  }
  // Deliberately pass own cards and public board, never other cards or hand.deck.
  const equity = estimateEquity(me.cards, hand.board, opponents.length, random);
  const roll = randomUnit(random);
  // Exclude side-pot money this stack cannot win; folded contributions remain.
  const contributionCap = me.total + legal.call;
  const pot = hand.seats.reduce((sum, seat) => sum + Math.min(seat.total, contributionCap), 0);
  const potOdds = legal.call / Math.max(1, pot + legal.call);
  const commitment = legal.call / Math.max(1, me.stack);
  const callThreshold = potOdds + policy.risk + commitment * policy.commitmentRisk;
  const fairShare = 1 / (opponents.length + 1);
  const valueRaise = equity > fairShare + policy.valueEdge && roll < policy.raiseFrequency;
  // Bluff rarely, against one opponent who still has chips, with some equity.
  const bluff = opponents.length === 1 && opponents[0].stack > 0 && equity > 0.2
    && equity < fairShare && legal.call <= me.stack * 0.15 && roll < policy.bluffFrequency;
  if (legal.canRaise && (valueRaise || bluff)) {
    const opponentCeiling = Math.max(...opponents.map(seat => seat.bet + seat.stack));
    const ceiling = Math.min(legal.maxRaiseTo, opponentCeiling);
    const minimum = Math.min(legal.minRaiseTo, legal.maxRaiseTo);
    const desired = hand.currentBet + Math.round(Math.max(10, pot + legal.call) * policy.potFraction);
    const amount = Math.min(ceiling, Math.max(minimum, desired));
    const cost = amount - me.bet;
    const affordable = cost <= me.stack * policy.raiseBudget || equity >= 0.85;
    if (affordable && amount > hand.currentBet && (amount >= legal.minRaiseTo || amount === legal.maxRaiseTo)) {
      return { action: 'raise', amount };
    }
  }
  if (legal.canCheck) return { action: 'check' };
  return { action: equity >= callThreshold ? 'call' : 'fold' };
}
