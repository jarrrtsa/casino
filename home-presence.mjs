import { randomUUID } from 'node:crypto';
import { WORLD_LAYOUTS, DEFAULT_POSITION, FOOT_RADIUS, safePosition, isWalkable, moveFootpoint } from './public/world-layout.mjs';

export const PRESENCE_LIMITS = Object.freeze({ capacity: 6, speed: 430, maxCreditMs: 250 });
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;

// Reject straight segments entering open, inflated obstacle interiors; tangencies are allowed.
function crossesWall(from, to, environment) {
  return WORLD_LAYOUTS[environment].obstacles.some(rect => {
    let low = 0, high = 1;
    for (const [axis, min, max] of [['x', rect.x - FOOT_RADIUS, rect.x + rect.width + FOOT_RADIUS], ['y', rect.y - FOOT_RADIUS, rect.y + rect.height + FOOT_RADIUS]]) {
      const delta = to[axis] - from[axis];
      if (!delta) { if (from[axis] <= min || from[axis] >= max) return false; }
      else {
        const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
        low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b));
      }
    }
    return low < high;
  });
}

// One instance per server-owned lobby. getLobby is synchronous and never comes from the client.
export function createHomePresence({ lobbyId, getLobby, now = Date.now } = {}) {
  if (!validId(lobbyId) || typeof getLobby !== 'function' || typeof now !== 'function') throw new TypeError('A lobby ID and trusted callbacks are required.');
  const members = new Map();
  let environment = null, revision = 0, clock = -Infinity;
  function time() {
    const value = now();
    if (!Number.isFinite(value) || value < clock) fail(503, 'Presence clock must be finite and monotonic.');
    return value;
  }
  function sync() {
    const room = getLobby();
    if (room === null) {
      if (members.size) { members.clear(); revision++; }
      return false;
    }
    if (!room || room.code !== lobbyId || !Object.hasOwn(WORLD_LAYOUTS, room.environment)
      || !Array.isArray(room.players) || room.players.length > PRESENCE_LIMITS.capacity
      || room.players.some(player => !validId(player?.id))
      || new Set(room.players.map(player => player.id)).size !== room.players.length) fail(503, 'Invalid trusted home lobby snapshot.');
    if (environment !== null && environment !== room.environment) fail(409, 'A presence instance cannot change its home environment.');
    const timestamp = time(), ids = new Set(room.players.map(player => player.id));
    let changed = false;
    for (const id of members.keys()) if (!ids.has(id)) { members.delete(id); changed = true; }
    for (const id of ids) if (!members.has(id)) {
      members.set(id, { id, ...safePosition(DEFAULT_POSITION, room.environment), facing: 'right', seq: 0,
        generation: randomUUID(), revision: 0, credit: 0, at: timestamp });
      changed = true;
    }
    environment = room.environment; clock = timestamp;
    if (changed) {
      revision++;
      for (const member of members.values()) if (!member.revision) member.revision = revision;
    }
    return true;
  }
  function playerView(member) {
    const { id, x, y, facing, seq, generation, revision } = member;
    return { id, x, y, facing, seq, generation, revision };
  }
  function snapshot() {
    return { lobbyId, environment, revision, players: [...members.values()].map(playerView) };
  }
  function requireMember(id) {
    if (!validId(id) || !members.has(id)) fail(403, 'Join this home lobby first.');
    return members.get(id);
  }
  return {
    // Caller must already have authenticated id. Reads also prune departed members.
    view(id) { sync(); requireMember(id); return snapshot(); },
    reconcile() { sync(); return snapshot(); },
    move(id, message) {
      sync(); const member = requireMember(id);
      if (!message || typeof message !== 'object' || Array.isArray(message)
        || Object.keys(message).some(key => !['generation', 'seq', 'x', 'y', 'facing'].includes(key))
        || !Number.isSafeInteger(message.seq) || message.seq <= member.seq
        || message.generation !== member.generation
        || !Number.isFinite(message.x) || !Number.isFinite(message.y)
        || !['left', 'right'].includes(message.facing)) fail(400, 'Invalid or stale home movement.');
      if (!isWalkable(message, environment)) fail(400, 'Position is outside the walkable home.');
      const dx = message.x - member.x, dy = message.y - member.y;
      const swept = moveFootpoint(member, dx, dy, environment);
      if (swept.x !== message.x || swept.y !== message.y || crossesWall(member, message, environment)) fail(400, 'Movement crosses a home obstacle.');
      const timestamp = time();
      const credit = Math.min(PRESENCE_LIMITS.speed * PRESENCE_LIMITS.maxCreditMs / 1000,
        member.credit + PRESENCE_LIMITS.speed * (timestamp - member.at) / 1000);
      const distance = Math.hypot(dx, dy);
      if (distance > credit + 1e-9) fail(400, 'Home movement is too fast.');
      revision++;
      Object.assign(member, { x: message.x, y: message.y, facing: message.facing, seq: message.seq,
        revision, credit: Math.max(0, credit - distance), at: timestamp });
      clock = timestamp;
      return snapshot();
    }
  };
}
