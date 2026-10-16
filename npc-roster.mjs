import { randomUUID } from 'node:crypto';

// Stable character identities; each table gets separate runtime player IDs.
export const NPC_ROSTER = Object.freeze([
  Object.freeze({ id: 'mara', name: 'Mara', style: 'cautious', appearance: Object.freeze({ body:3,top:5,bottom:2,head:3,accessory:1,outfit: 'coat', color: 'amber' }) }),
  Object.freeze({ id: 'jules', name: 'Jules', style: 'aggressive', appearance: Object.freeze({ body:4,top:4,bottom:4,head:5,accessory:2,outfit: 'beanie', color: 'plum' }) })
]);

export function npcProfile(id) {
  return NPC_ROSTER.find(profile => profile.id === id) || null;
}

export function createNpcSeats(chips) {
  return NPC_ROSTER.map(profile => ({
    id: randomUUID(), name: profile.name, npcProfileId: profile.id,
    bot: true, ready: true, stack: chips, appearance: { ...profile.appearance }
  }));
}

export function npcPublicProfile(player) {
  if (!player.bot) return null;
  const profile = npcProfile(player.npcProfileId);
  return { id: profile?.id || null, style: profile?.style || 'balanced' };
}
