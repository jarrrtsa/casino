import { WORLD_GEOMETRY, DEFAULT_POSITION, safePosition, moveFootpoint, interactionAt } from './world-layout.mjs';

export const WORLD = Object.freeze({ ...WORLD_GEOMETRY, viewport: 1920, speed: 430 });
export const HOME_ASSETS = Object.freeze({ bridge: 'level-0', rental: 'level-1' });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function initialPosition() { return { ...DEFAULT_POSITION }; }
export function movePosition(position, dx, dy, seconds, environment) {
  const length = Math.hypot(dx, dy);
  const distance = WORLD.speed * (Number.isFinite(seconds) ? clamp(seconds, 0, .05) : 0);
  if (!Number.isFinite(length) || !length) return safePosition(position, environment);
  return moveFootpoint(position, dx / length * distance, dy / length * distance, environment);
}
export function cameraFor(x, current = initialPosition().x - WORLD.viewport / 2, viewport = WORLD.viewport) {
  let camera = current;
  if (x < camera + viewport * .2) camera = x - viewport * .2;
  if (x > camera + viewport * .8) camera = x - viewport * .8;
  return clamp(camera, 0, WORLD.width - viewport);
}
export function layerLayout(camera, factor, anchor = initialPosition().x - WORLD.viewport / 2, viewport = WORLD.viewport) {
  return { width: WORLD.width, x: clamp(-camera + (camera - anchor) * (1 - factor), viewport - WORLD.width, 0) };
}

