export const WORLD = Object.freeze({ width:3840, height:1080, viewport:1920, speed:430,
  bounds:Object.freeze({left:384,right:3456,top:648,bottom:972}) });
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function initialPosition(){return {x:2688,y:842.4};}
export function movePosition(position,dx,dy,seconds){
  const length=Math.hypot(dx,dy)||1, distance=WORLD.speed*clamp(seconds,0,.05);
  return {x:clamp(position.x+dx/length*distance,WORLD.bounds.left,WORLD.bounds.right),
    y:clamp(position.y+dy/length*distance,WORLD.bounds.top,WORLD.bounds.bottom)};
}
export function cameraFor(x,current=initialPosition().x-WORLD.viewport/2,viewport=WORLD.viewport){
  let camera=current;
  if(x<camera+viewport*.2)camera=x-viewport*.2;
  if(x>camera+viewport*.8)camera=x-viewport*.8;
  return clamp(camera,0,WORLD.width-viewport);
}
export function layerLayout(camera,factor,anchor=initialPosition().x-WORLD.viewport/2,viewport=WORLD.viewport){
  return {width:WORLD.width,x:clamp(-camera+(camera-anchor)*(1-factor),viewport-WORLD.width,0)};
}

export function createHomeWorld({home,avatar,frame,layers,hint}){
  let position=initialPosition(),environment='',identity=null,active=false,last=0,raf=0,scale=1,camera=null,anchor=null,viewport=1920,offsetY=0,previousWidth=0,previousHeight=0;
  const keys=new Set(),planes=[...layers.querySelectorAll('[data-parallax]')];
  const controls={KeyA:[-1,0],KeyD:[1,0],KeyW:[0,-1],KeyS:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const blocked=()=>document.hidden||Boolean(document.querySelector('dialog[open]'));
  function draw(){
    if(environment!=='bridge')return;
    camera=cameraFor(position.x,camera??position.x-viewport/2,viewport);anchor??=camera;
    const reduced=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const plane of planes){const layout=layerLayout(camera,reduced?1:Number(plane.dataset.parallax),anchor,viewport);plane.style.width=`${layout.width*scale}px`;plane.style.height=`${WORLD.height*scale}px`;plane.style.transform=`translate(${layout.x*scale}px,${offsetY}px)`;}
    avatar.style.left=`${(position.x-camera)*scale}px`;avatar.style.top=`${position.y*scale+offsetY}px`;
    frame.dataset.x=String(position.x);frame.dataset.y=String(position.y);frame.dataset.camera=String(camera);
  }
  function resize(){
    const width=home.clientWidth,height=home.clientHeight;
    scale=Math.max(width/WORLD.viewport,height/WORLD.height);viewport=width/scale;offsetY=(height-WORLD.height*scale)/2;
    if(width!==previousWidth||height!==previousHeight){camera=clamp(position.x-viewport/2,0,WORLD.width-viewport);anchor=camera;}
    previousWidth=width;previousHeight=height;
    frame.style.width=`${width}px`;frame.style.height=`${height}px`;
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
      hint.classList.toggle('hidden',!bridge||!identity);
      if(bridge&&avatar.parentElement!==frame)frame.append(avatar);
      if(!bridge&&avatar.parentElement!==home){home.append(avatar);avatar.style.removeProperty('left');avatar.style.removeProperty('top');}
      if(changed){position=initialPosition();camera=null;anchor=null;activate(document.body.dataset.screen==='home');}
      resize();
    },
    setActive:activate
  };
}
