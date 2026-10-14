import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, initialPosition, movePosition, cameraFor, layerLayout, createHomeWorld } from '../public/home-world.mjs';
import { createServer } from '../server.mjs';

test('world movement keeps feet inside the requested world-image rectangle',()=>{
  let position=initialPosition();
  for(let i=0;i<1000;i++)position=movePosition(position,-1,-1,.05);
  assert.deepEqual(position,{x:WORLD.width*.1,y:WORLD.height*.6});
  for(let i=0;i<1000;i++)position=movePosition(position,1,1,.05);
  assert.deepEqual(position,{x:WORLD.width*.9,y:WORLD.height*.9});
  const start=initialPosition(),straight=movePosition(start,1,0,.05),diagonal=movePosition(start,1,1,.05);
  assert.ok(Math.abs(Math.hypot(diagonal.x-start.x,diagonal.y-start.y)-(straight.x-start.x))<1e-9);
  assert.deepEqual(movePosition(start,1,1,20),diagonal);
  assert.deepEqual(movePosition(start,1,1,-1),start);
});

test('only horizontal movement changes the camera; every layer covers both camera extremes',()=>{
  const start=initialPosition(),up=movePosition(start,0,-1,.05);
  assert.equal(cameraFor(up.x),cameraFor(start.x));
  assert.equal(cameraFor(WORLD.bounds.left),0);
  assert.equal(cameraFor(WORLD.bounds.right),WORLD.width-WORLD.viewport);
  for(const factor of [.92,.98,1,1.03])for(const camera of [0,960,1920]){
    const layout=layerLayout(camera,factor);
    assert.ok(layout.x<=0);assert.ok(layout.x+layout.width>=WORLD.viewport);
  }
  const farA=layerLayout(1000,.92),farB=layerLayout(1100,.92),focusA=layerLayout(1000,1),focusB=layerLayout(1100,1);
  assert.ok(Math.abs(farB.x-farA.x+92)<1e-9);assert.equal(focusB.x-focusA.x,-100);
});