const FORM_FOCUS = 'input,textarea,select,form button,[contenteditable]:not([contenteditable="false"]),[role="textbox"]';
const MOVE_HINT = 'WASD / Arrow keys · Move';
const isLayered = value => Object.hasOwn(HOME_ASSETS, value);
export function createHomeWorld({ home, avatar, frame, layers, hint }) {
  let networkOrigin=null;
  const remotes=new Map();
  const hotspot=document.getElementById?.('home-poker-hotspot');
  if(hotspot)hotspot.onclick=()=>{if(canAct(hotspot)&&interactionAt(position,environment)==='poker')home.dispatchEvent(new CustomEvent('home-interact',{bubbles:true,detail:{target:'poker',environment}}));};
  let position = initialPosition(), environment = '', identity = null, active = false, last = 0, raf = 0;
  let scale = 1, camera = null, anchor = null, viewport = 1920, offsetY = 0, previousWidth = 0, previousHeight = 0;
  let focused = document.hasFocus?.() !== false, heldInteract = false;
  const keys = new Set(), planes = [...layers.querySelectorAll('[data-parallax]')];
  const controls = { KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const visible = () => !home.hidden && !home.classList.contains('hidden') && document.body.dataset.screen === 'home' && home.clientWidth > 0 && home.clientHeight > 0;
  const formFocus = target => Boolean(target?.closest?.(FORM_FOCUS));
  const blocked = () => !focused || document.hidden || !visible() || Boolean(document.querySelector('dialog[open]')) || formFocus(document.activeElement);
  const canAct = target => active && Boolean(identity && isLayered(environment)) && !blocked() && !formFocus(target);
  function updateHint() {
    const enabled = canAct(), target = enabled ? interactionAt(position, environment) : null;
    const text = target ? `${MOVE_HINT} · E · ${target === 'poker' ? 'Poker table' : 'Computer'}` : MOVE_HINT;
    if (hint.textContent !== text) hint.textContent = text;
    hint.dataset.target = target || '';
    hint.classList.toggle('hidden', !active || !identity || !visible() || !isLayered(environment));
  }
  hint.setAttribute('role', 'status');
  hint.setAttribute('aria-live', 'polite');
  function draw() {
    if (!isLayered(environment)) { updateHint(); return; }
    camera = cameraFor(position.x, camera ?? position.x - viewport / 2, viewport); anchor ??= camera;
    const reduced = document.body.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const plane of planes) {
      const layout = layerLayout(camera, reduced ? 1 : Number(plane.dataset.parallax), anchor, viewport);
      plane.style.width = `${layout.width * scale}px`; plane.style.height = `${WORLD.height * scale}px`; plane.style.transform = `translate(${layout.x * scale}px,${offsetY}px)`;
    }
    avatar.style.left = `${(position.x - camera) * scale}px`; avatar.style.top = `${position.y * scale + offsetY}px`;
    frame.dataset.x = String(position.x); frame.dataset.y = String(position.y); frame.dataset.camera = String(camera);
    if(hotspot){const rect=environment==='rental'?{x:760,y:730,width:650,height:220}:{x:860,y:640,width:500,height:250};hotspot.style.left=`${(rect.x-camera)*scale}px`;hotspot.style.top=`${rect.y*scale+offsetY}px`;hotspot.style.width=`${rect.width*scale}px`;hotspot.style.height=`${rect.height*scale}px`;hotspot.disabled=!canAct()||interactionAt(position,environment)!=='poker';}
    for(const remote of remotes.values()){
      remote.node.style.left=`${(remote.pose.x-camera)*scale}px`;remote.node.style.top=`${remote.pose.y*scale+offsetY}px`;
      remote.node.style.setProperty('--world-avatar-height',avatar.style.getPropertyValue('--world-avatar-height'));
    }
    updateHint();
  }
  function resize() {
    const width = home.clientWidth, height = home.clientHeight;
    if (!width || !height) { updateHint(); return; }
    scale = Math.max(width / WORLD.viewport, height / WORLD.height); viewport = width / scale; offsetY = (height - WORLD.height * scale) / 2;
    if (width !== previousWidth || height !== previousHeight) { camera = clamp(position.x - viewport / 2, 0, WORLD.width - viewport); anchor = camera; }
    previousWidth = width; previousHeight = height;
    frame.style.width = `${width}px`; frame.style.height = `${height}px`;
    avatar.style.setProperty('--world-avatar-height', `${250 * scale}px`); draw();
  }
  function clear() { keys.clear(); heldInteract = false; last = 0; avatar.classList.remove('walking'); }
  function tick(time) {
    if (!active) return;
    const dt = last ? (time - last) / 1000 : 0; last = time;
    if (blocked()) clear();
    let dx = 0, dy = 0;
    for (const key of keys) { dx += controls[key][0]; dy += controls[key][1]; }
    dx = Math.sign(dx); dy = Math.sign(dy);
    const previous = position;
    if (dx || dy) { position = movePosition(position, dx, dy, dt, environment); if (dx) avatar.dataset.facing = dx < 0 ? 'left' : 'right'; }
    if(networkOrigin){const distance=Math.hypot(position.x-networkOrigin.x,position.y-networkOrigin.y);if(distance>85)position=moveFootpoint(networkOrigin,(position.x-networkOrigin.x)*85/distance,(position.y-networkOrigin.y)*85/distance,environment);}
    avatar.classList.toggle('walking', position.x !== previous.x || position.y !== previous.y);
    draw(); raf = requestAnimationFrame(tick);
  }
  function activate(value) {
    active = Boolean(value && isLayered(environment) && identity); clear(); cancelAnimationFrame(raf);
    updateHint(); if (active) raf = requestAnimationFrame(tick);
  }
  document.addEventListener('keydown', event => {
    if (event.code !== 'KeyE' && !controls[event.code]) return;
    const modified = event.ctrlKey || event.metaKey || event.altKey;
    if (event.code === 'KeyE') {
      const held = heldInteract; heldInteract = true;
      if (held || event.repeat || modified || !canAct(event.target)) return;
      const target = interactionAt(position, environment);
      if (target) { event.preventDefault(); home.dispatchEvent(new CustomEvent('home-interact', { bubbles: true, detail: { target, environment } })); }
      return;
    }
    if (modified || !canAct(event.target)) { clear(); updateHint(); return; }
    if (event.repeat && !keys.has(event.code)) return;
    event.preventDefault(); keys.add(event.code);
  });
  document.addEventListener('keyup', event => { keys.delete(event.code); if (event.code === 'KeyE') heldInteract = false; });
  window.addEventListener('blur', () => { focused = false; clear(); updateHint(); });
  window.addEventListener('focus', () => { focused = true; clear(); updateHint(); });
  document.addEventListener('visibilitychange', () => { clear(); updateHint(); });
  new ResizeObserver(resize).observe(home);
  return {
    pose(){return {...position,facing:avatar.dataset.facing||'right'};},
    clearPresence(){networkOrigin=null;for(const remote of remotes.values())remote.node.remove();remotes.clear();},
    syncPresence(snapshot,roster){
      const own=snapshot.players.find(p=>p.id===identity);if(own){position=safePosition(own,environment);networkOrigin={...position};avatar.dataset.facing=own.facing;}
      const ids=new Set(snapshot.players.filter(p=>p.id!==identity).map(p=>p.id));
      for(const [id,remote] of remotes)if(!ids.has(id)){remote.node.remove();remotes.delete(id);}
      for(const pose of snapshot.players){
        if(pose.id===identity)continue;const member=roster.find(p=>p.id===pose.id);if(!member)continue;
        let remote=remotes.get(pose.id);
        if(!remote){const node=avatar.cloneNode(true);node.classList.add('remote-character');node.dataset.characterId=pose.id;node.querySelector('svg').removeAttribute('id');node.querySelector('span').removeAttribute('id');frame.append(node);remote={node};remotes.set(pose.id,remote);}
        remote.pose=pose;remote.node.querySelector('span').textContent=member.name;
        remote.node.querySelector('use').setAttribute('href',`/assets/characters.svg#${['hoodie','cap','beanie','coat'].includes(member.appearance.outfit)?member.appearance.outfit:'hoodie'}`);
        remote.node.querySelector('svg').style.color=({blue:'#5c7e96',amber:'#b59778',plum:'#987d96',sage:'#829c91'})[member.appearance.color]||'#5c7e96';
      }
      draw();
    },
    setEnvironment(value, id) {
      const changed = value !== environment || id !== identity; environment = value; identity = id;
      const layered = isLayered(value); home.classList.toggle('layered-world', layered); frame.classList.toggle('hidden', !layered);
      if (layered) for (const plane of planes) {
        const name = plane.dataset.plane === 'far' ? 'background-far' : plane.dataset.plane === 'close' ? 'background-close' : plane.dataset.plane;
        const src = `/assets/${HOME_ASSETS[value]}/${name}.png`; if (plane.getAttribute('src') !== src) plane.src = src;
      }
      if (layered && avatar.parentElement !== frame) frame.append(avatar);
      if (!layered && avatar.parentElement !== home) { home.append(avatar); avatar.style.removeProperty('left'); avatar.style.removeProperty('top'); }
      if (changed) { position = safePosition(initialPosition(), environment); camera = null; anchor = null; activate(document.body.dataset.screen === 'home'); }
      resize();
    },
    setActive: activate
  };
}
