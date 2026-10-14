export const WORLD = Object.freeze({ width:3840, height:1080, viewport:1920, speed:430,
  bounds:Object.freeze({left:384,right:3456,top:648,bottom:972}) });
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function initialPosition(){return {x:2688,y:842.4};}
export function movePosition(position,dx,dy,seconds){
  const length=Math.hypot(dx,dy)||1, distance=WORLD.speed*clamp(seconds,0,.05);
  return {x:clamp(position.x+dx/length*distance,WORLD.bounds.left,WORLD.bounds.right),
    y:clamp(position.y+dy/length*distance,WORLD.bounds.top,WORLD.bounds.bottom)};
}
export const cameraFor=x=>clamp(x-WORLD.viewport/2,0,WORLD.width-WORLD.viewport);
export function layerLayout(camera,factor){
  const travel=WORLD.width-WORLD.viewport;
  const width=WORLD.width+Math.max(0,factor-1)*travel;
  return {width,x:-(width-WORLD.viewport)/2-(camera-travel/2)*factor};
}

export function createHomeWorld({home,avatar,frame,layers,hint}){
  let position=initialPosition(),environment='',identity=null,active=false,last=0,raf=0,scale=1;
  const keys=new Set(),planes=[...layers.querySelectorAll('[data-parallax]')];
  const controls={KeyA:[-1,0],KeyD:[1,0],KeyW:[0,-1],KeyS:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const blocked=()=>document.hidden||Boolean(document.querySelector('dialog[open]'));
  function draw(){
    if(environment!=='bridge')return;
    const camera=cameraFor(position.x),reduced=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const plane of planes){const layout=layerLayout(camera,reduced?1:Number(plane.dataset.parallax));plane.style.width=`${layout.width*scale}px`;plane.style.transform=`translateX(${layout.x*scale}px)`;}
    avatar.style.left=`${(position.x-camera)*scale}px`;avatar.style.top=`${position.y*scale}px`;
    frame.dataset.x=String(position.x);frame.dataset.y=String(position.y);frame.dataset.camera=String(camera);
  }
  function resize(){
    const width=Math.min(home.clientWidth,home.clientHeight*16/9),height=width*9/16;
    scale=width/WORLD.viewport;frame.style.width=`${width}px`;frame.style.height=`${height}px`;
    // Character height is in scene coordinates; feet stay anchored to the bounds.
    avatar.style.setProperty('--world-avatar-height',`${250*scale}px`);draw();
  }
  function clear(){keys.clear();last=0;}
  function tick(time){
    if(!active)return;
    const dt=last?(time-last)/1000:0;last=time;
    if(blocked())keys.clear();
    let dx=0,dy=0;for(const key of keys){dx+=controls[key][0];dy+=controls[key][1];}
    if(dx||dy){position=movePosition(position,dx,dy,dt);if(dx)avatar.dataset.facing=dx<0?'left':'right';}
    avatar.classList.toggle('walking',Boolean(dx||dy));draw();raf=requestAnimationFrame(tick);
  }
  function activate(value){
    active=Boolean(value&&environment==='bridge'&&identity);clear();cancelAnimationFrame(raf);avatar.classList.remove('walking');
    if(active)raf=requestAnimationFrame(tick);
  }
  document.addEventListener('keydown',event=>{
    if(!active||!controls[event.code]||event.ctrlKey||event.metaKey||event.altKey||blocked()||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    event.preventDefault();keys.add(event.code);
  });
  document.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  new ResizeObserver(resize).observe(home);
  return {
    setEnvironment(value,id){
      const changed=value!==environment||id!==identity;environment=value;identity=id;
      const bridge=value==='bridge';home.classList.toggle('bridge-world',bridge);frame.classList.toggle('hidden',!bridge);
      document.getElementById('home-menu-toggle').classList.toggle('hidden',!bridge);
      hint.classList.toggle('hidden',!bridge||!identity);
      if(bridge&&avatar.parentElement!==frame)frame.append(avatar);
      if(!bridge&&avatar.parentElement!==home){home.append(avatar);avatar.style.removeProperty('left');avatar.style.removeProperty('top');}
      if(changed){position=initialPosition();activate(document.body.dataset.screen==='home');}
      resize();
    },
    setActive:activate
  };
}
