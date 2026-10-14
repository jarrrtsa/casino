// World-image coordinates. Only the feet are constrained; sprite silhouettes are not walls.
export const WORLD_GEOMETRY = Object.freeze({
  width: 3840, height: 1080,
  bounds: Object.freeze({ left: 384, right: 3456, top: 648, bottom: 972 })
});
export const DEFAULT_POSITION = Object.freeze({ x: 2688, y: 842.4 });
export const FOOT_RADIUS = 12; // Half-width of a small square footprint, not the whole character.
const rectangle = (id, x, y, width, height) => Object.freeze({ id, x, y, width, height });
const approach = (target, x, y, radius) => Object.freeze({ target, x, y, radius });
const layout = (obstacles, interactions) => Object.freeze({
  obstacles: Object.freeze(obstacles), interactions: Object.freeze(interactions)
});

// Conservative, provisional floor footprints traced against the approved 3840x1080 focus layers.
export const WORLD_LAYOUTS = Object.freeze({
  bridge: layout([
    rectangle('left-storage', 384, 760, 55, 62),
    rectangle('computer-crate', 460, 716, 160, 80),
    rectangle('poker-chair', 750, 772, 125, 90),
    rectangle('poker-table', 920, 765, 365, 110),
    rectangle('poker-stool', 1275, 783, 70, 65),
    rectangle('tent-crates', 1940, 720, 180, 65),
    rectangle('tent-base', 2040, 720, 535, 82),
    rectangle('fire-barrel', 2595, 737, 100, 79),
    rectangle('firewood', 2730, 790, 105, 40)
  ], [approach('poker', 1100, 925, 110), approach('computer', 550, 850, 90)]),
  rental: layout([
    rectangle('kitchen-base', 384, 838, 20, 134),
    rectangle('fridge', 422, 760, 175, 85),
    rectangle('computer-cabinet', 1010, 686, 325, 43),
    rectangle('poker-table', 795, 819, 405, 110),
    rectangle('left-chair', 545, 864, 180, 100),
    rectangle('right-chair', 1150, 875, 220, 97),
    rectangle('left-box', 690, 945, 165, 27),
    rectangle('right-box', 1380, 887, 165, 85)
  ], [approach('poker', 1370, 800, 110), approach('computer', 1180, 774, 105)])
});
const EMPTY = layout([], []);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const getLayout = environment => typeof environment === 'string' && Object.hasOwn(WORLD_LAYOUTS, environment) ? WORLD_LAYOUTS[environment] : EMPTY;
const boxes = environment => getLayout(environment).obstacles.map(rect => ({
  left: rect.x - FOOT_RADIUS, right: rect.x + rect.width + FOOT_RADIUS,
  top: rect.y - FOOT_RADIUS, bottom: rect.y + rect.height + FOOT_RADIUS
}));
const inside = (position, box) => position.x > box.left && position.x < box.right && position.y > box.top && position.y < box.bottom;

export function isWalkable(position, environment) {
  const b = WORLD_GEOMETRY.bounds;
  return Boolean(position && Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= b.left && position.x <= b.right && position.y >= b.top && position.y <= b.bottom
    && !boxes(environment).some(box => inside(position, box)));
}

export function safePosition(position = DEFAULT_POSITION, environment) {
  const b = WORLD_GEOMETRY.bounds;
  const start = { x: clamp(finite(position?.x, DEFAULT_POSITION.x), b.left, b.right),
    y: clamp(finite(position?.y, DEFAULT_POSITION.y), b.top, b.bottom) };
  if (isWalkable(start, environment)) return start;
  // Project to the closest free face/corner, including overlaps and world borders.
  const walls = boxes(environment);
  const xs = [start.x, b.left, b.right, ...walls.flatMap(wall => [clamp(wall.left, b.left, b.right), clamp(wall.right, b.left, b.right)])];
  const ys = [start.y, b.top, b.bottom, ...walls.flatMap(wall => [clamp(wall.top, b.top, b.bottom), clamp(wall.bottom, b.top, b.bottom)])];
  let closest = null, distance = Infinity;
  for (const x of xs) for (const y of ys) {
    const candidate = { x, y }, squared = (x - start.x) ** 2 + (y - start.y) ** 2;
    if (squared < distance && isWalkable(candidate, environment)) { closest = candidate; distance = squared; }
  }
  if (!closest) throw new Error('World layout has no walkable position.');
  return closest;
}

/** Swept axis movement stops at the first face, then slides along the other axis. */
export function moveFootpoint(position, dx, dy, environment) {
  const start = safePosition(position, environment), b = WORLD_GEOMETRY.bounds, walls = boxes(environment);
  dx = finite(dx, 0); dy = finite(dy, 0);
  let x = clamp(start.x + dx, b.left, b.right);
  for (const wall of walls) if (start.y > wall.top && start.y < wall.bottom) {
    if (dx > 0 && start.x <= wall.left && x > wall.left) x = Math.min(x, wall.left);
    if (dx < 0 && start.x >= wall.right && x < wall.right) x = Math.max(x, wall.right);
  }
  let y = clamp(start.y + dy, b.top, b.bottom);
  for (const wall of walls) if (x > wall.left && x < wall.right) {
    if (dy > 0 && start.y <= wall.top && y > wall.top) y = Math.min(y, wall.top);
    if (dy < 0 && start.y >= wall.bottom && y < wall.bottom) y = Math.max(y, wall.bottom);
  }
  return { x, y };
}

export function interactionAt(position, environment) {
  if (!isWalkable(position, environment)) return null;
  let closest = null, distance = Infinity;
  for (const area of getLayout(environment).interactions) {
    const squared = (position.x - area.x) ** 2 + (position.y - area.y) ** 2;
    if (squared <= area.radius ** 2 && squared < distance) { closest = area.target; distance = squared; }
  }
  return closest;
}
