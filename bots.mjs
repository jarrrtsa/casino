import { randomInt } from 'node:crypto';
import { evaluate, legalActions } from './poker.mjs';

// Decisions use only this NPC's hole cards and the public board.
export function botAction(hand, id, random = () => randomInt(10000) / 10000) {
  const legal=legalActions(hand,id);if(!legal)return null;
  const seat=hand.seats.find(s=>s.id===id);const [a,b]=seat.cards;
  const strength=hand.board.length>=3 ? Math.min(.95,.18+evaluate([...seat.cards,...hand.board])[0]*.15) : a.rank===b.rank ? .65+a.rank/60 : .15+(a.rank+b.rank)/60+(a.suit===b.suit?.08:0);
  const roll=random();
  if(legal.canRaise&&strength>.62&&roll<.28){const target=Math.min(legal.maxRaiseTo,Math.max(legal.minRaiseTo,hand.currentBet+Math.max(10,Math.round(hand.seats.reduce((s,p)=>s+p.total,0)/2))));return {action:'raise',amount:target};}
  if(legal.canCheck)return {action:'check'};
  const pressure=legal.call/Math.max(1,seat.stack);
  return {action: pressure>.4&&strength<.55 || roll>strength+.35 ? 'fold':'call'};
}
