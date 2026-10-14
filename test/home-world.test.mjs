import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, initialPosition, movePosition, cameraFor, layerLayout } from '../public/home-world.mjs';
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