test('world module, styles and all five PNGs are served through the game server',async()=>{
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    for(const file of ['home-world.mjs','home-world.css']){
      const response=await fetch(`${base}/${file}`);assert.equal(response.status,200);assert.ok((await response.text()).length>0);
    }
    for(const level of [0,1])for(const name of ['background-far','background-close','focus','foreground','poker']){
      const response=await fetch(`${base}/assets/level-${level}/${name}.png`);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\/png/);
      const bytes=new Uint8Array(await response.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
      const header=new DataView(bytes.buffer);assert.equal(header.getUint32(16),name==='poker'?1920:3840);assert.equal(header.getUint32(20),1080);
      if(name!=='poker')assert.equal(bytes[25],6,'RGBA layer must retain its alpha channel');
    }
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('camera waits inside its dead zone and layers share the original size and anchor',()=>{
  assert.equal(cameraFor(2500,1728),1728);
  assert.equal(cameraFor(2200,1728),1728);
  assert.equal(cameraFor(2000,1728),1616);
  for(const factor of [.92,.98,1,1.03])assert.deepEqual(layerLayout(1728,factor),{width:3840,x:-1728});
});


function worldFixture(t, environment='rental') {
  class Hub {
    constructor(){this.listeners={};}
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
    emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}
  }
  class Element extends Hub {
    constructor(){super();this.dataset={};this.style={setProperty(name,value){this[name]=value;},removeProperty(name){delete this[name];}};this.hidden=false;this.form=false;const classes=new Set();this.classList={contains:v=>classes.has(v),add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>{const show=on??!classes.has(v);show?classes.add(v):classes.delete(v);return show;}};}
    closest(){return this.form?this:null;}
    setAttribute(key,value){this[key]=value;}
    getAttribute(key){return this[key]??null;}
    append(child){child.parentElement=this;}
    dispatchEvent(event){this.emit(event.type,event);if(event.bubbles)document.emit(event.type,event);return true;}
  }
  const body=new Element();body.dataset.screen='home';
  const home=new Element();home.clientWidth=1920;home.clientHeight=1080;
  const avatar=new Element(),frame=new Element(),hint=new Element(),input=new Element();input.form=true;
  const planes=['far','close','focus','foreground'].map((name,index)=>{const p=new Element();p.dataset.plane=name;p.dataset.parallax=String([.92,.98,1,1.03][index]);return p;});
  const doc=new Hub();Object.assign(doc,{body,activeElement:body,hidden:false,hasFocus:()=>true,querySelector:()=>doc.dialogOpen?{}:null});
  const win=new Hub(),queue=new Map();let serial=0,time=1000,observer;
  const replacements={document:doc,window:win,matchMedia:()=>({matches:false}),ResizeObserver:class{constructor(fn){observer=fn;}observe(){observer();}},requestAnimationFrame:fn=>{queue.set(++serial,fn);return serial;},cancelAnimationFrame:id=>queue.delete(id),fetch:()=>{throw new Error('World interaction must not call the backend');}};
  const previous=new Map(Object.keys(replacements).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value]of Object.entries(replacements))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.after(()=>{for(const [key,descriptor]of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
  const events=[];doc.addEventListener('home-interact',event=>events.push({detail:event.detail,bubbles:event.bubbles}));
  const controller=createHomeWorld({home,avatar,frame,layers:{querySelectorAll:()=>planes},hint});controller.setEnvironment(environment,'test-character');
  const step=(count=1,ms=50)=>{for(let i=0;i<count;i++){time+=ms;const entry=queue.entries().next().value;if(entry){queue.delete(entry[0]);entry[1](time);}}};
  const key=(code,options={})=>doc.emit('keydown',{code,target:home,repeat:false,preventDefault(){},...options});
  const up=code=>doc.emit('keyup',{code});
  const hold=(code,count)=>{key(code);step(count);up(code);};
  const position=()=>({x:Number(frame.dataset.x),y:Number(frame.dataset.y)});
  step();
  return {controller,doc,win,home,avatar,frame,hint,input,body,planes,events,step,key,up,hold,position,resize:(width,height)=>{home.clientWidth=width;home.clientHeight=height;observer();}};
}
const reachPoker=(fixture,environment)=>{
  if(environment==='bridge'){fixture.hold('KeyS',4);fixture.hold('KeyA',74);}
  else{fixture.hold('KeyW',4);fixture.hold('KeyA',61);}
  assert.equal(fixture.hint.dataset.target,'poker');
};

test('world E emits only the exact local event, once per press, for both environments and targets',t=>{
  const f=worldFixture(t,'bridge');f.key('KeyE');f.up('KeyE');assert.equal(f.events.length,0);reachPoker(f,'bridge');
  f.key('KeyE');assert.deepEqual(f.events,[{detail:{target:'poker',environment:'bridge'},bubbles:true}]);
  for(let i=0;i<5;i++)f.key('KeyE',{repeat:true});f.key('KeyE');assert.equal(f.events.length,1);
  f.up('KeyE');f.key('KeyE');f.up('KeyE');assert.equal(f.events.length,2);
  f.controller.setEnvironment('rental','other-character');f.step();reachPoker(f,'rental');
  f.key('KeyE');f.up('KeyE');assert.deepEqual(f.events.at(-1).detail,{target:'poker',environment:'rental'});
  f.hold('KeyA',9);assert.equal(f.hint.dataset.target,'computer');assert.match(f.hint.textContent,/E · Computer/);
  f.key('KeyE');f.up('KeyE');assert.deepEqual(f.events.at(-1).detail,{target:'computer',environment:'rental'});
  f.controller.setEnvironment('bridge','third-character');f.step();f.hold('KeyS',4);f.hold('KeyA',99);f.hold('KeyW',4);
  assert.equal(f.hint.dataset.target,'computer');f.key('KeyE');assert.deepEqual(f.events.at(-1).detail,{target:'computer',environment:'bridge'});
});

test('dialogs, hidden home, form focus and focus loss block E and clear held movement',t=>{
  const f=worldFixture(t);
  const conditions=[
    [()=>f.doc.dialogOpen=true,()=>f.doc.dialogOpen=false],
    [()=>f.home.hidden=true,()=>f.home.hidden=false],
    [()=>f.home.classList.add('hidden'),()=>f.home.classList.remove('hidden')],
    [()=>f.body.dataset.screen='table',()=>f.body.dataset.screen='home'],
    [()=>f.doc.hidden=true,()=>f.doc.hidden=false],
    [()=>f.doc.activeElement=f.input,()=>f.doc.activeElement=f.body],
    [()=>f.win.emit('blur'),()=>f.win.emit('focus')]
  ];
  for(let i=0;i<conditions.length;i++){
    f.controller.setEnvironment('rental',`character-${i}`);f.step();reachPoker(f,'rental');const start=f.position(),events=f.events.length;
    f.key('KeyS');conditions[i][0]();f.step(2);f.key('KeyE');f.up('KeyE');
    assert.deepEqual(f.position(),start);assert.equal(f.events.length,events);assert.equal(f.hint.dataset.target,'');assert.equal(f.avatar.classList.contains('walking'),false);
    conditions[i][1]();f.step(2);f.key('KeyS',{repeat:true});f.step(2);assert.deepEqual(f.position(),start,'old autorepeat must not restart movement');
    f.up('KeyS');f.key('KeyW');f.step();f.up('KeyW');assert.ok(f.position().y<start.y,'a fresh press works after unblocking');
  }
});

test('event-target form focus, shortcut modifiers, anonymous and unsupported homes cannot interact',t=>{
  const f=worldFixture(t);reachPoker(f,'rental');const before=f.position();
  for(const options of [{target:f.input},{ctrlKey:true},{altKey:true},{metaKey:true}]){
    f.key('KeyE',options);f.up('KeyE');f.key('KeyW',options);f.step();f.up('KeyW');
  }
  assert.deepEqual(f.position(),before);assert.equal(f.events.length,0);
  for(const environment of ['rental','loft','toString']){
    f.controller.setEnvironment(environment,environment==='rental'?null:'test-character');f.controller.setActive(true);f.key('KeyE');f.up('KeyE');f.step();assert.equal(f.events.length,0);assert.equal(f.hint.classList.contains('hidden'),true);
  }
});

test('controller normalizes aliases and diagonals, limits long frames and keeps vertical parallax fixed',t=>{
  const f=worldFixture(t),start=f.position(),transforms=f.planes.map(p=>p.style.transform);
  f.key('KeyW');f.key('ArrowUp');f.key('KeyA');f.step();f.up('KeyW');f.up('ArrowUp');f.up('KeyA');
  assert.ok(Math.abs(Math.hypot(f.position().x-start.x,f.position().y-start.y)-WORLD.speed*.05)<1e-8);
  f.controller.setEnvironment('rental','second');f.step();const camera=f.frame.dataset.camera,previous=f.planes.map(p=>p.style.transform),y=f.position().y;
  f.hold('KeyW',2);assert.equal(f.frame.dataset.camera,camera);assert.deepEqual(f.planes.map(p=>p.style.transform),previous);assert.ok(f.position().y<y);
  const x=f.position().x;f.key('KeyD');f.step(1,100000);f.up('KeyD');assert.ok(f.position().x-x<=WORLD.speed*.05+1e-8);
  assert.equal(transforms.length,4);
});

test('zero-sized hidden home and reactivation preserve finite camera and stop old input',t=>{
  const f=worldFixture(t),start=f.position();f.key('KeyD');f.resize(0,0);f.step(2);f.key('KeyE');f.up('KeyE');
  assert.deepEqual(f.position(),start);assert.ok(Number.isFinite(Number(f.frame.dataset.camera)));assert.equal(f.events.length,0);
  f.resize(1920,1080);f.step(2);assert.deepEqual(f.position(),start);
  f.controller.setActive(false);f.key('KeyD');f.step(3);assert.deepEqual(f.position(),start);
  f.controller.setActive(true);f.step(2);assert.deepEqual(f.position(),start);f.hold('KeyD',1);assert.ok(f.position().x>start.x);
});
